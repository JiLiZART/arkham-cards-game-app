/** Return to Undimensioned and Unseen (campaign-return-to-the-dunwich-legacy, group 7): setup card 51041 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, putEnemy } from "../kits/testkit";
import { game, inject, lastTest, move, toTurn, until } from "../kits/driver";
import { cardsIn, connections, enemies, enemyStat, isElite } from "../queries";
import { card, inv, setCounter, type GameContext } from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";
import * as flags from "../world/flags";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const ORIGINAL = "02255";
const VERSIONS = ["51042", "51043", "51044", "51045"];
const ALL = [ORIGINAL, ...VERSIONS];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  sacrificed?: string[];
  prep?: (game: GameContext) => void;
}
const rtuau = ({ invs = [R], bag = ["0"], seed = 1, sacrificed = [], prep }: Opts = {}) =>
  game({
    scenario: "return-to-undimensioned-and-unseen",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: {
      campaignId: "return-to-the-dunwich-legacy",
      campaignLog: sacrificed.length ? { sacrificed } : {},
    },
  });

const isBrood = (game: GameContext, code: string) =>
  game.db.cards[code].name === "Brood of Yog-Sothoth";
const broodIn = (game: GameContext) => enemies(game).filter((e) => isBrood(game, e.code));
const broodAside = (game: GameContext) =>
  cardsIn(game, ZONE.SetAside).filter((c) => isBrood(game, c.code));
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const here = (r: Result) => inv(gOf(r), R).location!;
/** no Brood anywhere but this one, at a location */
function only(game: GameContext, code: string, loc: InstId): InstId {
  for (const c of [...broodIn(game), ...broodAside(game)]) moveCard(game, c.id, ZONE.Removed);
  return putEnemy(game, code, loc, null);
}
function drawNew(r: Result, code: string): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.Limbo);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: R, card: id });
}

describe("setup", () => {
  it("one original Brood and the four versions; the other originals out of the game", () => {
    const g = gOf(rtuau());
    const pool = [...broodIn(g), ...broodAside(g)].map((c) => c.code).sort();
    expect(pool).toEqual([...ALL].sort());
    expect(cardsIn(g, ZONE.Removed).filter((c) => c.code === ORIGINAL)).toHaveLength(4);
    expect(cardsIn(g, ZONE.EncounterDeck).filter((c) => isBrood(g, c.code))).toHaveLength(0);
    // the Formula set aside, Imperceptible Creature in the encounter deck
    expect(cardsIn(g, ZONE.SetAside).some((c) => c.code === "02254")).toBe(true);
    expect(cardsIn(g, ZONE.EncounterDeck).filter((c) => c.code === "51046")).toHaveLength(2);
  });

  it("the Brood in play are random among the versions, as many as the base by the names sacrificed", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const g = gOf(rtuau({ seed }));
      expect(broodIn(g)).toHaveLength(2);
      expect(broodAside(g)).toHaveLength(3);
      for (const e of broodIn(g)) seen.add(e.code);
    }
    expect(seen.size).toBeGreaterThan(2);
    const three = gOf(rtuau({ sacrificed: ["02040", "02217", "02218"] }));
    expect(broodIn(three)).toHaveLength(1);
    expect(broodAside(three)).toHaveLength(2);
  });
});

