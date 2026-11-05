/** Undimensioned and Unseen (campaign-the-dunwich-legacy, group 6): setup, tokens, the map, cards, acts and agendas, the campaign. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, dispatch, type Result } from "../index";
import { next } from "../world/rng";
import {
  db,
  deckCodes,
  gOf,
  mutate,
  options,
  pick,
  putEnemy,
  skipMulligans,
} from "../kits/testkit";
import { game, inject, inPlay, lastTest, offered, toTurn, until, use } from "../kits/driver";
import { cardsIn, connections, enemies, enemyStat, findByCode, locations } from "../queries";
import {
  card,
  currentAct,
  currentAgenda,
  exhaust,
  inv,
  placeInvestigator,
  reveal,
  setCardLocation,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry, logCount } from "../campaign/log";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const BROOD = "02255";
const FORMULA = "02254";
const PAIRS: [string, string, string][] = [
  ["Dunwich Village", "02242", "02243"],
  ["Cold Spring Glen", "02244", "02245"],
  ["Ten-Acre Meadow", "02246", "02247"],
  ["Blasted Heath", "02248", "02249"],
  ["Whateley Ruins", "02250", "02251"],
  ["Devil's Hop Yard", "02252", "02253"],
];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  sacrificed?: string[];
  log?: Record<string, unknown>;
  powder?: boolean;
  prep?: (game: GameContext) => void;
}
const uau = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  sacrificed = [],
  log = {},
  powder = false,
  prep,
}: Opts = {}) =>
  game({
    scenario: "undimensioned-and-unseen",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: {
      campaignId: "the-dunwich-legacy",
      difficulty,
      campaignLog: { ...log, ...(sacrificed.length ? { sacrificed } : {}) },
      ...(powder
        ? {
            investigators: invs.map((code) => ({
              code,
              deck: [...deckCodes(code === R ? "roland-starter" : "daisy-starter"), "02219"],
            })),
          }
        : {}),
    },
  });

/** the location of this name in play */
const named = (game: GameContext, name: string): InstId =>
  locations(game).find((l) => game.db.cards[l.code].name === name)!.id;
/** the locations of a code, put into play in place of the other version of the same name */
function version(game: GameContext, code: string): InstId {
  const there = findByCode(game, code, [ZONE.Location]);
  if (there) {
    reveal(game, there.id);
    return there.id;
  }
  const [name] = PAIRS.find((p) => p.includes(code))!;
  const other = named(game, name);
  const id = createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  game.s.world.tables.cell[id] = game.s.world.tables.cell[other];
  for (const i of game.s.order) if (inv(game, i).location === other) placeInvestigator(game, i, id);
  for (const e of enemies(game)) if (e.location === other) setCardLocation(game, e.id, id);
  moveCard(game, other, ZONE.Removed);
  reveal(game, id);
  return id;
}
const broodIn = (game: GameContext) => enemies(game).filter((e) => e.code === BROOD);
const broodAside = (game: GameContext) =>
  cardsIn(game, ZONE.SetAside).filter((c) => c.code === BROOD);
const at = (r: Result, who = R) => inv(gOf(r), who).location!;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const test = (skill: "willpower" | "agility", difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill, difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
/** a Brood put into play at a location (none of the set-aside ones) */
const broodAt = (game: GameContext, loc: InstId, clues = 0) => {
  const id = putEnemy(game, BROOD, loc, null);
  setCounter(game, id, "clues", clues);
  return id;
};
/** an investigator draws a new copy of an encounter card */
function drawNew(r: Result, code: string, who = R): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.Limbo);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const agendaCode = (r: Result) => card(gOf(r), currentAgenda(gOf(r))!).code;
const actCode = (r: Result) => card(gOf(r), currentAct(gOf(r))!).code;
/** no Brood anywhere: those in play and set aside out of the game */
const noBrood = (game: GameContext) => {
  for (const c of [...broodIn(game), ...broodAside(game)]) moveCard(game, c.id, ZONE.Removed);
};

