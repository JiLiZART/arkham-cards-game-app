/** Return to Extracurricular Activity (campaign-return-to-the-dunwich-legacy, group 2): setup card 51012 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, pick, putEnemy } from "../kits/testkit";
import { evade, game, inject, toTurn, until } from "../kits/driver";
import { addTempMod, connections, findByCode } from "../queries";
import {
  addCounter,
  card,
  inv,
  placeInvestigator,
  reveal,
  setCardLocation,
  setCounter,
  type GameContext,
} from "../context";
import { moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: intellect 3, agility 2
const AFTER_HAW = { francisMorganKidnapped: true };
const OBSERVATORY = "51013";
const GUARD = "51014";

interface Opts {
  log?: Record<string, unknown>;
  bag?: ChaosToken[];
  seed?: number;
  prep?: (game: GameContext) => void;
}
const rea = ({ log = {}, bag = ["0"], seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "return-to-extracurricular-activity",
    investigators: [R],
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-dunwich-legacy", campaignLog: log },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const where = (r: Result, code: string) => findByCode(gOf(r), code)?.zone;
const place = (game: GameContext, code: string) => {
  const c = findByCode(game, code, [ZONE.SetAside, ZONE.Removed, ZONE.Location])!;
  if (c.zone !== ZONE.Location) moveCard(game, c.id, ZONE.Location);
  reveal(game, c.id);
  return c.id;
};
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const toEnd = (r: Result) => until(r, () => false, 200);

describe("setup", () => {
  it("Orne Library or Warren Observatory at random, the other removed; the base's campus beside it", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const r = rea({ seed });
      const g = gOf(r);
      const library = ["02050", OBSERVATORY].filter((c) => loc(g, c));
      expect(library).toHaveLength(1);
      seen.add(library[0]);
      const other = library[0] === "02050" ? OBSERVATORY : "02050";
      expect(where(r, other)).toBe(ZONE.Removed);
      for (const c of ["02048", "02049", "02051", "02053", "02056"])
        expect(loc(g, c)).toBeDefined();
      expect(where(r, "02054")).toBe(ZONE.SetAside);
    }
    expect(seen.size).toBe(2);
  });

  it("the Enthralled Security Guard at the Administration Building only after Return to The House Always Wins", () => {
    const before = gOf(rea());
    expect(findByCode(before, GUARD, [ZONE.Enemy])).toBeUndefined();
    const after = gOf(rea({ log: AFTER_HAW }));
    const guards = [findByCode(after, GUARD, [ZONE.Enemy])!];
    expect(card(after, guards[0].location!).code).toBe("02053");
    // one copy, the other still in the encounter deck
    expect(findByCode(after, GUARD, [ZONE.EncounterDeck])).toBeDefined();
    expect(findByCode(after, "02055", [ZONE.SetAside])).toBeDefined();
  });

  it("the Observatory in the Orne Library's place: the Quad and the Humanities Building", () => {
    const g = gOf(rea({ prep: (x) => void place(x, OBSERVATORY) }));
    const links = connections(g, loc(g, OBSERVATORY)!)
      .map((id) => card(g, id).code)
      .sort();
    expect(links).toEqual(["02048", "02049"]);
  });
});

describe("the box's cards", () => {
  it("51013 Warren Observatory: 3 cards discarded from your deck for each clue you discover there", () => {
    const r = rea({
      bag: ["+1"],
      prep: (g) => {
        const obs = place(g, OBSERVATORY);
        setCounter(g, obs, "clues", 1);
        placeInvestigator(g, R, obs);
      },
    });
    const before = inv(gOf(r), R).discard.length;
    const after = toTurn(pick(r, /^Investigate/), R); // intellect 3 + 1 vs shroud 4
    expect(inv(gOf(after), R).clues).toBe(1);
    expect(inv(gOf(after), R).discard.length - before).toBe(3);
  });

  it("51014 Enthralled Security Guard: its attack discards the top 2 of your deck", () => {
    let guard = "";
    const r = rea({ prep: (g) => void (guard = putEnemy(g, GUARD, inv(g, R).location!, R)) });
    const before = inv(gOf(r), R).discard.length;
    const hit = run(r, { t: STEP.EnemyAttack, enemy: guard, inv: R, aoo: false, key: "test" });
    expect(inv(gOf(hit), R).damage).toBe(1);
    expect(inv(gOf(hit), R).discard.length - before).toBe(2);
  });

  it("51014: evaded, it is defeated", () => {
    let guard = "";
    const r = rea({
      bag: ["+1"],
      prep: (g) => {
        guard = putEnemy(g, GUARD, inv(g, R).location!, R);
        addTempMod(g, { stat: "agility", value: 2 }, R, "round"); // agility 4 + 1 vs evade 4
      },
    });
    const after = toTurn(evade(r, GUARD), R);
    expect(card(gOf(after), guard).zone).not.toBe(ZONE.Enemy);
  });
});

describe("the resolutions, played", () => {
  it("R1: the clues spent in the Faculty Offices", () => {
    const r = rea({
      prep: (g) => {
        placeInvestigator(g, R, place(g, "02054"));
        addCounter(g, R, "clues", 2);
      },
    });
    expect(toEnd(pick(r, /Faculty Offices: spend 2 clues/)).state.resolution).toBe("R1");
  });

  it("R4: The Experiment enters the Dormitories", () => {
    const three = run(rea(), { t: STEP.AdvanceAgenda }, { t: STEP.AdvanceAgenda });
    const exp = findByCode(gOf(three), "02058", [ZONE.Enemy])!.id;
    const moved = run(
      mutate(three, (g) => setCardLocation(g, exp, loc(g, "02051")!)),
      { t: STEP.Script, code: "02043", fn: "back", ctx: { source: null } },
    );
    expect(toEnd(moved).state.resolution).toBe("R4");
  });
});
