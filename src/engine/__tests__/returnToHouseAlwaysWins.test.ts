/** Return to The House Always Wins (campaign-return-to-the-dunwich-legacy, group 3): setup card 51015 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import { game, inject, toTurn, until, use } from "../kits/driver";
import { connections, enemyStat, findByCode, isAloof, threatArea } from "../queries";
import {
  card,
  currentAct,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setEngaged,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { remembered } from "../world/flags";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: 5 resources, health 9
const LOUNGE = "51016";
const STAGE = "51017";
const PIT_BOSS = "02078"; // a Criminal

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  prep?: (game: GameContext) => void;
}
const rhaw = ({ invs = [R], bag = ["0"], seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "return-to-the-house-always-wins",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-dunwich-legacy" },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const where = (r: Result, code: string) => findByCode(gOf(r), code)?.zone;
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/** a seed whose setup chose the box's Lounge */
const newLounge = () => SEEDS.find((seed) => !!loc(gOf(rhaw({ seed })), LOUNGE))!;
/** Roland at a location in play, revealed */
const goTo = (game: GameContext, code: string) => {
  const id = loc(game, code)!;
  reveal(game, id);
  placeInvestigator(game, R, id);
  return id;
};
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** Roland draws this encounter card */
function draw(r: Result, code: string): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.EncounterDeck);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: R, card: id });
}
const toEnd = (r: Result) => until(r, () => false, 300);

describe("setup", () => {
  it("one Clover Club Lounge at random, the other removed; the Pit Boss in it; the Stage and Erratic Fear set aside", () => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const r = rhaw({ seed });
      const g = gOf(r);
      const lounge = ["02071", LOUNGE].filter((c) => loc(g, c));
      expect(lounge).toHaveLength(1);
      seen.add(lounge[0]);
      expect(where(r, lounge[0] === LOUNGE ? "02071" : LOUNGE)).toBe(ZONE.Removed);
      const boss = findByCode(g, PIT_BOSS, [ZONE.Enemy])!;
      expect(card(g, boss.location!).code).toBe(lounge[0]);
      expect(where(r, STAGE)).toBe(ZONE.SetAside);
      for (const c of ["51068", "51069", "51070"]) expect(where(r, c)).toBe(ZONE.SetAside);
      expect(findByCode(g, "01163")).toBeUndefined();
    }
    expect(seen.size).toBe(2);
  });

  it("agenda 2's back moves everyone at La Bella Luna into the box's Lounge and shuffles Erratic Fear in", () => {
    const r = rhaw({ seed: newLounge() });
    const after = run(r, { t: STEP.AdvanceAgenda }, { t: STEP.AdvanceAgenda });
    const g = gOf(after);
    expect(card(g, inv(g, R).location!).code).toBe(LOUNGE);
    expect(where(after, "02070")).toBe(ZONE.Removed);
    expect(where(after, "51068")).toBe(ZONE.EncounterDeck);
  });
});

