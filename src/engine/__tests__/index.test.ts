import type { ChaosToken } from "../../content/schema";
import { describe, expect, it } from "vitest";

import { findByCode } from "../queries";
import { moveCard } from "../movement";
import { deserialize, dispatch, getLegalActions, replay, serialize } from "../index";
import {
  db,
  giveCard,
  mutate,
  options,
  pick,
  putEnemy,
  setup,
  skipMulligans,
  start,
} from "../kits/testkit";
import type { Action } from "../world/types";
import { allCardRecsIn, cardRecIn, invStateIn, pileRecIn } from "../world/store";
import { ZONE, PILE } from "../world/constants";

const ROLAND = "01001";
const DAISY = "01002";
const AGNES = "01004";
function gathering(invs = [ROLAND], bag: ChaosToken[] = ["0"], seed = 1) {
  const r = start("the-gathering", invs, seed, { chaosBag: bag });
  return skipMulligans(r);
}

describe("state & determinism", () => {
  it("replay produces the same result", () => {
    const s = setup("the-gathering", [ROLAND, AGNES], 42);
    let r = skipMulligans(replay(db, s, []));
    const actions: Action[] = [];
    // play a few actions deterministically: always the first non-mulligan option except end turn last
    for (let k = 0; k < 40 && r.state.pending; k++) {
      const p = r.state.pending;
      const o = p.options.find((x) => /Investigate|Draw|Gain/.test(x.label)) ?? p.options[0];
      actions.push({ type: "choose", inv: p.inv, option: o.id });
      r = dispatch(db, r.state, actions.at(-1)!);
    }
    // the mulligan answers are part of the action list too
    const all: Action[] = [];
    let rr = replay(db, s, []);
    while (rr.state.pending?.kind === "mulligan") {
      const a: Action = { type: "choose", inv: rr.state.pending.inv, option: "done" };
      all.push(a);
      rr = dispatch(db, rr.state, a);
    }
    const again = replay(db, s, [...all, ...actions]);
    expect(again.state).toEqual(r.state);
  });

  it("mulligan: a picked card can be taken back before confirming", () => {
    const s = setup("the-gathering", [ROLAND], 7);
    const actions: Action[] = [];
    let r = replay(db, s, []);
    const choose = (option: string) => {
      actions.push({ type: "choose", inv: ROLAND, option });
      r = dispatch(db, r.state, actions.at(-1)!);
      if (r.error) throw new Error(r.error);
    };
    const [a, b] = invStateIn(r.state, ROLAND).hand;
    choose(a);
    choose(b);
    expect(r.state.pending!.options.map((o) => o.id)).toEqual(
      expect.arrayContaining([`un:${a}`, `un:${b}`]),
    );
    choose(`un:${a}`);
    const p = r.state.pending!;
    expect(p.kind).toBe("mulligan");
    expect(p.options.map((o) => o.id)).toContain(a); // offered for picking again
    expect(p.options.map((o) => o.id)).not.toContain(`un:${a}`);
    expect(p.options.find((o) => o.id === "done")!.label).toBe("Redraw 1 card(s)");
    choose("done");
    const hand = invStateIn(r.state, ROLAND).hand;
    expect(hand).toContain(a);
    expect(hand).not.toContain(b);
    expect(hand).toHaveLength(5);
    expect(replay(db, s, actions).state).toEqual(r.state);
  });

  it("save and resume", () => {
    const r = gathering();
    const back = deserialize(serialize(r.state));
    expect(back).toEqual(r.state);
    expect(back.pending?.options.map((o) => o.id)).toEqual(
      r.state.pending?.options.map((o) => o.id),
    );
    const a = dispatch(db, back, {
      type: "choose",
      inv: ROLAND,
      option: JSON.stringify({ kind: "resource" }),
    });
    expect(a.error).toBeUndefined();
    expect(invStateIn(a.state, ROLAND).resources).toBe(6);
  });
});