describe("the additional rule", () => {
  it("each Brood spawned is one of the set-aside versions, chosen at random", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = rtuau({ seed });
      const aside = broodAside(gOf(r)).map((c) => c.id);
      const after = run(r, {
        t: STEP.Script,
        code: "undimensioned-and-unseen",
        fn: "uauSpawnBrood",
        ctx: { you: R, source: null },
        args: { at: here(r) },
      } as Step);
      const spawned = broodIn(gOf(after)).find((e) => aside.includes(e.id))!;
      expect(ALL).toContain(spawned.code);
      seen.add(spawned.code);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("brood escaped counts every version in play or set aside", () => {
    const r = rtuau();
    const ended = inject(r, () => {}, { t: STEP.Resolution, id: "R1" } as Step);
    expect(flags.countEntry.get(gOf(ended), ["campaign_notes", "broodEscaped"])).toBe(5);
    const fewer = inject(
      r,
      (g) => {
        for (const c of broodAside(g).slice(1)) moveCard(g, c.id, ZONE.Removed);
      },
      { t: STEP.Resolution, id: "R1" } as Step,
    );
    expect(flags.countEntry.get(gOf(fewer), ["campaign_notes", "broodEscaped"])).toBe(3);
  });
});

describe("the four versions", () => {
  it("only the Esoteric Formula damages them; health per investigator as printed", () => {
    for (const [code, per] of [
      ["51042", 1],
      ["51043", 2],
      ["51044", 1],
      ["51045", 1],
    ] as const) {
      let id = "";
      const r = rtuau({
        invs: [R, D],
        prep: (g) => {
          id = only(g, code, inv(g, R).location!);
        },
      });
      const g = gOf(r);
      expect(g.db.cards[code].onlyAttackableBy).toBe("02254");
      expect(enemyStat(g, id, "health")).toBe(g.db.cards[code].enemy!.health! + per * 2);
      const hit = run(r, {
        t: STEP.DamageEnemy,
        enemy: id,
        amount: 3,
        by: R,
        source: null,
      } as Step);
      expect(card(gOf(hit), id).damage).toBe(0);
    }
  });

  it("Charging Beast: its first move each round, unengaged, is followed by another toward a random location", () => {
    const moves = new Set<number>();
    for (const seed of [1, 2, 3, 4, 5]) {
      let id = "";
      let to = "";
      const r = rtuau({
        seed,
        prep: (g) => {
          // from one empty location toward another
          const [a, b] = cardsIn(g, ZONE.Location).filter((l) => l.id !== inv(g, R).location);
          id = only(g, "51042", a.id);
          to = b.id;
        },
      });
      const moved = run(r, {
        t: STEP.Script,
        code: "undimensioned-and-unseen",
        fn: "uauMoveToward",
        ctx: { you: R, source: null },
        args: { enemy: id, at: to },
      } as Step);
      const g = gOf(moved);
      expect(flags.named(g, `charging:${g.s.round}:${id}`)).toBe(true);
      // its own move, then the charge (none when the random location is where it stands)
      moves.add(moved.state.log.filter((e) => e.type === "enemyMove" && e.card === id).length);
    }
    expect(Math.max(...moves)).toBe(2);
  });

  it("Charging Beast: its spawn is not a move", () => {
    const r = rtuau({
      prep: (g) => {
        for (const c of [...broodIn(g), ...broodAside(g)]) moveCard(g, c.id, ZONE.Removed);
      },
    });
    let id = "";
    const spawned = run(
      mutate(r, (g) => {
        id = createCard(g, "51042", ZONE.Limbo);
      }),
      { t: STEP.Spawn, enemy: id, inv: null, at: here(r) } as Step,
    );
    // no investigator-free move after it spawned: it stays where it spawned
    expect(card(gOf(spawned), id).location).toBe(here(r));
    expect(flags.named(gOf(spawned), `charging:${gOf(spawned).s.round}:${id}`)).toBeUndefined();
  });

  it("Amorphous Terror: entering your location, willpower (3) or 1 horror", () => {
    let id = "";
    const r = rtuau({
      bag: ["-2"],
      prep: (g) => {
        const far = cardsIn(g, ZONE.Location).find((l) => l.id !== inv(g, R).location)!;
        id = only(g, "51045", far.id);
      },
    });
    const met = until(
      inject(
        r,
        (g) => {
          moveCard(g, id, ZONE.Enemy, { location: inv(g, R).location! });
        },
        {
          t: STEP.Window,
          trigger: "enemyEntersLocation",
          data: { enemy: id, location: here(r) },
        } as Step,
      ),
      (x) => x.state.pending?.kind === "turn",
    );
    expect(lastTest(met)).toMatchObject({ skill: "willpower", difficulty: 3, success: false });
    expect(inv(gOf(met), R).horror).toBe(1);
    // or vice versa: you enter its location
    let near = "";
    const r2 = rtuau({
      bag: ["-2"],
      prep: (g) => {
        near = connections(g, inv(g, R).location!)[0];
        id = only(g, "51045", near);
      },
    });
    const entered = until(
      move(r2, card(gOf(r2), near).code),
      (x) => x.state.pending?.kind === "turn",
    );
    expect(lastTest(entered)).toMatchObject({ skill: "willpower", difficulty: 3 });
    expect(inv(gOf(entered), R).horror).toBe(1);
  });

  it("Imperceptible Creature: attaches to a Brood without one, takes a clue off it; the Brood gains Elite", () => {
    let id = "";
    const r = rtuau({
      prep: (g) => {
        id = only(g, "51043", inv(g, R).location!);
        setCounter(g, id, "clues", 2);
      },
    });
    expect(isElite(gOf(r), id)).toBe(false);
    const after = toTurn(drawNew(r, "51046"), R);
    const g = gOf(after);
    expect(cardsIn(g, ZONE.Attached).find((c) => c.code === "51046")?.attachedTo).toBe(id);
    expect(card(g, id).clues).toBe(1);
    expect(isElite(g, id)).toBe(true);
  });
});