// ---------- 6.2 setup ----------
describe("setup", () => {
  it("one version of each location at random, the other out of the game; everyone at Dunwich Village", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = uau({ invs: [R, D], seed });
      const g = gOf(r);
      const codes = locations(g).map((l) => l.code);
      expect(codes).toHaveLength(6);
      for (const [, a, b] of PAIRS) {
        expect([a, b].filter((c) => codes.includes(c))).toHaveLength(1);
        const out = codes.includes(a) ? b : a;
        expect(findByCode(g, out)?.zone).toBe(ZONE.Removed);
      }
      codes.forEach((c) => seen.add(c));
      expect(at(r, R)).toBe(named(g, "Dunwich Village"));
      expect(at(r, D)).toBe(named(g, "Dunwich Village"));
      expect(cardsIn(g, ZONE.SetAside).filter((c) => c.code === FORMULA)).toHaveLength(4);
    }
    expect(seen.size).toBeGreaterThan(6);
  });

  it("the Brood by the names sacrificed: 0–1 → 2 in play (Glen, Heath), 3 aside; 2 → 1 + 3; 3 → 1 + 2; 4+ → 0 + 2", () => {
    const count = (sacrificed: string[]) => {
      const g = gOf(uau({ sacrificed }));
      return {
        inPlay: broodIn(g)
          .map((e) => g.db.cards[card(g, e.location!).code].name)
          .sort(),
        aside: broodAside(g).length,
        removed: cardsIn(g, ZONE.Removed).filter((c) => c.code === BROOD).length,
      };
    };
    expect(count([])).toEqual({
      inPlay: ["Blasted Heath", "Cold Spring Glen"],
      aside: 3,
      removed: 0,
    });
    expect(count(["02040"])).toMatchObject({ aside: 3 });
    expect(count(["02040", "02217"])).toEqual({
      inPlay: ["Cold Spring Glen"],
      aside: 3,
      removed: 1,
    });
    // the spec: three names sacrificed, one Brood in play and two set aside
    expect(count(["02040", "02217", "02218"])).toEqual({
      inPlay: ["Cold Spring Glen"],
      aside: 2,
      removed: 2,
    });
    expect(count(["02040", "02061", "02217", "02218"])).toEqual({
      inPlay: [],
      aside: 2,
      removed: 3,
    });
  });

  it("the Powder of Ibn-Ghazi from a deck into play, a clue per survivor", () => {
    const r = uau({
      powder: true,
      log: { earlSawyerSurvived: true, zebulonWhateleySurvived: true },
    });
    const p = findByCode(gOf(r), "02219");
    expect(p?.zone).toBe(ZONE.Play);
    expect(p?.controller).toBe(R);
    expect(p?.clues).toBe(2);
    expect(findByCode(gOf(uau()), "02219")).toBeUndefined();
  });
});

