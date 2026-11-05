/** The Unspeakable Oath (campaign-the-path-to-carcosa, group 5): setup, tokens, map, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, type Result } from "../index";
import { db, gOf, options, pick, putEnemy, skipMulligans } from "../kits/testkit";
import { game, inject, inPlay, lastTest, move, toTurn, until } from "../kits/driver";
import { canMoveTo } from "../rules/investigators";
import { connections, enemies, enemyStat, findByCode, hasFlag } from "../queries";
import {
  allCards,
  card,
  cardsBeneath,
  currentAct,
  currentAgenda,
  inv,
  placeInvestigator,
  reveal,
  setCounter,
  setController,
  tokensOn,
  type GameContext,
} from "../context";
import { createCard, moveCard, putBeneath } from "../movement";
import * as flags from "../world/flags";
import { rememberedFact, insane } from "../world/flags";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry } from "../campaign/log";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002";
const WEST = ["03168", "03169"];
const EAST = ["03170", "03171"];
const KITCHEN = "03172";
const MESS = "03173";
const INFIRMARY = "03174";
const YARD = "03175";
const GARDEN = "03176";
const BASEMENT = "03177";
const CELLS = ["03178", "03179", "03180", "03181"];
const DANIEL = "03182a";
const MONSTERS = ["03088", "03089", "03089", "03183", "03183", "01175", "01175"];
const POSSESSED = ["03095", "03095", "03096", "03096", "03184", "03184", "03184"];
const CONSTANCE = "03065b";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const setupOf = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
}: Opts) => ({
  campaignId: "the-path-to-carcosa",
  scenarioId: "the-unspeakable-oath",
  difficulty,
  seed,
  chaosBag: bag,
  campaignLog: log,
  investigators: invs.map((code) => ({
    code,
    deck: db.decks[code === R ? "roland-starter" : "daisy-starter"]
      ? Object.entries(db.decks[code === R ? "roland-starter" : "daisy-starter"].cards).flatMap(
          ([c, n]) => Array<string>(n).fill(c),
        )
      : [],
  })),
});
const tuo = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
  prep,
}: Opts = {}) =>
  game({
    scenario: "the-unspeakable-oath",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-path-to-carcosa", campaignLog: log, difficulty },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const testOf = (skill: "willpower" | "intellect", difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill, difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
const setAside = (game: GameContext) =>
  allCards(game)
    .filter((c) => c.zone === ZONE.SetAside)
    .map((c) => c.code)
    .sort();
const beneathAct = (game: GameContext) =>
  cardsBeneath(game, currentAct(game)!).map((id) => card(game, id).code);
/** Roland at a revealed location of this code */
const visit = (game: GameContext, code: string, who = R) => {
  const at = loc(game, code)!;
  reveal(game, at);
  placeInvestigator(game, who, at);
  return at;
};
function toAct(game: GameContext, code: string) {
  moveCard(game, currentAct(game)!, ZONE.Removed);
  // past act 2, neither version is left in the deck
  if (code >= "03166")
    for (const c of allCards(game).filter((x) => ["03164", "03165"].includes(x.code)))
      moveCard(game, c.id, ZONE.Removed);
  const next = findByCode(game, code, [ZONE.ActDeck]) ?? { id: createCard(game, code, ZONE.Limbo) };
  moveCard(game, next.id, ZONE.Act, { deck: "a" });
}
function toAgenda(game: GameContext, code: string) {
  moveCard(game, currentAgenda(game)!, ZONE.Removed);
  moveCard(game, findByCode(game, code, [ZONE.AgendaDeck])!.id, ZONE.Agenda, { deck: "a" });
}
const toEnd = (r: Result) => until(r, () => false, 400);

