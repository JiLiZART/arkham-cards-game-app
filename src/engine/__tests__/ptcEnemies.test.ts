/**
 * The enemy vocabulary The Path to Carcosa needs (campaign-the-path-to-carcosa, task 1.6): damage only from named
 * sources (Poltergeist, Hastur), an enemy at no location that attacks everyone (The King in Yellow), a spawn from the
 * victory display (Royal Emissary's encore), a spawn at one of two named locations (Tidal Terror), and the location
 * farthest from all investigators (The Man in the Pallid Mask).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { Ability, CardDef, Effect } from "../../content/schema";
import type { Result } from "../index";
import { card, placeInvestigator, type GameContext } from "../context";
import { addLocation, enemyHere, game, inject, inPlay, neutral, toTurn } from "../kits/driver";
import { db, gOf, locId, options, pick } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { spawnTargets } from "../queries";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import type { ContentDb } from "../world/types";
import { implemented } from "../../content/implemented";

const R = "01001";
const D = "01002";
const STUDY = "01111";
const POLTERGEIST = "03093";
const HASTUR = "03332";
const EMISSARY = "03060";
const saved: { hastur?: Ability[]; poltergeist?: CardDef["damageOnlyFrom"] } = {};

beforeAll(async () => {
  await loadPack("ptc");
  // "Cannot be damaged except by [[Spell]], [[Relic]], or encounter cards.", as its data will write it
  saved.poltergeist = db.cards[POLTERGEIST].damageOnlyFrom;
  db.cards[POLTERGEIST].damageOnlyFrom = { traits: ["Spell", "Relic"], encounter: true };
  saved.hastur = db.cards[HASTUR].abilities;
  // "Forced - At the beginning of the enemy phase, if Hastur is ready: Hastur attacks each investigator, in player order"
  db.cards[HASTUR].abilities = [
    {
      kind: "forced",
      trigger: "phaseBegins",
      condition: { all: [{ phase: "enemy" }, { exhausted: false }] },
      effects: [{ op: "enemyAttack", enemy: "self", target: "each" }],
    },
  ];
});
afterAll(() => {
  db.cards[POLTERGEIST].damageOnlyFrom = saved.poltergeist;
  db.cards[HASTUR].abilities = saved.hastur!;
});

const start = (prep: (game: GameContext) => void, investigators = [R]) =>
  game({ investigators, bag: ["0"], prep });
const step = (r: Result, s: Parameters<typeof inject>[2]) =>
  toTurn(
    inject(r, () => {}, s),
    R,
  );
const run = (r: Result, e: Effect) =>
  step(r, { t: STEP.Eff, effect: e, ctx: { you: R, inv: R, source: null } });

describe("damage only from named sources", () => {
  it("Poltergeist takes no damage from a Machete or a bare-handed attack, but from a Spell asset or an encounter card", () => {
    let p = "";
    let machete = "";
    let spell = "";
    let treachery = "";
    const r = start((g) => {
      p = enemyHere(g, R, POLTERGEIST);
      machete = inPlay(g, R, "01020");
      spell = inPlay(g, R, "01060"); // Shrivelling
      treachery = createCard(g, "01163", ZONE.Limbo); // Rotting Remains
    });
    const hit = (source: string | null) =>
      card(gOf(step(r, { t: STEP.DamageEnemy, enemy: p, amount: 1, source, by: null })), p).damage;
    expect(hit(machete)).toBe(0);
    expect(hit(null)).toBe(0);
    expect(hit(spell)).toBe(1);
    expect(hit(treachery)).toBe(1);
  });

  it("the printed line is accounted for by the data", () => {
    const only = (field: object) =>
      implemented(
        {
          cards: {
            x: {
              code: "x",
              type: "enemy",
              text: "Cannot be damaged except by [[Spell]], [[Relic]], or encounter cards.",
              abilities: [],
              keywords: [],
              ...field,
            },
          },
          scripts: {},
        } as unknown as ContentDb,
        "x",
      );
    expect(only({ damageOnlyFrom: { traits: ["Spell", "Relic"], encounter: true } })).toBe(true);
    expect(only({})).toBe(false);
  });
});

describe("an enemy at no location", () => {
  it("The King in Yellow attacks every investigator at the beginning of the enemy phase, and no one can fight him", () => {
    let hastur = "";
    let r = start(
      (g) => {
        hastur = createCard(g, HASTUR, ZONE.Limbo);
        moveCard(g, hastur, ZONE.Enemy, { location: null });
      },
      [R, D],
    );
    expect(card(gOf(r), hastur).location).toBeNull();
    // his own [action] (a willpower test to exhaust him) is offered, not a fight
    expect(options(r).filter((o) => /Hastur/.test(o) && !/willpower/.test(o))).toEqual([]);
    // every turn ended, into the enemy phase: Hastur attacks each of them, Roland first
    while (r.state.phase !== "enemy" && r.state.pending)
      r = r.state.pending.kind === "turn" ? pick(r, "End turn") : neutral(r);
    r = toTurn(r);
    const attacked = r.state.log
      .filter((e) => e.type === "attack" && e.card === hastur)
      .map((e) => e.inv);
    expect(attacked.slice(0, 2)).toEqual([R, D]);
  });
});

describe("spawns", () => {
  it("spawnSetAside with orVictory: Royal Emissary comes back from the victory display", () => {
    let em = "";
    const r = run(
      start((g) => {
        em = createCard(g, EMISSARY, ZONE.Limbo);
        moveCard(g, em, ZONE.Victory);
      }),
      { op: "spawnSetAside", code: EMISSARY, at: "Study", orVictory: true },
    );
    expect(card(gOf(r), em).zone).toBe(ZONE.Enemy);
    expect(card(gOf(r), em).location).toBe(locId(gOf(r), STUDY));
    const not = run(
      start((g) => moveCard(g, createCard(g, EMISSARY, ZONE.Limbo), ZONE.Victory)),
      { op: "spawnSetAside", code: EMISSARY, at: "Study" },
    );
    expect(gOf(not).s.log.some((e) => e.type === "spawn")).toBe(false);
  });

  it("one of two named locations: Tidal Terror's spawn (an `or` of names)", () => {
    const g = gOf(
      start((x) => {
        addLocation(x, "01112", [[STUDY, "01112"]]);
        addLocation(x, "01113", [["01112", "01113"]]);
      }),
    );
    expect(
      spawnTargets(g, { or: [{ name: "Study" }, { name: "Attic" }] }, null).map(
        (l) => card(g, l).code,
      ),
    ).toEqual([STUDY, "01113"]);
  });

  it("the location farthest from all investigators", () => {
    const g = gOf(
      start(
        (x) => {
          addLocation(x, "01112", [[STUDY, "01112"]]);
          addLocation(x, "01113", [["01112", "01113"]]);
          addLocation(x, "01114", [["01112", "01114"]]);
          // Daisy in the Cellar: the Attic is 2 from each of them, the Hallway 1, the Study 0 and 2
          placeInvestigator(x, D, locId(x, "01114"));
        },
        [R, D],
      ),
    );
    expect(
      spawnTargets(g, { farthest: true, to: "investigators" }, null).map((l) => card(g, l).code),
    ).toEqual(["01113"]);
  });
});