// ---------- 6.3 tokens ----------
describe("chaos tokens", () => {
  const tokenTest = (token: ChaosToken, difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(uau({ bag: [token], difficulty, prep }), test("willpower", against));

  it("easy/standard: skull −1 per Brood in play; hard/expert −2 per Brood", () => {
    for (const d of ["easy", "standard"] as const)
      expect(mods(tokenTest("skull", d))).toEqual([-2]);
    for (const d of ["hard", "expert"] as const) expect(mods(tokenTest("skull", d))).toEqual([-4]);
    expect(mods(tokenTest("skull", "standard", 0, noBrood))[0] + 0).toBe(0);
  });

  it("cultist: another token; failing, 1 horror (Hard: and 1 damage)", () => {
    const easy = run(uau({ bag: ["cultist", "-1"] }), test("willpower", 10));
    expect(lastTest(easy)?.tokens).toHaveLength(2);
    expect(inv(gOf(easy), R).horror).toBe(1);
    expect(inv(gOf(easy), R).damage).toBe(0);
    const hard = run(uau({ bag: ["cultist", "-1"], difficulty: "hard" }), test("willpower", 10));
    expect(inv(gOf(hard), R).horror).toBe(1);
    expect(inv(gOf(hard), R).damage).toBe(1);
  });

  it("tablet: remove all clues from a Brood, or −4 (Hard: automatically fail); with no clues on a Brood, the penalty", () => {
    const withClues = (d: Difficulty) =>
      until(
        inject(
          uau({
            bag: ["tablet"],
            difficulty: d,
            prep: (g) => setCounter(g, broodIn(g)[0].id, "clues", 2),
          }),
          () => {},
          test("willpower", 1),
        ),
        (x) => x.state.pending?.promptKey === "tokenEither",
      );
    const removed = toTurn(pick(withClues("standard"), /Remove all clues/), R);
    expect(mods(removed)).toEqual([0]);
    expect(broodIn(gOf(removed)).every((e) => e.clues === 0)).toBe(true);
    expect(lastTest(removed)?.success).toBe(true);
    const penalty = toTurn(pick(withClues("standard"), /instead/), R);
    expect(mods(penalty)).toEqual([-4]);
    expect(broodIn(gOf(penalty)).some((e) => e.clues === 2)).toBe(true);
    const hard = toTurn(pick(withClues("hard"), /automatically fails/), R);
    expect(lastTest(hard)?.success).toBe(false);
    // nothing to remove: no question, the penalty
    expect(mods(tokenTest("tablet", "standard"))).toEqual([-4]);
    expect(lastTest(tokenTest("tablet", "expert", -10))?.success).toBe(false);
  });

  it("elder thing −3 (Hard −5); revealed fighting or evading a Brood, it attacks you", () => {
    expect(mods(tokenTest("elderThing", "standard"))).toEqual([-3]);
    expect(mods(tokenTest("elderThing", "hard"))).toEqual([-5]);
    expect(inv(gOf(tokenTest("elderThing", "standard")), R).damage).toBe(0);
    // Roland evades a Brood at his location: it attacks him (2 damage, 2 horror)
    const r0 = uau({
      bag: ["elderThing"],
      prep: (g) => void broodAt(g, inv(g, R).location!),
    });
    const brood = broodIn(gOf(r0)).find((e) => e.location === at(r0))!;
    const evaded = toTurn(
      inject(r0, () => {}, {
        t: STEP.Eff,
        effect: { op: "evade" },
        ctx: { you: R, source: null, enemy: brood.id },
      }),
      R,
    );
    expect(inv(gOf(evaded), R).damage + inv(gOf(evaded), R).horror).toBeGreaterThanOrEqual(4);
  });
});

// ---------- 6.4 the map ----------
describe("connections", () => {
  const linked = (game: GameContext, a: string, b: string) =>
    connections(game, named(game, a)).includes(named(game, b));
  it("symmetric, as the placement map draws them, for every version", () => {
    const pairs: [string, string][] = [
      ["Dunwich Village", "Cold Spring Glen"],
      ["Dunwich Village", "Blasted Heath"],
      ["Dunwich Village", "Ten-Acre Meadow"],
      ["Cold Spring Glen", "Ten-Acre Meadow"],
      ["Cold Spring Glen", "Whateley Ruins"],
      ["Ten-Acre Meadow", "Whateley Ruins"],
      ["Blasted Heath", "Devil's Hop Yard"],
      ["Whateley Ruins", "Devil's Hop Yard"],
    ];
    for (const seed of [1, 2, 3, 4]) {
      const g = gOf(uau({ seed }));
      for (const [a, b] of pairs) {
        expect(linked(g, a, b), `${a} → ${b}`).toBe(true);
        expect(linked(g, b, a), `${b} → ${a}`).toBe(true);
      }
      const total = locations(g).reduce((n, l) => n + connections(g, l.id).length, 0);
      expect(total).toBe(pairs.length * 2);
    }
  });
});

// ---------- 6.5 cards ----------
describe("the Brood and Esoteric Formula", () => {
  /** Roland at Dunwich Village with a Brood (2 clues), the Formula and a Machete in play */
  const armed = (bag: ChaosToken[] = ["0"]) =>
    uau({
      bag,
      prep: (g) => {
        broodAt(g, inv(g, R).location!, 2);
        inPlay(g, R, FORMULA);
        inPlay(g, R, "01020");
      },
    });

  it("the spec: willpower +2 per clue on the Brood (+4 with 2), and no Machete or basic attack on it", () => {
    const r = armed();
    expect(options(r).some((o) => /Machete/.test(o))).toBe(false);
    expect(options(r).some((o) => o.startsWith("Fight Brood"))).toBe(false);
    expect(options(r).some((o) => /Esoteric Formula/.test(o))).toBe(true);
    const fought = toTurn(use(r, FORMULA), R);
    const t = lastTest(fought)!;
    expect(t.skill).toBe("willpower");
    expect(t.total).toBe(3 + 4);
  });

  it("the Formula's attack damages it; other damage doesn't", () => {
    const r = armed(["+1"]);
    const brood = broodIn(gOf(r)).find((e) => e.location === at(r))!;
    const fought = toTurn(use(r, FORMULA), R);
    expect(card(gOf(fought), brood.id).damage).toBe(1);
    const other = run(r, { t: STEP.DamageEnemy, enemy: brood.id, amount: 3, by: R, source: null });
    expect(card(gOf(other), brood.id).damage).toBe(0);
  });

  it("Massive, +1 health per investigator", () => {
    const g = gOf(uau({ invs: [R, D] }));
    expect(enemyStat(g, broodIn(g)[0].id, "health")).toBe(3);
  });

  it("the Powder moves a clue to an exhausted Brood here", () => {
    const r = uau({
      powder: true,
      log: { earlSawyerSurvived: true },
      prep: (g) => exhaust(g, broodAt(g, inv(g, R).location!)),
    });
    const after = toTurn(use(r, "02219", 1), R);
    expect(broodIn(gOf(after)).find((e) => e.location === at(after))?.clues).toBe(1);
  });
});

describe("agendas and acts", () => {
  it("each agenda: at the end of the enemy phase, each Brood moves once toward a random location", () => {
    let moved = false;
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = uau({ seed });
      const before = broodIn(gOf(r)).map((e) => e.location);
      const after = run(r, { t: STEP.Window, trigger: "enemyPhaseEnds", data: {} } as Step);
      const now = broodIn(gOf(after)).map((e) => e.location);
      now.forEach((l, k) => {
        if (l !== before[k]) {
          moved = true;
          expect(connections(gOf(after), before[k]!)).toContain(l);
        }
      });
    }
    expect(moved).toBe(true);
  });

  it("agenda 1's back: the discard reshuffled, a set-aside Brood at a random location", () => {
    const r = run(uau(), { t: STEP.AdvanceAgenda });
    expect(agendaCode(r)).toBe("02238");
    expect(broodIn(gOf(r))).toHaveLength(3);
    expect(broodAside(gOf(r))).toHaveLength(2);
  });

  it("agenda 2's back: a Brood at the lead's location; a failed agility (4) and it attacks", () => {
    const r1 = run(uau({ bag: ["autoFail"] }), { t: STEP.AdvanceAgenda });
    const r = run(r1, { t: STEP.AdvanceAgenda });
    expect(agendaCode(r)).toBe("02239");
    expect(broodIn(gOf(r)).filter((e) => e.location === at(r))).toHaveLength(1);
    expect(inv(gOf(r), R).damage).toBe(2);
    expect(inv(gOf(r), R).horror).toBe(2);
  });

  it("agenda 3: Abominations +1 fight and evade; its back is (→R1)", () => {
    const r = run(uau(), { t: STEP.AdvanceAgenda }, { t: STEP.AdvanceAgenda });
    const g = gOf(r);
    expect(enemyStat(g, broodIn(g)[0].id, "fight")).toBe(7);
    expect(enemyStat(g, broodIn(g)[0].id, "evade")).toBe(4);
    const end = until(
      inject(r, () => {}, { t: STEP.AdvanceAgenda }),
      () => false,
      20,
    );
    expect(end.state.resolution).toBe("R1");
  });

  it("act 1: only investigators at Whateley Ruins spend its clues; back: a Formula each, +1 doom if Armitage was sacrificed", () => {
    const at2 = (game: GameContext) => setCounter(game, R, "clues", 2);
    const away = uau({ prep: at2 });
    expect(options(away).some((o) => /Advance act/.test(o))).toBe(false);
    const ruins = uau({
      invs: [R, D],
      sacrificed: ["02040"],
      prep: (g) => {
        placeInvestigator(g, R, named(g, "Whateley Ruins"));
        setCounter(g, R, "clues", 4);
        setCounter(g, D, "clues", 3);
      },
    });
    const advanced = toTurn(pick(ruins, /Advance act/), R);
    const g = gOf(advanced);
    expect(actCode(advanced)).toBe("02241");
    expect(inv(g, R).clues).toBe(0);
    expect(inv(g, D).clues).toBe(3);
    expect(
      cardsIn(g, ZONE.Play)
        .filter((c) => c.code === FORMULA)
        .map((c) => c.controller)
        .sort(),
    ).toEqual([R, D].sort());
    expect(card(g, currentAgenda(g)!).doom).toBe(1);
    const survived = run(uau({ log: { henryArmitageSurvived: true } }), { t: STEP.AdvanceAct });
    expect(card(gOf(survived), currentAgenda(gOf(survived))!).doom).toBe(0);
    expect(findByCode(gOf(survived), FORMULA, [ZONE.Play])?.controller).toBe(R);
  });

  it("act 2: no Brood in play or set aside advances it: (→R2)", () => {
    const r = run(uau(), { t: STEP.AdvanceAct });
    expect(actCode(r)).toBe("02241");
    const end = until(inject(r, noBrood, { t: STEP.CheckObjectives }), () => false, 20);
    expect(end.state.resolution).toBe("R2");
  });
});