// ---------- 5.1 setup ----------
describe("setup", () => {
  it("one Western and one Eastern Asylum Halls, the other copies out; the six other locations in play", () => {
    const g = gOf(tuo());
    expect(WEST.filter((c) => loc(g, c))).toHaveLength(1);
    expect(EAST.filter((c) => loc(g, c))).toHaveLength(1);
    for (const c of [KITCHEN, MESS, INFIRMARY, YARD, GARDEN, BASEMENT])
      expect(loc(g, c)).toBeDefined();
    expect([...WEST, ...EAST].filter((c) => findByCode(g, c, [ZONE.Removed]))).toHaveLength(2);
  });

  it("the Monster pile and the Possessed pile set aside, out of the deck; Daniel and the Patient Confinements; Constance unless slain", () => {
    const g = gOf(tuo());
    const aside = setAside(g);
    for (const c of [...MONSTERS, ...POSSESSED, DANIEL, ...CELLS, CONSTANCE])
      expect(aside).toContain(c);
    expect(aside.filter((c) => c === "03089")).toHaveLength(2);
    expect(aside.filter((c) => c === "03184")).toHaveLength(3);
    const deck = allCards(g).filter((c) => c.zone === ZONE.EncounterDeck);
    expect(deck.some((c) => [...MONSTERS, ...POSSESSED].includes(c.code))).toBe(false);
    expect(setAside(gOf(tuo({ log: { [CONSTANCE]: true } })))).not.toContain(CONSTANCE);
  });

  it("each investigator begins at the Asylum Halls of their choice (asked on their first turn)", () => {
    let r = skipMulligans(createGame(db, setupOf({ invs: [R, D] })));
    r = until(r, (x) => /Asylum Halls/.test(x.state.pending?.prompt ?? ""));
    const east = r.state.pending!.options.find((o) =>
      EAST.includes(codeOf(gOf(r), o.value as string)!),
    );
    r = pick(r, east!.id);
    r = toTurn(r, R);
    expect(EAST).toContain(codeOf(gOf(r), inv(gOf(r), R).location));
  });

  it("act 2 is version I if the clasp was taken, else version II", () => {
    const version = (log: Record<string, unknown>) => {
      const g = gOf(tuo({ log }));
      return allCards(g)
        .filter((c) => ["03164", "03165"].includes(c.code) && c.zone === ZONE.ActDeck)
        .map((c) => c.code);
    };
    expect(version({ tookOnyxClasp: true })).toEqual(["03164"]);
    expect(version({})).toEqual(["03165"]);
  });

  it("Constance interviewed: each investigator's top card is a Courage asset taking 2 horror for them", () => {
    let r = tuo({ log: { "03076a": true } });
    const g = gOf(r);
    expect(tokensOn(g, R, "courage")).toBe(2);
    expect(cardsBeneath(g, inv(g, R).cardId)).toHaveLength(1);
    r = run(r, { t: STEP.AssignDamage, inv: R, damage: 0, horror: 3, direct: false, source: null });
    const g2 = gOf(r);
    expect(inv(g2, R).horror).toBe(1);
    expect(tokensOn(g2, R, "courage")).toBe(0);
    expect(cardsBeneath(g2, inv(g2, R).cardId)).toHaveLength(0);
  });
});