describe("action validation", () => {
  it("rejects an illegal action without mutating state", () => {
    const r = gathering();
    const before = serialize(r.state);
    const bad = dispatch(db, r.state, {
      type: "choose",
      inv: ROLAND,
      option: JSON.stringify({ kind: "move", to: "nowhere" }),
    });
    expect(bad.error).toMatch(/illegal/);
    expect(serialize(r.state)).toBe(before);
    expect(bad.state).toBe(r.state);
  });

  it("rejects a move with no actions left", () => {
    let r = gathering();
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).actionsLeft = 0;
    });
    expect(options(r).some((l) => /^(Investigate|Draw|Gain)/.test(l))).toBe(false);
    expect(options(r)).toContain("End turn");
  });

  it("lists legal actions for the active investigator", () => {
    const r = gathering();
    const labels = getLegalActions(db, r.state).map((o) => o.label);
    expect(labels).toContain("Investigate Study");
    expect(labels).toContain("Draw 1 card");
    expect(labels).toContain("Gain 1 resource");
    expect(labels).toContain("End turn");
  });
});

describe("reveal counter", () => {
  const rev = (r: { state: { counters: { reveal: number } } }) => r.state.counters.reveal;

  it("a move or a commit reveals nothing; a draw and the token draw do", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => void giveCard(game, ROLAND, "01025"));
    const n = rev(r);
    r = pick(r, "Investigate Study");
    r = pick(r, /^Commit/);
    expect(rev(r)).toBe(n);
    r = pick(r, "done");
    expect(rev(r)).toBe(n + 1);
    const m = rev(r);
    r = pick(r, "Draw 1 card");
    expect(rev(r)).toBe(m + 1);
  });

  it("showing deck cards for a search reveals", () => {
    let r = skipMulligans(start("the-gathering", ["01002"], 3));
    r = mutate(r, (game) => {
      const book = allCardRecsIn(game.s).find((c) => c.code === "01031")!;
      invStateIn(game.s, "01002").deck = invStateIn(game.s, "01002").deck.filter(
        (x) => x !== book.id,
      );
      invStateIn(game.s, "01002").hand = invStateIn(game.s, "01002").hand.filter(
        (x) => x !== book.id,
      );
      Object.assign(book, { zone: "play", controller: "01002", owner: "01002" });
    });
    const n = rev(r);
    r = pick(r, /Old Book/);
    if (r.state.pending?.kind === "target") r = pick(r, "Daisy Walker");
    expect(r.state.pending?.prompt).toMatch(/Search your deck/);
    expect(rev(r)).toBe(n + 1);
  });

  it("random bot games: every change to decks, the bag or the RNG bumps it", () => {
    for (const seed of [1, 2, 3]) {
      let r = skipMulligans(start("the-gathering", [ROLAND, DAISY], seed));
      for (let k = 0; k < 150 && r.state.pending; k++) {
        const p = r.state.pending;
        const next = dispatch(db, r.state, {
          type: "choose",
          inv: p.inv,
          option: p.options[(k * 7) % p.options.length].id,
        });
        const touched =
          next.state.rng !== r.state.rng ||
          next.state.chaosBag.length < r.state.chaosBag.length ||
          pileRecIn(next.state, PILE.EncounterDeck).length <
            pileRecIn(r.state, PILE.EncounterDeck).length ||
          r.state.order.some(
            (i) => invStateIn(next.state, i).deck.length < invStateIn(r.state, i).deck.length,
          );
        if (touched) expect(rev(next)).toBe(rev(r) + 1);
        r = next;
      }
    }
  });
});

describe("event sources", () => {
  it("the Attic's horror names the Attic; a Ghoul's attack names the Ghoul", () => {
    let r = gathering([ROLAND]);
    let attic = "";
    let ghoul = "";
    r = mutate(r, (game) => {
      const hall = findByCode(game, "01112", [ZONE.SetAside, ZONE.Location])!.id;
      attic = findByCode(game, "01113", [ZONE.SetAside, ZONE.Location])!.id;
      moveCard(game, hall, ZONE.Location);
      moveCard(game, attic, ZONE.Location);
      cardRecIn(game.s, hall).revealed = true;
      invStateIn(game.s, ROLAND).location = hall;
    });
    r = pick(r, "Move to Attic");
    while (r.state.pending?.kind === "assign") r = pick(r, /./);
    const hit = r.state.log.findLast((e) => e.type === "damage");
    expect(hit?.data).toMatchObject({ horror: 1, source: attic });
    r = mutate(r, (game) => void (ghoul = putEnemy(game, "01160", attic, ROLAND)));
    while (
      !r.state.log.some((e) => e.type === "damage" && e.data?.source === ghoul) &&
      r.state.pending
    )
      r = pick(r, r.state.pending.kind === "turn" ? "End turn" : /./);
    expect(r.state.log.some((e) => e.type === "damage" && e.data?.source === ghoul)).toBe(true);
  });
});