describe("the box's cards", () => {
  const atLounge = (prep: (game: GameContext) => void = () => {}) =>
    rhaw({
      seed: newLounge(),
      prep: (g) => {
        goTo(g, LOUNGE);
        prep(g);
      },
    });

  it("51016 Clover Club Lounge: revealed, the Stage comes into play, connected to the Bar", () => {
    const r = toTurn(
      inject(rhaw({ seed: newLounge() }), (g) => void goTo(g, LOUNGE)),
      R,
    );
    const moved = toTurn(
      inject(r, () => {}, {
        t: STEP.Window,
        trigger: "revealed",
        data: { location: loc(gOf(r), LOUNGE)! },
      }),
      R,
    );
    const g = gOf(moved);
    const stage = loc(g, STAGE)!;
    expect(stage).toBeDefined();
    expect(connections(g, stage).map((id) => card(g, id).code)).toEqual(["02072"]);
  });

  it("51016 on act 1: an Ally on top of your deck may go into play; once per round", () => {
    let ally = "";
    const r = atLounge((g) => {
      ally = createCard(g, "01018", ZONE.Limbo, R); // Beat Cop
      moveCard(g, ally, ZONE.Deck, { top: true });
    });
    const asked = use(r, LOUNGE, 1);
    const played = toTurn(pick(asked, "Put it into play"), R);
    expect(card(gOf(played), ally).zone).toBe(ZONE.Play);
    expect(options(played).some((o) => /Clover Club Lounge: look/.test(o))).toBe(false);
  });

  it("51016: any other card on top is drawn", () => {
    const r = atLounge();
    const top = inv(gOf(r), R).deck[0];
    const drew = toTurn(use(r, LOUNGE, 1), R);
    expect(inv(gOf(drew), R).hand).toContain(top);
  });

  it("51017 Clover Club Stage: a resource placed on it per action; 1 per investigator there gains 1 clue each, once per game", () => {
    const r = rhaw({
      seed: newLounge(),
      prep: (g) => {
        const stage = findByCode(g, STAGE, [ZONE.SetAside])!.id;
        moveCard(g, stage, ZONE.Location);
        goTo(g, STAGE);
      },
    });
    expect(options(r).some((o) => /gain 1 clue per investigator/.test(o))).toBe(false);
    const staked = toTurn(use(r, STAGE, 0), R);
    const g = gOf(staked);
    expect(inv(g, R).resources).toBe(4);
    expect(card(g, loc(g, STAGE)!).resources).toBe(1);
    const got = toTurn(pick(staked, /gain 1 clue per investigator/), R);
    expect(inv(gOf(got), R).clues).toBe(1);
    const again = toTurn(use(got, STAGE, 0), R);
    expect(options(again).some((o) => /gain 1 clue per investigator/.test(o))).toBe(false);
  });

  it("51018 Caught Cheating: surge; whoever cheated loses 2 resources and takes 1 damage", () => {
    expect(gOf(rhaw()).db.cards["51018"].keywords).toContain("surge");
    // its revelation alone (a surge would draw on)
    const reveal = (r: Result) =>
      run(r, { t: STEP.Script, code: "51018", fn: "caught", ctx: { you: R, source: null } });
    const honest = reveal(rhaw());
    expect(inv(gOf(honest), R).resources).toBe(5);
    expect(inv(gOf(honest), R).damage).toBe(0);
    const caught = reveal(rhaw({ prep: (g) => remembered.set(g, ["cheated", R], true) }));
    expect(inv(gOf(caught), R).resources).toBe(3);
    expect(inv(gOf(caught), R).damage).toBe(1);
  });

  it("51019 Raise the Stakes: cheat, or lose 5 resources", () => {
    const cheated = toTurn(pick(draw(rhaw(), "51019"), "Remember that you have cheated"), R);
    expect(remembered.get(gOf(cheated), ["cheated", R])).toBe(true);
    const paid = toTurn(pick(draw(rhaw(), "51019"), "Lose 5 resources"), R);
    expect(inv(gOf(paid), R).resources).toBe(0);
  });

  it("51019 in your threat area: Criminals at your location lose Aloof; from act 2 the engaged ones get +1 fight and evade", () => {
    let boss = "";
    const r = rhaw({
      prep: (g) => {
        boss = putEnemy(g, PIT_BOSS, inv(g, R).location!);
      },
    });
    expect(isAloof(gOf(r), boss)).toBe(true);
    const threat = toTurn(
      pick(draw(r, "51019"), "Put Raise the Stakes into play in your threat area"),
      R,
    );
    const g = gOf(threat);
    expect(threatArea(g, R).map((c) => c.code)).toContain("51019");
    expect(isAloof(g, boss)).toBe(false);
    const fight = enemyStat(g, boss, "fight");
    const act2 = mutate(threat, (x) => {
      moveCard(x, currentAct(x)!, ZONE.Removed);
      moveCard(x, pile(x, "actDeck")[0], ZONE.Act);
      setEngaged(x, boss, R);
    });
    expect(enemyStat(gOf(act2), boss, "fight")).toBe(fight + 1);
    expect(enemyStat(gOf(act2), boss, "evade")).toBe(enemyStat(g, boss, "evade") + 1);
  });
});

describe("the resolutions, played", () => {
  it("R1: act 3, resigned without Dr. Morgan", () => {
    const r = run(
      rhaw({
        prep: (g) => {
          const vip = findByCode(g, "02076", [ZONE.SetAside])!.id;
          moveCard(g, vip, ZONE.Location);
          reveal(g, vip);
        },
      }),
      { t: STEP.AdvanceAct },
      { t: STEP.AdvanceAct },
    );
    expect(toEnd(pick(r, "La Bella Luna: resign")).state.resolution).toBe("R1");
  });

  it("no resolution: resigned before act 3", () => {
    const end = toEnd(pick(rhaw(), "La Bella Luna: resign"));
    expect(end.state.resolution).toBe("none");
  });
});