describe("the locations", () => {
  /** Roland at a location of this code with an exhausted Brood, Roland's clues `n` */
  const there = (code: string, clues = 3, prep?: (game: GameContext) => void) =>
    uau({
      prep: (g) => {
        const loc = version(g, code);
        placeInvestigator(g, R, loc);
        exhaust(g, broodAt(g, loc));
        setCounter(g, R, "clues", clues);
        prep?.(g);
      },
    });
  const broodHere = (r: Result) => broodIn(gOf(r)).find((e) => e.location === at(r))!;

  it("Whateley Ruins: −1 willpower; up to 3 of your clues on an Abomination here, once a game", () => {
    const r = there("02250");
    expect(lastTest(run(r, test("willpower")))?.total).toBe(2);
    let after = until(use(r, "02250", 1), offered(/3 clues/));
    after = toTurn(pick(after, /3 clues/), R);
    expect(broodHere(after).clues).toBe(3);
    expect(inv(gOf(after), R).clues).toBe(0);
    const again = mutate(after, (g) => setCounter(g, R, "clues", 1));
    expect(options(again).some((o) => /Whateley Ruins: place/.test(o))).toBe(false);
  });

  it("Dunwich Village: 1 of your clues on any Abomination in play", () => {
    const r = there("02242", 1);
    const after = toTurn(use(r, "02242", 1), R);
    expect(enemies(gOf(after)).reduce((n, e) => n + e.clues, 0)).toBe(1);
  });

  it("Dunwich Village (the other): a Brood moves once toward it", () => {
    const r = uau({ prep: (g) => void version(g, "02243") });
    const before = broodIn(gOf(r)).map((e) => e.id);
    const village = at(r);
    let after = until(use(r, "02243", 1), (x) => x.state.pending?.kind !== "commit");
    if (after.state.pending?.promptKey === "pullBrood") after = pick(after, /Brood/);
    after = toTurn(after, R);
    expect(before.some((id) => card(gOf(after), id).location !== card(gOf(r), id).location)).toBe(
      true,
    );
    for (const id of before)
      if (card(gOf(after), id).location !== card(gOf(r), id).location)
        expect([village, ...connections(gOf(after), village)]).toContain(
          card(gOf(after), id).location,
        );
  });

  it("Ten-Acre Meadow: a clue from the bank on an Abomination here, taken off at the end of the round", () => {
    const r = there("02246", 0);
    const after = toTurn(use(r, "02246"), R);
    expect(broodHere(after).clues).toBe(1);
    const ended = run(after, { t: STEP.Window, trigger: "roundEnds", data: {} } as Step);
    expect(broodHere(ended).clues).toBe(0);
  });

  it("Cold Spring Glen: −1 evade there; as a group, up to 2 clues", () => {
    const r = uau({
      invs: [R, D],
      prep: (g) => {
        const loc = version(g, "02244");
        noBrood(g);
        placeInvestigator(g, R, loc);
        placeInvestigator(g, D, loc);
        exhaust(g, broodAt(g, loc));
        setCounter(g, R, "clues", 1);
        setCounter(g, D, "clues", 3);
      },
    });
    expect(enemyStat(gOf(r), broodHere(r).id, "evade")).toBe(2);
    let after = until(use(r, "02244", 1), offered(/2 clues/));
    after = toTurn(pick(after, /2 clues/), R);
    expect(broodHere(after).clues).toBe(2);
    expect(inv(gOf(after), R).clues + inv(gOf(after), D).clues).toBe(2);
  });

  it("Blasted Heath (the other): 1 damage at the end of your turn there", () => {
    const r = there("02249", 0);
    const after = toTurn(pick(r, "End turn"), (x) => x.state.pending?.kind === "turn");
    expect(inv(gOf(after), R).damage).toBeGreaterThanOrEqual(1);
  });

  it("Devil's Hop Yard (the other): each investigator here 1 clue", () => {
    const r = uau({
      invs: [R, D],
      prep: (g) => {
        const loc = version(g, "02253");
        placeInvestigator(g, R, loc);
        placeInvestigator(g, D, loc);
        exhaust(g, broodAt(g, loc));
        setCounter(g, R, "clues", 2);
        setCounter(g, D, "clues", 2);
      },
    });
    let after = until(use(r, "02253"), offered(/2 clues/));
    after = toTurn(pick(after, /2 clues/), R);
    expect(broodHere(after).clues).toBe(2);
    expect(inv(gOf(after), R).clues).toBe(1);
    expect(inv(gOf(after), D).clues).toBe(1);
  });

  it("Cold Spring Glen (the other): chosen at random, a successful agility (3) there chooses again", () => {
    // Roland in the second Glen; every random pick is made while he passes his test
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = uau({
        bag: ["+1"],
        seed,
        prep: (g) => placeInvestigator(g, R, version(g, "02245")),
      });
      const s = until(
        run(r, { t: STEP.Window, trigger: "enemyPhaseEnds", data: {} } as Step),
        offered(/tests agility/),
        200,
      );
      if (!offered(/tests agility/)(s)) continue;
      const tested = until(pick(s, /tests agility/), (x) => x.state.pending?.kind !== "commit");
      const after = until(tested, (x) => !!lastTest(x) && lastTest(x)!.difficulty === 3, 50);
      expect(lastTest(after)).toMatchObject({ skill: "agility", difficulty: 3, success: true });
      return;
    }
    throw new Error("the second Glen was never chosen");
  });
});

