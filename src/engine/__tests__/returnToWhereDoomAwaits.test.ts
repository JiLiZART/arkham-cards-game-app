/** Return to Where Doom Awaits (campaign-return-to-the-dunwich-legacy, group 8): setup card 51047 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, pick } from "../kits/testkit";
import {
  game,
  inject,
  inPlay,
  investigate,
  lastTest,
  move,
  toTurn,
  until,
  use,
} from "../kits/driver";
import { cardsIn, connections, findByCode } from "../queries";
import {
  card,
  currentAct,
  currentAgenda,
  inv,
  placeInvestigator,
  reveal,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE, type Zone } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const BASE = "51048";
const ASCENDING = "51049";
const PEAK = "02284";
const CAMP = "51050";
const LAKE = "51051";
const NAOMI = "51052";
const DIVERGING = ["02285", "02286", "02287", "02288", CAMP];
const ALTERED = ["02289", "02290", "02291", "02292", LAKE];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const rtwda = ({ invs = [R], bag = ["0"], seed = 1, log = {}, prep }: Opts = {}) =>
  game({
    scenario: "return-to-where-doom-awaits",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-dunwich-legacy", campaignLog: log },
  });

const loc = (game: GameContext, code: string): InstId | undefined =>
  findByCode(game, code, [ZONE.Location])?.id;
/** a path of this code in play, revealed or not */
function path(game: GameContext, code: string, revealed = true): InstId {
  let id = loc(game, code);
  if (!id) {
    const c = findByCode(game, code, [ZONE.SetAside, ZONE.Removed]);
    id = c?.id ?? createCard(game, code, ZONE.Limbo);
    moveCard(game, id, ZONE.Location);
  }
  if (revealed) reveal(game, id);
  return id;
}
const at = (r: Result) => inv(gOf(r), R).location!;
const codesIn = (game: GameContext, zone: Zone, pool: string[]) =>
  cardsIn(game, zone)
    .filter((c) => pool.includes(c.code))
    .map((c) => c.code);
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );

describe("setup", () => {
  it("the Warped Base and Ascending Path and Sentinel Peak in play, the originals out; everyone at the Base", () => {
    const g = gOf(rtwda());
    expect(
      cardsIn(g, ZONE.Location)
        .map((l) => l.code)
        .sort(),
    ).toEqual([PEAK, BASE, ASCENDING].sort());
    expect(card(g, at(rtwda())).code).toBe(BASE);
    for (const code of ["02282", "02283"])
      expect(cardsIn(g, ZONE.Removed).some((c) => c.code === code)).toBe(true);
    expect(
      cardsIn(g, ZONE.EncounterDeck).some((c) => c.code === "02282" || c.code === "02283"),
    ).toBe(false);
  });

  it("3 of the 5 Diverging and 3 of the 5 Altered Paths set aside, the new ones among them at random", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const g = gOf(rtwda({ seed }));
      const div = codesIn(g, ZONE.SetAside, DIVERGING);
      const alt = codesIn(g, ZONE.SetAside, ALTERED);
      expect(div).toHaveLength(3);
      expect(alt).toHaveLength(3);
      expect(codesIn(g, ZONE.Removed, DIVERGING)).toHaveLength(2);
      expect(codesIn(g, ZONE.Removed, ALTERED)).toHaveLength(2);
      for (const c of [...div, ...alt]) seen.add(c);
    }
    expect(seen.has(CAMP) && seen.has(LAKE)).toBe(true);
  });

  it("act 2 by the log, as the base", () => {
    const actOf = (log: Record<string, unknown>) => {
      const g = gOf(rtwda({ log }));
      return cardsIn(g, ZONE.ActDeck).map((c) => c.code);
    };
    expect(actOf({ restoredSilasBishop: true })).toContain("02278");
    expect(actOf({ necronomiconStolen: true })).toContain("02279");
    expect(actOf({})).toContain("02280");
  });

  it("Naomi set aside; with Naomi at your back no clues for the lead (she joins a deck instead)", () => {
    const without = gOf(rtwda());
    expect(cardsIn(without, ZONE.SetAside).some((c) => c.code === NAOMI)).toBe(true);
    expect(cardsIn(without, ZONE.EncounterDeck).some((c) => c.code === NAOMI)).toBe(false);
    const withNaomi = gOf(rtwda({ log: { naomiHasBack: true } }));
    expect(inv(withNaomi, R).clues).toBe(0);
    // "Set Seth Bishop and Naomi O'Bannion aside" only when she hasn't your back
    expect(cardsIn(withNaomi, ZONE.SetAside).some((c) => c.code === NAOMI)).toBe(false);
  });

  it("the Brood that escaped: 1 doom on agenda 1a per Brood", () => {
    const g = gOf(rtwda({ log: { broodEscaped: 3 } }));
    expect(card(g, currentAgenda(g)!).doom).toBe(3);
  });
});

describe("the map", () => {
  it("the Base ↔ Ascending Path and each Diverging Path (the Camp too); Ascending ↔ Peak and each Altered Path", () => {
    const r = rtwda({
      prep: (g) => {
        path(g, CAMP, false);
        path(g, LAKE, false);
        path(g, "02285", false);
      },
    });
    const g = gOf(r);
    expect(
      connections(g, loc(g, BASE)!)
        .map((l) => card(g, l).code)
        .sort(),
    ).toEqual(["02285", ASCENDING, CAMP].sort());
    expect(
      connections(g, loc(g, ASCENDING)!)
        .map((l) => card(g, l).code)
        .sort(),
    ).toEqual([BASE, PEAK, LAKE].sort());
  });

  it("revealed, Abandoned Camp and Fathomless Lake link by their printed symbols", () => {
    const r = rtwda({
      prep: (g) => {
        path(g, CAMP);
        path(g, LAKE);
      },
    });
    const linked = run(r, {
      t: STEP.Script,
      code: "where-doom-awaits",
      fn: "wdaRelink",
      ctx: { you: R, source: null },
    } as Step);
    const g = gOf(linked);
    expect(connections(g, loc(g, CAMP)!)).toContain(loc(g, LAKE));
  });
});

