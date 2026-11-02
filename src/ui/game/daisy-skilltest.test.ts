import { describe, expect, it } from "vitest";
import { createCard, moveCard } from "../../engine/movement";
import { inv } from "../../engine/context";
import type { Result } from "../../engine";
import { canCommit, testValue } from "../../engine/rules/skillTest";
import {
  gOf,
  giveCard,
  mutate,
  options,
  pick,
  putEnemy,
  skipMulligans,
  start,
} from "../../engine/kits/testkit";
import { optionHome } from "./optionHome";
import { cardRecIn, invStateIn } from "../../engine/world/store";
import { ZONE } from "../../engine/world/constants";

describe("fast cards and abilities in the skill test commit window", () => {
  const DAISY = "01002";
  const ROLAND = "01001";
  const table = () => {
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 3, { chaosBag: ["0"] as never }));
    while (r.state.pending?.inv !== DAISY || r.state.pending.kind !== "turn")
      r = pick(r, r.state.pending!.options.at(-1)!.label);
    return r;
  };
  const inPlay = (r: Result, code: string) =>
    mutate(r, (game) => {
      const a = createCard(game, code, ZONE.Limbo, DAISY);
      moveCard(game, a, ZONE.Play);
      cardRecIn(game.s, a).controller = DAISY;
      if (game.db.cards[code].uses) cardRecIn(game.s, a).uses = game.db.cards[code].uses!.count;
    });
  const tv = (r: Result) => testValue(gOf(r), r.state.skillTest!);

  it("Forbidden Knowledge's fast ability is offered, paid, and the window comes back", () => {
    let r = pick(inPlay(table(), "01058"), /^Investigate/);
    expect(r.state.pending?.kind).toBe("commit");
    const o = r.state.pending!.options.find((x) => /Forbidden Knowledge/.test(x.label))!;
    expect(optionHome(o, r.state, DAISY)).toBe("board");
    const { resources, horror } = invStateIn(r.state, DAISY);
    r = pick(r, o.id);
    expect(r.state.pending?.kind).toBe("commit");
    expect(invStateIn(r.state, DAISY).resources).toBe(resources + 1);
    expect(invStateIn(r.state, DAISY).horror).toBe(horror + 1);
    expect(options(r).some((l) => /Forbidden Knowledge/.test(l))).toBe(false);
  });

  it("Arcane Initiate's fast ability is offered in the window", () => {
    const r = pick(inPlay(table(), "01063"), /^Investigate/);
    expect(options(r).some((l) => /Arcane Initiate/.test(l))).toBe(true);
  });

  it("Magnifying Glass played mid-investigate: paid, boosts this test, can't also be committed", () => {
    let r = table();
    let glass = "";
    r = mutate(r, (game) => {
      glass = giveCard(game, DAISY, "01030");
      invStateIn(game.s, DAISY).resources = 3;
    });
    r = pick(r, /^Investigate/);
    const play = r.state.pending!.options.find((o) => o.id === `play:${glass}`)!;
    expect(play.label).toBe("Play Magnifying Glass (fast)");
    expect(optionHome(play, r.state, DAISY)).toBe("hand");
    const before = tv(r);
    r = pick(r, play.id);
    expect(r.state.pending?.kind).toBe("commit");
    expect(cardRecIn(r.state, glass).zone).toBe("play");
    expect(invStateIn(r.state, DAISY).resources).toBe(2);
    expect(tv(r)).toBe(before + 1);
    expect(r.state.pending!.options.some((o) => o.card === glass)).toBe(false);
  });

  it("Mind over Matter played mid-fight: intellect value, intellect icons count, combat icons don't", () => {
    let r = table();
    let mom = "";
    let deduction = "";
    let blow = "";
    r = mutate(r, (game) => {
      mom = giveCard(game, DAISY, "01036");
      deduction = giveCard(game, DAISY, "01039"); // intellect icon
      blow = giveCard(game, DAISY, "01025"); // combat icon
      putEnemy(game, "01160", inv(game, DAISY).location!, DAISY);
    });
    r = pick(r, /^Fight/);
    expect(tv(r)).toBe(2);
    expect(canCommit(gOf(r), DAISY, blow, r.state.skillTest!)).toBe(true);
    expect(canCommit(gOf(r), DAISY, deduction, r.state.skillTest!)).toBe(false);
    r = pick(r, `play:${mom}`);
    expect(r.state.pending?.kind).toBe("commit");
    expect(r.state.skillTest?.kind).toBe("fight");
    expect(tv(r)).toBe(5);
    expect(canCommit(gOf(r), DAISY, deduction, r.state.skillTest!)).toBe(true);
    // either skill may end up tested, so combat icons still commit, but never lower the value
    expect(canCommit(gOf(r), DAISY, blow, r.state.skillTest!)).toBe(true);
    r = pick(r, deduction);
    expect(tv(r)).toBe(6);
    r = pick(r, blow);
    expect(tv(r)).toBe(6);
  });

  it("Mind over Matter played after combat icons are committed keeps the higher combat total", () => {
    let r = table();
    let mom = "",
      over = "",
      b1 = "",
      b2 = "";
    r = mutate(r, (game) => {
      mom = giveCard(game, DAISY, "01036");
      over = giveCard(game, DAISY, "01091"); // 2 combat icons
      b1 = giveCard(game, DAISY, "01025");
      b2 = giveCard(game, DAISY, "01025");
      invStateIn(game.s, DAISY).resources = 5;
      putEnemy(game, "01160", inv(game, DAISY).location!, DAISY);
    });
    r = pick(r, /^Fight/);
    for (const c of [over, b1, b2]) r = pick(r, c);
    expect(tv(r)).toBe(6);
    r = pick(r, `play:${mom}`);
    expect(r.state.skillTest!.committed.length).toBe(3);
    expect(tv(r)).toBe(6);
  });

  it("Mind over Matter on evade: intellect icons commit", () => {
    let r = table();
    let mom = "";
    let deduction = "";
    r = mutate(r, (game) => {
      mom = giveCard(game, DAISY, "01036");
      deduction = giveCard(game, DAISY, "01039");
      putEnemy(game, "01160", inv(game, DAISY).location!, DAISY);
    });
    r = pick(r, `{"kind":"play","card":"${mom}"}`);
    r = pick(r, /^Evade/);
    expect(r.state.skillTest?.kind).toBe("evade");
    expect(canCommit(gOf(r), DAISY, deduction, r.state.skillTest!)).toBe(true);
  });
});