describe("encounter cards", () => {
  it("Towering Beasts: attaches to a Brood (+1 fight, +1 health), 1 damage if it is here", () => {
    const r = uau({
      prep: (g) => {
        noBrood(g);
        broodAt(g, inv(g, R).location!);
      },
    });
    const after = toTurn(drawNew(r, "02256"), R);
    const g = gOf(after);
    const tb = findByCode(g, "02256", [ZONE.Attached])!;
    expect(enemyStat(g, tb.attachedTo!, "fight")).toBe(7);
    expect(enemyStat(g, tb.attachedTo!, "health")).toBe(3);
    expect(inv(g, R).damage).toBe(1);
  });

  it("Ruin and Destruction: surge with no one at a Brood; else agility (3), 1 damage per point failed", () => {
    const r = uau({ bag: ["-2"], prep: (g) => void broodAt(g, inv(g, R).location!) });
    const after = toTurn(drawNew(r, "02257"), R);
    expect(inv(gOf(after), R).damage).toBe(3);
  });

  it("Attracting Attention: each Brood moves once toward you", () => {
    const r = uau();
    const after = toTurn(drawNew(r, "02258"), R);
    const g = gOf(after);
    for (const e of broodIn(g))
      expect([at(after), ...connections(g, at(after))]).toContain(e.location);
  });

  it("The Creatures' Tracks: 2 horror, or a set-aside Brood spawns at random", () => {
    const r = uau();
    const asked = until(drawNew(r, "02259"), offered(/Take 2 horror/));
    expect(inv(gOf(toTurn(pick(asked, /Take 2 horror/), R)), R).horror).toBe(2);
    const spawned = toTurn(pick(asked, /spawns at a random location/), R);
    expect(broodIn(gOf(spawned))).toHaveLength(3);
    // none set aside: only the horror
    const none = toTurn(drawNew(uau({ prep: noBrood }), "02259"), R);
    expect(inv(gOf(none), R).horror).toBe(2);
  });
});