describe("the Warped and Twisted locations", () => {
  it("Base of the Hill: the clues discovered there are spent for as many random set-aside Diverging Paths", () => {
    const r = rtwda({
      bag: ["+1"],
      prep: (g) => {
        const base = loc(g, BASE)!;
        setCounter(g, base, "clues", 3);
      },
    });
    const before = codesIn(gOf(r), ZONE.Location, DIVERGING).length;
    const after = toTurn(investigate(r), R);
    const g = gOf(after);
    expect(inv(g, R).clues).toBe(0);
    expect(codesIn(g, ZONE.Location, DIVERGING).length).toBe(before + 1);
    expect(codesIn(g, ZONE.SetAside, DIVERGING).length).toBe(2);
  });

  it("Ascending Path: the same with the Altered Paths; it can't be entered unrevealed", () => {
    const r = rtwda({ bag: ["+1"] });
    const g0 = gOf(r);
    const options = r.state.pending!.options.map((o) => o.label).join(" | ");
    expect(card(g0, loc(g0, ASCENDING)!).revealed).toBe(false);
    expect(options).not.toMatch(/Move to Ascending Path/);
    const there = mutate(r, (g) => {
      const a = loc(g, ASCENDING)!;
      reveal(g, a);
      setCounter(g, a, "clues", 3);
      placeInvestigator(g, R, a);
    });
    const after = toTurn(investigate(there), R);
    expect(codesIn(gOf(after), ZONE.Location, ALTERED)).toHaveLength(1);
    expect(inv(gOf(after), R).clues).toBe(0);
  });

  it("the Base's resign", () => {
    const r = rtwda();
    const out = until(use(r, BASE, 1), (x) => x.state.phase === "ended");
    expect(inv(gOf(out), R).status).toBe("resigned");
  });
});

describe("the new paths revealed", () => {
  it("Abandoned Camp: 2 resources lost per action taken this round, the move included", () => {
    const r = rtwda({ prep: (g) => void path(g, CAMP, false) });
    const moved = toTurn(move(r, CAMP), R);
    // the move was the first action: 2 of the 5 resources
    expect(inv(gOf(moved), R).resources).toBe(inv(gOf(r), R).resources - 2);
  });

  it("Fathomless Lake: 1 doom on the agenda with 2 or more actions left", () => {
    const r = rtwda({
      prep: (g) => {
        path(g, LAKE, false);
        placeInvestigator(g, R, loc(g, ASCENDING)!);
        reveal(g, loc(g, ASCENDING)!);
      },
    });
    const doom = (x: Result) => card(gOf(x), currentAgenda(gOf(x))!).doom;
    const moved = toTurn(move(r, LAKE), R);
    expect(doom(moved)).toBe(doom(r) + 1);
  });
});

describe("Naomi O'Bannion", () => {
  it("+1 intellect and combat; cancels a token of an intellect test here, and that token again for the rest of the test", () => {
    let cancelled = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = rtwda({
        seed,
        bag: ["skull", "skull", "skull", "+1"],
        prep: (g) => void inPlay(g, R, NAOMI),
      });
      const naomi = /Naomi O'Bannion/;
      const asked = until(
        inject(r, () => {}, {
          t: STEP.Eff,
          effect: { op: "skillTest", skill: "intellect", difficulty: 0 },
          ctx: { you: R, source: null },
        } as Step),
        (y) =>
          y.state.pending?.kind === "turn" ||
          !!y.state.pending?.options.some((o) => naomi.test(o.label)),
      );
      if (asked.state.pending?.kind === "turn") continue;
      const done = toTurn(pick(asked, naomi), R);
      const t = lastTest(done)!;
      // Roland's 3 intellect +1; the token she cancelled is cancelled each time it comes back, the test keeps another
      expect(t.base).toBe(4);
      const log = done.state.log;
      const revealed = log
        .slice(log.findLastIndex((e) => e.type === "testStart"))
        .filter((e) => e.type === "token")
        .map((e) => e.text.split(": ").pop());
      const first = revealed[0];
      expect(revealed.slice(0, -1).every((x) => x === first)).toBe(true);
      expect(t.tokens).toHaveLength(1);
      expect(t.tokens[0]).not.toBe(first);
      expect(card(gOf(done), findByCode(gOf(done), NAOMI, [ZONE.Play])!.id).exhausted).toBe(true);
      cancelled++;
    }
    expect(cancelled).toBeGreaterThan(0);
  });
});

describe("the resolutions", () => {
  it("act 3's back is R1; agenda 2's is R2", () => {
    const r = mutate(rtwda(), (g) => {
      const a3 = findByCode(g, "02281", [ZONE.ActDeck])!.id;
      moveCard(g, currentAct(g)!, ZONE.Removed);
      moveCard(g, a3, ZONE.Act, { deck: "a" });
    });
    const won = until(
      inject(r, () => {}, { t: STEP.AdvanceAct }),
      (x) => x.state.phase === "ended",
    );
    expect(won.state.resolution).toBe("R1");
    let lost = toTurn(
      inject(rtwda(), () => {}, { t: STEP.AdvanceAgenda }),
      R,
    );
    lost = until(
      inject(lost, () => {}, { t: STEP.AdvanceAgenda }),
      (x) => x.state.phase === "ended",
    );
    expect(lost.state.resolution).toBe("R2");
  });
});