// ---------- 5.2 tokens ----------
describe("chaos tokens", () => {
  const draw = (bag: ChaosToken[], difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(tuo({ bag, difficulty, prep }), testOf("willpower", against));

  it("skull −1, a failure places a random set-aside Monster beneath the act deck", () => {
    expect(beneathAct(gOf(draw(["skull"], "standard", 0)))).toHaveLength(0);
    const r = draw(["skull"], "standard", 10);
    expect(mods(r)).toEqual([-1]);
    const under = beneathAct(gOf(r));
    expect(under).toHaveLength(1);
    expect(MONSTERS).toContain(under[0]);
  });

  it("Hard skull: reveal another, once per test", () => {
    const r = draw(["skull", "skull", "-1"], "hard", 10);
    expect(r.state.log.filter((e) => e.type === "token").length).toBe(2);
    expect(beneathAct(gOf(r))).toHaveLength(1);
  });

  it("cultist −X, the horror on you; Hard: a failure takes 1 horror", () => {
    const horror = (game: GameContext) => setCounter(game, R, "horror", 2);
    expect(mods(draw(["cultist"], "standard", 0, horror))).toEqual([-2]);
    expect(inv(gOf(draw(["cultist"], "hard", 10, horror)), R).horror).toBe(3);
  });

  it("tablet −X, the printed shroud of your location", () => {
    const atYard = (game: GameContext) => (visit(game, YARD), setCounter(game, R, "horror", 2));
    expect(mods(draw(["tablet"], "standard", 0, atYard))).toEqual([-1]);
  });

  it("elder thing 0: a Monster beneath the act deck, or the test fails; with no Monster left it fails", () => {
    let r = inject(tuo({ bag: ["elderThing"] }), () => {}, testOf("willpower", 0));
    r = until(r, (x) => (x.state.pending?.options ?? []).some((o) => /Monster/.test(o.label)));
    r = toTurn(pick(r, /Monster/), R);
    expect(lastTest(r)?.success).toBe(true);
    expect(beneathAct(gOf(r))).toHaveLength(1);
    const none = run(
      tuo({
        bag: ["elderThing"],
        prep: (g) => {
          for (const c of allCards(g).filter(
            (x) => x.zone === ZONE.SetAside && MONSTERS.includes(x.code),
          ))
            moveCard(g, c.id, ZONE.Removed);
        },
      }),
      testOf("willpower", 0),
    );
    expect(lastTest(none)?.success).toBe(false);
  });
});

// ---------- 5.5 connections ----------
describe("connections", () => {
  it("the guide's map: Garden–Yard–Western Halls; Kitchen–Mess Hall–Western Halls; Western–Eastern; Eastern to Infirmary and Basement Hall", () => {
    const g = gOf(tuo());
    const west = WEST.find((c) => loc(g, c))!;
    const east = EAST.find((c) => loc(g, c))!;
    const links = (c: string) =>
      connections(g, loc(g, c)!)
        .map((id) => card(g, id).code)
        .sort();
    expect(links(GARDEN)).toEqual([YARD]);
    expect(links(YARD)).toEqual([GARDEN, west].sort());
    expect(links(KITCHEN)).toEqual([MESS]);
    expect(links(MESS)).toEqual([KITCHEN, west].sort());
    expect(links(west)).toEqual([YARD, MESS, east].sort());
    expect(links(east)).toEqual([west, INFIRMARY, BASEMENT].sort());
  });

  it("the Basement Hall revealed puts the four Patient Confinements into play, each connected to it", () => {
    const r0 = tuo();
    const g = gOf(run(r0, { t: STEP.RevealLocation, location: loc(gOf(r0), BASEMENT)! }));
    for (const c of CELLS)
      expect(connections(g, loc(g, c)!).map((id) => codeOf(g, id))).toEqual([BASEMENT]);
  });
});

// ---------- 5.3 the scenario ----------
describe("locked doors and the cells", () => {
  it("the Kitchen, Garden and Basement Hall can't be entered unrevealed until act 2", () => {
    const at = (act: string | null) =>
      gOf(
        tuo({
          prep: (g) => {
            if (act) toAct(g, act);
            placeInvestigator(g, R, loc(g, MESS)!);
          },
        }),
      );
    let g = at(null);
    expect(canMoveTo(g, R, loc(g, KITCHEN)!)).toBe(false);
    g = at("03165");
    expect(canMoveTo(g, R, loc(g, KITCHEN)!)).toBe(true);
  });

  it("a Patient Confinement costs the entering investigator 1 clue while unrevealed", () => {
    const prep = (clues: number) => (game: GameContext) => {
      toAct(game, "03165");
      const b = visit(game, BASEMENT);
      for (const c of CELLS)
        moveCard(game, findByCode(game, c, [ZONE.SetAside])!.id, ZONE.Location);
      placeInvestigator(game, R, b);
      setCounter(game, R, "clues", clues);
    };
    const g0 = gOf(tuo({ prep: prep(0) }));
    expect(canMoveTo(g0, R, loc(g0, "03180")!)).toBe(false);
    const r = move(tuo({ prep: prep(1) }), "03180");
    expect(inv(gOf(r), R).clues).toBe(0);
  });

  /** act 2 (`version`) current, Roland in Daniel's Cell, a Monster beneath the act deck; the cell is then revealed */
  const atTheCell = (version: string) => {
    const r0 = tuo({
      log: version === "03164" ? { tookOnyxClasp: true } : {},
      prep: (g) => {
        toAct(g, version);
        const cell = findByCode(g, "03178", [ZONE.SetAside])!.id;
        moveCard(g, cell, ZONE.Location);
        placeInvestigator(g, R, cell);
        const m = allCards(g).find((c) => c.zone === ZONE.SetAside && c.code === "03183")!;
        moveCard(g, m.id, ZONE.Limbo);
        putBeneath(g, m.id, currentAct(g)!);
      },
    });
    return run(r0, { t: STEP.RevealLocation, location: loc(gOf(r0), "03178")! });
  };

  it("Daniel's Cell revealed advances act 2; v.I: Daniel joins an investigator there and the enemies beneath the act are shuffled in", () => {
    const g = gOf(atTheCell("03164"));
    expect(codeOf(g, currentAct(g))).toBe("03166");
    expect(card(g, findByCode(g, DANIEL)!.id)).toMatchObject({ zone: ZONE.Play, controller: R });
    expect(findByCode(g, "03183", [ZONE.EncounterDeck])).toBeDefined();
  });

  it("v.II: Daniel spawns at his cell, enemy side up", () => {
    const g = gOf(atTheCell("03165"));
    expect(codeOf(g, currentAct(g))).toBe("03166");
    const daniel = enemies(g).find((e) => e.code === "03182b");
    expect(codeOf(g, daniel?.location)).toBe("03178");
  });
});

describe("the acts", () => {
  it("1b: a failed test asks again among the options left; knocking her over remembers that you took the keys by force", () => {
    let r = inject(tuo({ bag: ["-8"] }), () => {}, { t: STEP.AdvanceAct });
    r = until(r, (x) => /must decide/.test(x.state.pending?.prompt ?? ""));
    expect(options(r)).toHaveLength(4);
    r = pick(r, /intimidate/);
    r = until(r, (x) => /must decide/.test(x.state.pending?.prompt ?? ""));
    expect(options(r)).toHaveLength(3);
    expect(options(r).some((o) => /intimidate/.test(o))).toBe(false);
    r = toTurn(pick(r, /knock her over/), R);
    const g = gOf(r);
    expect(rememberedFact.get(g, "tookTheKeysByForce")).toBe(true);
    expect(codeOf(g, currentAct(g))).toBe("03165");
  });

  it("1b: a successful test advances without force", () => {
    let r = inject(tuo({ bag: ["+1"] }), () => {}, { t: STEP.AdvanceAct });
    r = until(r, (x) => /must decide/.test(x.state.pending?.prompt ?? ""));
    r = toTurn(pick(r, /intimidate/), R);
    const g = gOf(r);
    expect(rememberedFact.get(g, "tookTheKeysByForce")).toBeFalsy();
    expect(codeOf(g, currentAct(g))).toBe("03165");
  });

  it("3: four of the six plans advance it; its back shuffles the enemies beneath it in, and with 3 Monsters one is drawn", () => {
    let r = tuo({
      bag: ["+1"],
      prep: (g) => {
        toAct(g, "03166");
        for (const f of ["setAFireInTheKitchen", "distractedTheGuards", "recalledTheWayOut"])
          rememberedFact.set(g, f, true);
        const kitchen = visit(g, KITCHEN);
        setCounter(g, kitchen, "clues", 0);
        for (const code of ["03183", "03089", "01175"]) {
          const m = allCards(g).find((c) => c.zone === ZONE.SetAside && c.code === code)!;
          moveCard(g, m.id, ZONE.Limbo);
          putBeneath(g, m.id, currentAct(g)!);
        }
      },
    });
    r = toTurn(pick(r, /Kitchen: set a fire/), R);
    expect(codeOf(gOf(r), currentAct(gOf(r)))).toBe("03166"); // a fact already remembered: still three
    r = toTurn(
      inject(r, (g) => rememberedFact.set(g, "knowTheGuardsPatrols", true), {
        t: STEP.CheckObjectives,
      }),
      R,
    );
    const g = gOf(r);
    expect(codeOf(g, currentAct(g))).toBe("03167");
    expect(enemies(g).some((e) => MONSTERS.includes(e.code))).toBe(true);
  });

  it("4: the Garden can be resigned from while no ready enemy is there; everyone gone: R3, or R2 if the keys were taken by force", () => {
    const at = (force: boolean, prep?: (game: GameContext) => void) =>
      tuo({
        prep: (game) => {
          toAct(game, "03167");
          visit(game, GARDEN);
          if (force) rememberedFact.set(game, "tookTheKeysByForce", true);
          prep?.(game);
        },
      });
    expect(options(at(false)).some((o) => /Garden: resign/.test(o))).toBe(true);
    expect(
      options(at(false, (g) => void putEnemy(g, "01160", loc(g, GARDEN)!))).some((o) =>
        /Garden: resign/.test(o),
      ),
    ).toBe(false);
    expect(toEnd(pick(at(false), /Garden: resign/)).state.resolution).toBe("R3");
    expect(toEnd(pick(at(true), /Garden: resign/)).state.resolution).toBe("R2");
    // not before act 4
    const early = tuo({ prep: (g) => void visit(g, GARDEN) });
    expect(options(early).some((o) => /Garden: resign/.test(o))).toBe(false);
  });
});

describe("the agendas", () => {
  it("1b: the Possessed pile and the discard pile into the encounter deck; a Monster beneath the act deck", () => {
    const r = run(tuo(), { t: STEP.AdvanceAgenda });
    const g = gOf(r);
    expect(setAside(g).some((c) => POSSESSED.includes(c))).toBe(false);
    expect(
      allCards(g).filter((c) => c.zone === ZONE.EncounterDeck && c.code === "03184"),
    ).toHaveLength(3);
    expect(beneathAct(g)).toHaveLength(1);
  });

  it("2b: a Monster shuffled into the encounter deck; Constance spawns in the Garden unless slain", () => {
    const g = gOf(run(tuo({ prep: (g) => toAgenda(g, "03161") }), { t: STEP.AdvanceAgenda }));
    expect(setAside(g).filter((c) => MONSTERS.includes(c))).toHaveLength(6);
    expect(codeOf(g, enemies(g).find((e) => e.code === CONSTANCE)?.location)).toBe(GARDEN);
    const slain = gOf(
      run(tuo({ log: { [CONSTANCE]: true }, prep: (g) => toAgenda(g, "03161") }), {
        t: STEP.AdvanceAgenda,
      }),
    );
    expect(enemies(slain).some((e) => e.code === CONSTANCE)).toBe(false);
  });

  it("3: an enemy that would go beneath the act deck is shuffled into the encounter deck instead", () => {
    const r = run(
      tuo({ bag: ["skull"], prep: (g) => toAgenda(g, "03162") }),
      testOf("willpower", 10),
    );
    const g = gOf(r);
    expect(beneathAct(g)).toHaveLength(0);
    expect(setAside(g).filter((c) => MONSTERS.includes(c))).toHaveLength(6);
  });

  it("3b: each investigator who has not resigned is defeated; no one resigned: no resolution", () => {
    const r = toEnd(
      inject(tuo({ prep: (g) => toAgenda(g, "03162") }), () => {}, { t: STEP.AdvanceAgenda }),
    );
    expect(r.state.resolution).toBe("none");
  });
});

describe("cards", () => {
  function draw(r: Result, c: string): Result {
    let id = "";
    const made = inject(r, (g) => {
      id = createCard(g, c, ZONE.EncounterDeck);
    });
    return inject(made, () => {}, { t: STEP.DrawEncounter, inv: R, card: id });
  }

  it("03169 Asylum Halls: Possessed enemies there get +1 horror", () => {
    let e = "";
    const g = gOf(
      tuo({
        prep: (g) => {
          const hall = createCard(g, "03169", ZONE.Limbo);
          moveCard(g, hall, ZONE.Location);
          reveal(g, hall);
          e = putEnemy(g, "03184", hall);
        },
      }),
    );
    expect(enemyStat(g, e, "horror")).toBe(1);
  });

  const atHall = (code: string, prep?: (game: GameContext, hall: string) => void) =>
    tuo({
      bag: ["+1"],
      prep: (game) => {
        const hall = createCard(game, code, ZONE.Limbo);
        moveCard(game, hall, ZONE.Location);
        reveal(game, hall);
        placeInvestigator(game, R, hall);
        prep?.(game, hall);
      },
    });

  it("03168 Asylum Halls: after you defeat a Possessed enemy there, draw 1 card", () => {
    let r = atHall("03168", (game, hall) => {
      const e = putEnemy(game, "03184", hall, R);
      setCounter(game, e, "damage", 1);
    });
    const before = inv(gOf(r), R).hand.length;
    r = pick(r, /Fight Haunted Patient/);
    r = until(r, (x) =>
      /Asylum Halls: draw/.test(x.state.pending?.options.map((o) => o.label).join() ?? ""),
    );
    r = toTurn(pick(r, /Asylum Halls: draw/), R);
    expect(inv(gOf(r), R).hand.length).toBe(before + 1);
  });

  it("03170 Asylum Halls: take 1 horror to evade a Possessed enemy there automatically", () => {
    let r = atHall("03170", (game, hall) => void putEnemy(game, "03184", hall, R));
    r = toTurn(pick(r, /evade a Possessed enemy/), R);
    const g = gOf(r);
    expect(inv(g, R).horror).toBe(1);
    expect(enemies(g).find((e) => e.code === "03184")?.engagedWith).toBeFalsy();
  });

  it("03173 Mess Hall: after you successfully investigate it, discard 1 card from your hand", () => {
    let r = atHall("03173");
    const before = inv(gOf(r), R).hand.length;
    r = toTurn(pick(r, /^Investigate/), R);
    expect(inv(gOf(r), R).hand.length).toBe(before - 1);
  });

  it("03171 Asylum Halls: ending your turn there takes 1 horror and gains 2 resources", () => {
    const r = tuo({
      prep: (g) => {
        const hall = createCard(g, "03171", ZONE.Limbo);
        moveCard(g, hall, ZONE.Location);
        reveal(g, hall);
        placeInvestigator(g, R, hall);
      },
    });
    const after = until(pick(r, "End turn"), (x) => x.state.phase !== "investigation");
    const lines = after.state.log.map((e) => e.text);
    const ended = lines.lastIndexOf("Enemy phase (round 1)");
    expect(lines.slice(0, ended)).toEqual(
      expect.arrayContaining([
        "Roland Banks takes 0 damage and 1 horror",
        "Roland Banks gains 2 resources",
      ]),
    );
  });

  it("03174 Infirmary: heal 1 damage and take 1 direct horror, once per round", () => {
    let r = tuo({ prep: (g) => (visit(g, INFIRMARY), setCounter(g, R, "damage", 2)) });
    r = toTurn(pick(pick(r, /Infirmary: heal/), /Heal 1 damage/), R);
    expect(inv(gOf(r), R)).toMatchObject({ damage: 1, horror: 1 });
    expect(options(r).some((o) => /Infirmary: heal/.test(o))).toBe(false);
  });

  it("03175 Yard: +1 shroud per horror on you while investigating it", () => {
    const r = toTurn(
      pick(
        tuo({ bag: ["0"], prep: (g) => (visit(g, YARD), setCounter(g, R, "horror", 2)) }),
        /^Investigate/,
      ),
      R,
    );
    expect(lastTest(r)).toMatchObject({ difficulty: 3 });
  });

  it("03186 Gift of Madness (Pity): you cannot attack Possessed enemies; its action puts a Monster beneath the act", () => {
    let r = draw(tuo({ prep: (g) => void putEnemy(g, "03184", inv(g, R).location!, R) }), "03186");
    r = toTurn(r, R);
    expect(options(r).some((o) => /Fight Haunted Patient/.test(o))).toBe(false);
    r = toTurn(pick(r, /Gift of Madness \(Pity\)/), R);
    expect(beneathAct(gOf(r))).toHaveLength(1);
    expect(options(r).some((o) => /Fight Haunted Patient/.test(o))).toBe(true);
  });

  it("03187 Gift of Madness (Misery): you cannot trigger [action] abilities on locations", () => {
    const at = (gift: boolean) => {
      const r = tuo({ prep: (g) => (visit(g, INFIRMARY), setCounter(g, R, "damage", 1)) });
      return gift ? toTurn(draw(r, "03187"), R) : r;
    };
    expect(options(at(false)).some((o) => /Infirmary: heal/.test(o))).toBe(true);
    expect(options(at(true)).some((o) => /Infirmary: heal/.test(o))).toBe(false);
  });

  it("03188 Walls Closing In: willpower against your location's shroud; a failure takes horror per point or a Monster beneath", () => {
    let r = draw(tuo({ bag: ["-5"] }), "03188");
    r = until(r, (x) => (x.state.pending?.options ?? []).some((o) => /Monster/.test(o.label)));
    r = toTurn(pick(r, /Monster/), R);
    expect(beneathAct(gOf(r))).toHaveLength(1);
  });

  it("03185 Straitjacket: in the threat area it takes the body and hand slots, returning those assets to hand; [action][action] discards it", () => {
    let gun = "";
    let r = tuo({ prep: (g) => void (gun = inPlay(g, R, "01016")) }); // .45 Automatic: a hand asset
    r = toTurn(draw(r, "03185"), R);
    let g = gOf(r);
    expect(allCards(g).some((c) => c.code === "03185" && c.zone === ZONE.Threat)).toBe(true);
    expect(card(g, gun).zone).toBe(ZONE.Hand);
    r = toTurn(pick(r, /Straitjacket: discard/), R);
    g = gOf(r);
    expect(allCards(g).some((c) => c.code === "03185" && c.zone === ZONE.Threat)).toBe(false);
  });

  it("03182a Daniel Chesterfield: when you take horror not all on him, take 1 damage", () => {
    const r = run(tuo({ prep: (g) => void inPlay(g, R, DANIEL) }), {
      t: STEP.AssignDamage,
      inv: R,
      damage: 0,
      horror: 1,
      direct: true,
      source: null,
    });
    expect(inv(gOf(r), R)).toMatchObject({ horror: 1, damage: 1 });
  });

  it("03182b Daniel Chesterfield: a parley with the clasp under your control adds him to the victory display", () => {
    let e = "";
    const prep = (clasp: boolean) => (game: GameContext) => {
      e = putEnemy(game, "03182b", inv(game, R).location!, R);
      if (clasp) inPlay(game, R, "03142");
    };
    expect(options(tuo({ prep: prep(false) })).some((o) => /show him the clasp/.test(o))).toBe(
      false,
    );
    const r = toTurn(pick(tuo({ prep: prep(true) }), /show him the clasp/), R);
    expect(card(gOf(r), e).zone).toBe(ZONE.Victory);
  });

  it("03183 Asylum Gorger: no attacks of opportunity; no attack in the enemy phase it hunted in", () => {
    let e = "";
    const r0 = tuo({
      prep: (g) => {
        e = putEnemy(g, "03183", loc(g, YARD)!);
        visit(g, GARDEN);
      },
    });
    expect(hasFlag(gOf(r0), e, "noAttacksOfOpportunity")).toBe(true);
    const r = until(pick(r0, "End turn"), (x) => x.state.round === 2);
    const g = gOf(r);
    expect(codeOf(g, card(g, e).location)).toBe(GARDEN);
    expect(inv(g, R).damage).toBe(0);
  });

  it("03184 Haunted Patient: attacking it takes 1 horror", () => {
    const r = toTurn(
      pick(
        tuo({ bag: ["+1"], prep: (g) => void putEnemy(g, "03184", inv(g, R).location!, R) }),
        /Fight Haunted Patient/,
      ),
      R,
    );
    expect(inv(gOf(r), R).horror).toBe(1);
  });

  it("03088 Beast of Aldebaran: its attack's damage and horror go to one card as far as it can take them", () => {
    let r = inject(
      tuo({ prep: (g) => void inPlay(g, R, "01117") }), // Lita Chantler: 3 health, 3 sanity
      (g) => void putEnemy(g, "03088", inv(g, R).location!, R),
    );
    const beast = enemies(gOf(r)).find((e) => e.code === "03088")!.id;
    r = inject(r, () => {}, {
      t: STEP.AssignDamage,
      inv: R,
      damage: 2,
      horror: 1,
      direct: false,
      source: beast,
      enemy: beast,
    });
    r = pick(r, /Lita/);
    expect(r.state.pending?.options.every((o) => /Lita/.test(o.label))).toBe(true);
  });

  it("03089 Spawn of Hali: prey the most horror; evading it by 2 or less takes 1 horror", () => {
    const r = toTurn(
      pick(
        tuo({ bag: ["+1"], prep: (g) => void putEnemy(g, "03089", inv(g, R).location!, R) }),
        /Evade Spawn of Hali/,
      ),
      R,
    );
    expect(lastTest(r)?.success).toBe(true);
    expect(inv(gOf(r), R).horror).toBe(1);
  });
});

// ---------- 5.6 the end ----------
describe("the end of the game", () => {
  it("records the defeated as insane, Constance in the victory display, and Daniel's fate", () => {
    const r = toEnd(
      inject(
        tuo({
          invs: [R, D],
          prep: (g) => {
            moveCard(g, findByCode(g, CONSTANCE, [ZONE.SetAside])!.id, ZONE.Victory);
            const d = findByCode(g, DANIEL, [ZONE.SetAside])!.id;
            moveCard(g, d, ZONE.Play);
            setController(g, d, R);
          },
        }),
        () => {},
        { t: STEP.Defeated, inv: D, by: "effect" },
        { t: STEP.Defeated, inv: R, by: "resign" },
      ),
    );
    const g = gOf(r);
    expect(r.state.resolution).toBe("R3");
    expect(insane.get(g, D)).toBe(true);
    expect(insane.get(g, R)).toBeFalsy();
    expect(r.state.flags[`log:vipsSlain:${CONSTANCE}`]).toBe(true);
    expect(r.state.flags["log:hidden:danielSurvived"]).toBe(true);
  });
});

describe("the campaign", () => {
  function walk(c: CampaignState): CampaignState {
    for (let k = 0; k < 80 && c.flow.waiting; k++) {
      const st = c.flow.waiting.step;
      if (st.kind === "play") break;
      const value =
        st.kind === "chooseOne"
          ? st.choices[0].id
          : st.kind === "investigatorChoice" || st.kind === "investigator"
            ? c.investigators[0].code
            : st.kind === "upgradeDecks" || st.kind === "continue"
              ? "continue"
              : null;
      c = advance(db, c, value);
    }
    return c;
  }
  function finish(c: CampaignState, resolution: string, fn: (game: GameContext) => void) {
    let r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c, 1))));
    r = inject(r, fn, { t: STEP.Resolution, id: resolution });
    return applyScenarioEnd(db, c, r.state);
  }
  /** at The Unspeakable Oath, on Hard: Curtain Call R1, The Last King R1, Interlude I, Echoes R1 (the clasp taken) */
  const atOath = (invs = [R]) => {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-path-to-carcosa",
        difficulty: "hard",
        seed: 2,
        investigators: invs.map((code) => ({
          code,
          deckId: code === R ? "roland-starter" : "daisy-starter",
        })),
      }),
    );
    for (let k = 0; k < 3; k++) c = walk(finish(c, "R1", () => {}));
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-unspeakable-oath" });
    return c;
  };

  it("the difficulty token stays in the bag for the rest of the campaign; act 2 is version I", () => {
    const c = atOath();
    const setup = scenarioSetup(db, c, 1);
    expect(setup.chaosBag!.filter((t) => t === "-4").length).toBeGreaterThan(0);
    const g = gOf(toTurn(skipMulligans(createGame(db, setup))));
    expect(allCards(g).some((x) => x.code === "03164" && x.zone === ZONE.ActDeck)).toBe(true);
    const n = c.chaosBag.filter((t) => t === "-4").length;
    const after = walk(finish(c, "R3", () => {}));
    expect(after.chaosBag.filter((t) => t === "-4").length).toBe(n);
  });

  it("no prompt for Constance or Daniel: R3 escapes, Interlude II reads that Daniel survived", () => {
    const c0 = atOath();
    const xp0 = c0.investigators[0].xp;
    const c = walk(
      finish(c0, "R3", (g) => flags.logEntry.set(g, ["hidden", "danielSurvived"], true)),
    );
    expect(hasEntry(c.log, "escapedTheAsylum", "campaign_notes")).toBe(true);
    expect(c.investigators[0].xp).toBeGreaterThanOrEqual(xp0 + 2);
    expect(JSON.stringify(c.flow)).not.toMatch(/prompt_constance|daniel_choice/);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "a-phantom-of-truth" });
  });

  it("no resolution: the defeated are driven insane, and with no one left the campaign is lost", () => {
    const c = walk(finish(atOath(), "none", (g) => flags.insane.set(g, R, true)));
    expect(c.investigators[0].status).toBe("insane");
    expect(c.result).toBe("lose");
  });
});