// ---------- 6.6 the campaign ----------
describe("the campaign", () => {
  function walk(c: CampaignState, choice = 0): CampaignState {
    for (let k = 0; k < 80 && c.flow.waiting; k++) {
      const st = c.flow.waiting.step;
      if (st.kind === "play") break;
      const value =
        st.kind === "chooseOne"
          ? st.choices[Math.min(choice, st.choices.length - 1)].id
          : st.kind === "investigatorChoice" || st.kind === "investigator"
            ? c.investigators[0].code
            : st.kind === "upgradeDecks" || st.kind === "continue"
              ? "continue"
              : null;
      c = advance(db, c, value);
    }
    return c;
  }
  function finish(
    c: CampaignState,
    resolution: string,
    prep: (game: GameContext) => void = () => {},
    choice = 0,
  ) {
    const r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c, 1))));
    return walk(
      applyScenarioEnd(db, c, inject(r, prep, { t: STEP.Resolution, id: resolution }).state),
      choice,
    );
  }
  /** the campaign through Blood on the Altar, up to the choice before Undimensioned and Unseen */
  function beforeUaU(choice = 0) {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-dunwich-legacy",
        difficulty: "standard",
        seed: 3,
        investigators: [
          { code: R, deckId: "roland-starter" },
          { code: D, deckId: "daisy-starter" },
        ],
      }),
    );
    for (const res of ["R1", "R1", "R2", "R1"]) c = finish(c, res);
    atAltar = c;
    return finish(c, "R1", () => {}, choice);
  }
  /** the campaign as Blood on the Altar was offered (set by `beforeUaU`) */
  let atAltar: CampaignState | undefined;
  const TRAITS = ["Madness", "Injury", "Pact"];
  const traitWeaknesses = (deck: string[]) =>
    deck.filter(
      (code) =>
        db.cards[code]?.subtype === "basicweakness" &&
        db.cards[code].traits.some((t) => TRAITS.includes(t)),
    ).length;

  it("the intro records calmed or warned townsfolk; each investigator gains a Madness, Injury or Pact weakness for the campaign", () => {
    const calmed = beforeUaU(0);
    expect(calmed.flow.waiting?.step).toEqual({
      kind: "play",
      scenario: "undimensioned-and-unseen",
    });
    expect(hasEntry(calmed.log, "calmedTownsfolk")).toBe(true);
    expect(hasEntry(calmed.log, "warnedTownsfolk")).toBe(false);
    const warned = beforeUaU(1);
    expect(hasEntry(warned.log, "warnedTownsfolk")).toBe(true);
    expect(hasEntry(warned.log, "calmedTownsfolk")).toBe(false);
    for (const i of calmed.investigators) {
      const before = atAltar!.investigators.find((x) => x.code === i.code)!.deck;
      expect(traitWeaknesses(i.deck)).toBe(traitWeaknesses(before) + 1);
    }
    // the scenario's decks are the campaign's
    const setup = scenarioSetup(db, calmed, 1);
    for (const i of calmed.investigators)
      expect(setup.investigators.find((x) => x.code === i.code)!.deck.sort()).toEqual(
        [...i.deck].sort(),
      );
  });

  it("R1 and no resolution: X brood escaped from the table, no question; the Powder leaves the decks", () => {
    const c = beforeUaU();
    for (const res of ["R1", "none"]) {
      const out = finish(c, res, (g) => {
        // one in play, one set aside: two escaped
        const ids = [...broodIn(g), ...broodAside(g)].map((x) => x.id);
        for (const id of ids.slice(2)) moveCard(g, id, ZONE.Removed);
      });
      expect(logCount(out.log, "broodEscaped")).toBe(2);
      expect(hasEntry(out.log, "noBroodEscaped")).toBe(false);
      expect(out.flow.waiting?.step).toEqual({ kind: "play", scenario: "where-doom-awaits" });
    }
  });

  it("R2: no brood escaped", () => {
    const out = finish(beforeUaU(), "R2", noBrood);
    expect(hasEntry(out.log, "noBroodEscaped")).toBe(true);
    expect(logCount(out.log, "broodEscaped")).toBe(0);
  });
});

// ---------- random legal play: the engine never throws or dead-locks ----------
describe("random play", () => {
  for (const invs of [[R], [R, D]])
    for (const seed of [1, 2, 3])
      it(`${invs.join("+")} seed ${seed}`, () => {
        let r = uau({
          invs,
          seed,
          sacrificed: ["02040"],
          bag: ["+1", "0", "-1", "-2", "skull", "cultist", "tablet", "elderThing", "autoFail"],
          prep: (g) => {
            for (const i of g.s.order) inPlay(g, i, FORMULA);
          },
        });
        const rng = { rng: seed * 7919 };
        for (let k = 0; r.state.pending && k < 3000; k++) {
          const p = r.state.pending;
          const end = p.options.find((o) => o.label === "End turn");
          const o =
            end && next(rng) < 0.3 ? end : p.options[Math.floor(next(rng) * p.options.length)];
          const res = dispatch(db, r.state, { type: "choose", inv: p.inv, option: o.id });
          if (res.error) throw new Error(res.error);
          r = res;
        }
        expect(r.state.phase === "ended" || r.state.pending).toBeTruthy();
      });
});
