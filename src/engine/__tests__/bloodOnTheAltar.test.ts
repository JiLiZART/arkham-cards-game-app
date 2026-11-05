/** Blood on the Altar (campaign-the-dunwich-legacy, group 5): setup, tokens, the map, cards, acts and agendas, the campaign. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, dispatch, type Result } from "../index";
import { next } from "../world/rng";
import { db, gOf, mutate, options, pick, putEnemy, skipMulligans } from "../kits/testkit";
import {
  enemyHere,
  evade,
  game,
  hand,
  inject,
  inPlay,
  investigate,
  lastTest,
  move,
  offered,
  play,
  toTurn,
  until,
  use,
} from "../kits/driver";
import { cardsIn, connections, enemiesAt, enemyStat, findByCode, locations } from "../queries";
import {
  card,
  cardsBeneath,
  currentAct,
  currentAgenda,
  exhaust,
  inv,
  placeInvestigator,
  reveal,
  setController,
  setCounter,
  setStatus,
  sideDeck,
  type GameContext,
} from "../context";
import { createCard, moveCard, putBeneath } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry } from "../campaign/log";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const COMMONS = "02201";
const CHAMBER = "02214";
const KEY = "02215";
const SILAS = "02216";
const PAIRS = [
  ["02202", "02203"],
  ["02204", "02205"],
  ["02206", "02207"],
  ["02208", "02209"],
  ["02210", "02211"],
  ["02212", "02213"],
];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const bota = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
  prep,
}: Opts = {}) =>
  game({
    scenario: "blood-on-the-altar",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-dunwich-legacy", difficulty, campaignLog: log },
  });

const codesOf = (game: GameContext, ids: readonly string[]) =>
  ids.map((id) => card(game, id).code).sort();
const sacrifices = (r: Result) => codesOf(gOf(r), sideDeck(gOf(r), "sacrifices"));
/** the location of a code in play, put into play (revealed, no clues) when it isn't */
function loc(game: GameContext, code: string): InstId {
  const there = findByCode(game, code, [ZONE.Location]);
  if (there) return there.id;
  const id = createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  reveal(game, id);
  return id;
}
/** an investigator at a location of a code, revealed, its clues gone */
function standAt(game: GameContext, code: string, who = R): InstId {
  const id = loc(game, code);
  reveal(game, id);
  setCounter(game, id, "clues", 0);
  placeInvestigator(game, who, id);
  return id;
}
const at = (r: Result, who = R) => inv(gOf(r), who).location;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const test = (skill: "willpower" | "intellect" | "agility", difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill, difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
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
/** the cards beneath the agenda deck (the current agenda) */
const beneathAgenda = (r: Result) => codesOf(gOf(r), cardsBeneath(gOf(r), currentAgenda(gOf(r))!));

// ---------- 5.2 setup ----------
describe("setup", () => {
  it("the Commons and one copy of five of the six other locations; one beneath each but the Commons: the Chamber, its Key, 3 encounter cards", () => {
    const missing = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = bota({ invs: [R, D], seed });
      const g = gOf(r);
      const inPlayNow = locations(g).map((l) => l.code);
      expect(inPlayNow).toHaveLength(6);
      expect(inPlayNow).toContain(COMMONS);
      const pairsIn = PAIRS.filter((p) => p.some((c) => inPlayNow.includes(c)));
      expect(pairsIn).toHaveLength(5);
      for (const p of PAIRS) expect(p.filter((c) => inPlayNow.includes(c)).length).toBeLessThan(2);
      missing.add(PAIRS.find((p) => !pairsIn.includes(p))![0]);
      for (const p of PAIRS)
        for (const c of p.filter((x) => !inPlayNow.includes(x)))
          expect(findByCode(g, c)?.zone).toBe(ZONE.Removed);
      expect(at(r, R)).toBe(loc(g, COMMONS));
      expect(at(r, D)).toBe(loc(g, COMMONS));
      const beneath = locations(g).map((l) => cardsBeneath(g, l.id));
      expect(cardsBeneath(g, loc(g, COMMONS))).toHaveLength(0);
      expect(beneath.filter((b) => b.length === 1)).toHaveLength(5);
      const under = codesOf(g, beneath.flat());
      expect(under).toContain(CHAMBER);
      expect(under).toContain(KEY);
      for (const l of locations(g)) expect(l.revealed).toBe(l.code === COMMONS);
    }
    expect(missing.size).toBeGreaterThan(1);
  });

  it("the potential sacrifices: the kidnapped of the log, Zebulon Whateley and Earl Sawyer", () => {
    expect(sacrifices(bota())).toEqual(["02217", "02218"]);
    const all = bota({
      log: {
        henryArmitageKidnapped: true,
        francisMorganKidnapped: true,
        warrenRiceKidnapped: true,
      },
    });
    expect(sacrifices(all)).toEqual(["02040", "02061", "02080", "02217", "02218"]);
    expect(sacrifices(bota({ log: { francisMorganKidnapped: true } }))).toEqual([
      "02080",
      "02217",
      "02218",
    ]);
  });

  it("Silas Bishop and the Powder of Ibn-Ghazi set aside; +1 doom if delayed; Naomi's Crew only with a bone to pick", () => {
    const g = gOf(bota());
    expect(
      codesOf(
        g,
        cardsIn(g, ZONE.SetAside).map((c) => c.id),
      ),
    ).toEqual([SILAS, "02219"]);
    expect(card(g, currentAgenda(g)!).doom).toBe(0);
    for (const code of ["02097", "02098", "02099"])
      expect(findByCode(g, code)?.zone).toBe(ZONE.Removed);
    const delayed = gOf(bota({ log: { investigatorsDelayed: true, boneToPick: true } }));
    expect(card(delayed, currentAgenda(delayed)!).doom).toBe(1);
    expect(findByCode(delayed, "02098")?.zone).not.toBe(ZONE.Removed);
  });
});

// ---------- 5.3 tokens ----------
describe("chaos tokens", () => {
  const tokenTest = (token: ChaosToken, difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(bota({ bag: [token], difficulty, prep }), test("willpower", against));
  /** every location in play without a card beneath: the five dealt ones cleared, a 7th added */
  const bare = (game: GameContext) => {
    for (const l of locations(game))
      for (const id of cardsBeneath(game, l.id)) moveCard(game, id, ZONE.Removed);
    loc(game, "02214");
  };

  /** the tokens a test revealed when the tablet came out first (the bag holds a −1 too), over seeds until it does */
  const tabletFirst = (d: Difficulty, prep?: Opts["prep"]) => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const r = run(bota({ bag: ["tablet", "-1"], difficulty: d, seed, prep }), test("willpower"));
      const tokens = lastTest(r)!.tokens;
      if (tokens[0] === "tablet") return tokens.length;
    }
    throw new Error("the tablet never came out first");
  };

  for (const d of ["easy", "standard"] as const) {
    it(`${d}: skull −1 per location without a card beneath it, at most −4`, () => {
      expect(mods(tokenTest("skull", d))).toEqual([-1]);
      expect(mods(tokenTest("skull", d, 0, bare))).toEqual([-4]);
    });
    it(`${d}: cultist −2; failing adds a clue from the bank to your location`, () => {
      const pass = tokenTest("cultist", d, -10);
      expect(mods(pass)).toEqual([-2]);
      expect(card(gOf(pass), at(pass)!).clues).toBe(0);
      const fail = tokenTest("cultist", d, 10);
      expect(card(gOf(fail), at(fail)!).clues).toBe(1);
    });
    it(`${d}: tablet −2, another token revealed in The Hidden Chamber only`, () => {
      expect(lastTest(tokenTest("tablet", d))?.tokens).toEqual(["tablet"]);
      expect(mods(tokenTest("tablet", d))).toEqual([-2]);
      expect(tabletFirst(d, (g) => void standAt(g, CHAMBER))).toBe(2);
      expect(tabletFirst(d)).toBe(1);
    });
    it(`${d}: elder thing −3; failing places 1 doom on the agenda`, () => {
      const pass = tokenTest("elderThing", d, -10);
      expect(mods(pass)).toEqual([-3]);
      expect(card(gOf(pass), currentAgenda(gOf(pass))!).doom).toBe(0);
      const fail = tokenTest("elderThing", d, 10);
      expect(card(gOf(fail), currentAgenda(gOf(fail))!).doom).toBe(1);
    });
  }
  for (const d of ["hard", "expert"] as const) {
    it(`${d}: skull uncapped, cultist −4, tablet −3 always reveals another, elder thing −3 always places doom`, () => {
      expect(mods(tokenTest("skull", d, 0, bare))).toEqual([-7]);
      expect(mods(tokenTest("cultist", d, -10))).toEqual([-4]);
      expect(tabletFirst(d)).toBe(2);
      const elder = tokenTest("elderThing", d, -10);
      expect(mods(elder)).toEqual([-3]);
      expect(lastTest(elder)?.success).toBe(true);
      expect(card(gOf(elder), currentAgenda(gOf(elder))!).doom).toBe(1);
    });
  }
});

// ---------- 5.4 the map ----------
describe("connections", () => {
  /** a game with every location name in play: the first copy of each */
  const village = () =>
    gOf(
      bota({
        prep: (g) =>
          PAIRS.forEach(
            (p) => void loc(g, p.find((c) => findByCode(g, c, [ZONE.Location])) ?? p[0]),
          ),
      }),
    );
  const id = (game: GameContext, name: string) =>
    locations(game).find(
      (l) => card(game, l.id).code && l.code && game.db.cards[l.code].name === name,
    )!.id;
  const linked = (game: GameContext, a: string, b: string) =>
    connections(game, id(game, a)).includes(id(game, b));

  it("two-way, as the placement map draws them", () => {
    const g = village();
    const pairs: [string, string][] = [
      ["Village Commons", "Bishop's Brook"],
      ["Village Commons", "Schoolhouse"],
      ["Bishop's Brook", "Osborn's General Store"],
      ["Bishop's Brook", "Burned Ruins"],
      ["Burned Ruins", "Congregational Church"],
      ["Congregational Church", "House in the Reeds"],
      ["House in the Reeds", "Schoolhouse"],
      ["Schoolhouse", "Osborn's General Store"],
    ];
    for (const [a, b] of pairs) {
      expect(linked(g, a, b), `${a} → ${b}`).toBe(true);
      expect(linked(g, b, a), `${b} → ${a}`).toBe(true);
    }
    expect(connections(g, id(g, "Village Commons"))).toHaveLength(3);
    expect(linked(g, "Burned Ruins", "Village Commons")).toBe(false);
    expect(linked(g, "House in the Reeds", "Village Commons")).toBe(false);
  });

  it("one-way: the Church to the Commons, not back; the Commons to Osborn's, not back", () => {
    const g = village();
    expect(linked(g, "Congregational Church", "Village Commons")).toBe(true);
    expect(linked(g, "Village Commons", "Congregational Church")).toBe(false);
    expect(linked(g, "Village Commons", "Osborn's General Store")).toBe(true);
    expect(linked(g, "Osborn's General Store", "Village Commons")).toBe(false);
  });

  it("an investigator moves along a one-way connection but not against it", () => {
    const r = bota({ prep: (g) => void standAt(g, "02208") });
    expect(at(move(r, COMMONS))).toBe(findByCode(gOf(r), COMMONS)!.id);
    const back = bota({ prep: (g) => void loc(g, "02208") });
    expect(() => move(back, "02208")).toThrow(/not offered/);
  });
});

// ---------- 5.5 cards ----------
describe("the cards beneath the locations", () => {
  /** Roland at a location (no clues) with this card beneath it, instead of what was dealt */
  const over = (code: string, under: string, prep?: (game: GameContext) => void) =>
    bota({
      prep: (game) => {
        const l = standAt(game, code);
        for (const id of cardsBeneath(game, l)) moveCard(game, id, ZONE.Removed);
        const c = findByCode(game, under, [ZONE.Beneath, ZONE.SetAside, ZONE.EncounterDeck]);
        putBeneath(game, c ? c.id : createCard(game, under, ZONE.Limbo), l);
        prep?.(game);
      },
    });
  const drawLabel = /draw the encounter card underneath/;

  it("with no clues here, a fast ability draws the card underneath, once a game", () => {
    const r = over("02204", "02223");
    expect(options(r).some((o) => drawLabel.test(o))).toBe(true);
    const clues = mutate(r, (g) => setCounter(g, at(r)!, "clues", 1));
    expect(options(clues).some((o) => drawLabel.test(o))).toBe(false);
    const after = toTurn(pick(r, drawLabel), R);
    expect(cardsBeneath(gOf(after), at(after)!)).toHaveLength(0);
    expect(findByCode(gOf(after), "02223", [ZONE.EncounterDiscard])).toBeTruthy();
    // the group limit: another card put there can't be drawn
    const again = mutate(after, (g) =>
      putBeneath(g, createCard(g, "02223", ZONE.Limbo), at(after)!),
    );
    expect(options(again).some((o) => drawLabel.test(o))).toBe(false);
  });

  it("The Hidden Chamber: drawn, it enters play connected to that location; its door is locked until the Key is attached", () => {
    let r = toTurn(pick(over("02204", CHAMBER), drawLabel), R);
    const g = gOf(r);
    const chamber = findByCode(g, CHAMBER, [ZONE.Location])!;
    expect(chamber.revealed).toBe(true);
    expect(connections(g, chamber.id)).toEqual([at(r)]);
    expect(connections(g, at(r)!)).toContain(chamber.id);
    expect(() => move(r, CHAMBER)).toThrow(/not offered/);
    // the Key, drawn, is Roland's; its fast ability attaches it to the Chamber next door
    r = toTurn(drawNew(r, KEY), R);
    const key = findByCode(gOf(r), KEY, [ZONE.Play])!;
    expect(key.controller).toBe(R);
    r = toTurn(use(r, KEY, 1), R);
    expect(findByCode(gOf(r), KEY, [ZONE.Attached])?.location).toBe(chamber.id);
    // entering it advances act 1: everything revealed, every clue to the Chamber, Silas Bishop there
    r = mutate(r, (g2) => setCounter(g2, R, "clues", 2));
    const cluesBefore = locations(gOf(r)).reduce((n, l) => n + (l.revealed ? l.clues : 0), 0);
    r = toTurn(move(r, CHAMBER), R);
    const g3 = gOf(r);
    expect(actCode(r)).toBe("02200");
    expect(locations(g3).every((l) => l.revealed)).toBe(true);
    const ch = findByCode(g3, CHAMBER, [ZONE.Location])!;
    expect(
      locations(g3)
        .filter((l) => l.id !== ch.id)
        .every((l) => l.clues === 0),
    ).toBe(true);
    expect(inv(g3, R).clues).toBe(0);
    expect(ch.clues).toBeGreaterThanOrEqual(cluesBefore + 2);
    expect(findByCode(g3, SILAS, [ZONE.Enemy])?.location).toBe(ch.id);
  });

  it("the Key's ability isn't offered while the Chamber isn't next to you", () => {
    const r = toTurn(drawNew(bota(), KEY), R);
    expect(findByCode(gOf(r), KEY, [ZONE.Play])?.controller).toBe(R);
    expect(options(r).some((o) => /Hidden Chamber/.test(o))).toBe(false);
  });
});

describe("acts and agendas", () => {
  /** act 2 current, Roland in The Hidden Chamber with Silas Bishop */
  const act2 = (prep?: (game: GameContext) => void) =>
    run(
      bota({
        prep: (game) => {
          standAt(game, CHAMBER);
          setCounter(game, loc(game, CHAMBER), "clues", 2);
          prep?.(game);
        },
      }),
      { t: STEP.AdvanceAct },
    );

  it("act 2: Silas Bishop defeated (→R1)", () => {
    const r = act2();
    expect(actCode(r)).toBe("02200");
    const silas = findByCode(gOf(r), SILAS, [ZONE.Enemy])!;
    const end = until(
      inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: silas.id, by: R }),
      () => false,
      20,
    );
    expect(end.state.resolution).toBe("R1");
  });

  it("act 2: no clues in the Chamber advances: (→R2) with the Necronomicon in play, else (→R3)", () => {
    const clear = (r: Result) =>
      inject(r, (g) => setCounter(g, loc(g, CHAMBER), "clues", 0), { t: STEP.CheckObjectives });
    expect(clear(act2()).state.resolution).toBe("R3");
    expect(clear(act2((g) => void inPlay(g, R, "02140"))).state.resolution).toBe("R2");
  });

  it("agenda 1: a potential sacrifice beneath the agenda deck with 3 or more; agenda 2 with 2 or more", () => {
    const three = bota({ log: { henryArmitageKidnapped: true } });
    const a2 = run(three, { t: STEP.AdvanceAgenda });
    expect(agendaCode(a2)).toBe("02197");
    expect(beneathAgenda(a2)).toHaveLength(1);
    expect(sacrifices(a2)).toHaveLength(2);
    const a3 = run(a2, { t: STEP.AdvanceAgenda });
    expect(agendaCode(a3)).toBe("02198");
    expect(beneathAgenda(a3)).toHaveLength(2);
    expect(sacrifices(a3)).toHaveLength(1);
    // two potential sacrifices: agenda 1 takes none
    expect(beneathAgenda(run(bota(), { t: STEP.AdvanceAgenda }))).toHaveLength(0);
  });

  it("agenda 3: each investigator resigns: no resolution", () => {
    const r = run(bota({ invs: [R, D] }), { t: STEP.AdvanceAgenda }, { t: STEP.AdvanceAgenda });
    const end = until(
      inject(r, () => {}, { t: STEP.AdvanceAgenda }),
      () => false,
      40,
    );
    expect(end.state.resolution).toBe("none");
    for (const i of [R, D]) expect(inv(gOf(end), i).status).toBe("resigned");
  });
});

describe("encounter cards", () => {
  it("Kidnapped!: with no Ally, 2 damage and discarded", () => {
    const r = toTurn(drawNew(bota(), "02220"), R);
    expect(inv(gOf(r), R).damage).toBe(2);
    expect(findByCode(gOf(r), "02220", [ZONE.EncounterDiscard])).toBeTruthy();
  });

  it("Kidnapped!: failing, an Ally joins the potential sacrifices; it attaches to the agenda, and its advance takes a sacrifice", () => {
    const r0 = bota({ bag: ["autoFail"], prep: (g) => void inPlay(g, R, "01117") });
    let r = until(drawNew(r0, "02220"), offered(/willpower|Willpower/));
    r = toTurn(r, R);
    expect(sacrifices(r)).toEqual(["01117", "02217", "02218"]);
    const k = findByCode(gOf(r), "02220", [ZONE.Attached])!;
    expect(k.attachedTo).toBe(currentAgenda(gOf(r)));
    // agenda 1 advances: Kidnapped! takes one as it does ("when"), which leaves 2: too few for its back
    const a2 = run(r, { t: STEP.AdvanceAgenda });
    expect(beneathAgenda(a2)).toHaveLength(1);
    expect(sacrifices(a2)).toHaveLength(2);
    expect(findByCode(gOf(a2), "02220", [ZONE.EncounterDiscard])).toBeTruthy();
  });

  it("Kidnapped!: succeeding keeps the Ally, still attaches", () => {
    const r = toTurn(
      drawNew(bota({ bag: ["+1"], prep: (g) => void inPlay(g, R, "01117") }), "02220"),
      R,
    );
    expect(sacrifices(r)).toEqual(["02217", "02218"]);
    expect(findByCode(gOf(r), "02220", [ZONE.Attached])).toBeTruthy();
  });

  it("Psychopomp's Song: drawn, it goes into an investigator's threat area", () => {
    const r = until(drawNew(bota({ invs: [R, D] }), "02221"), offered(/Daisy/));
    const g = gOf(toTurn(pick(r, /Daisy/), R));
    // (it surges: the next card drawn may be the other copy)
    expect(cardsIn(g, ZONE.Threat).some((c) => c.code === "02221" && c.controller === D)).toBe(
      true,
    );
  });

  it("Psychopomp's Song: taking damage, 2 more and it is discarded; horror alone doesn't trigger it", () => {
    let r = bota({
      prep: (g) => {
        const id = createCard(g, "02221", ZONE.Limbo);
        moveCard(g, id, ZONE.Threat);
        setController(g, id, R);
      },
    });
    r = run(r, { t: STEP.AssignDamage, inv: R, damage: 0, horror: 1 } as Step);
    expect(findByCode(gOf(r), "02221", [ZONE.Threat])).toBeTruthy();
    r = run(r, { t: STEP.AssignDamage, inv: R, damage: 1, horror: 0 } as Step);
    expect(inv(gOf(r), R).damage).toBe(3);
    expect(findByCode(gOf(r), "02221", [ZONE.EncounterDiscard])).toBeTruthy();
  });

  it("Strange Signs: failing adds a clue to your location, 2 with 3 or 4 investigators", () => {
    const one = toTurn(drawNew(bota({ bag: ["autoFail"] }), "02222"), R);
    expect(card(gOf(one), at(one)!).clues).toBe(1);
    const three = toTurn(drawNew(bota({ invs: [R, D, "01003"], bag: ["autoFail"] }), "02222"), R);
    expect(card(gOf(three), at(three)!).clues).toBe(2);
    const pass = toTurn(drawNew(bota({ bag: ["+1"] }), "02222"), R);
    expect(card(gOf(pass), at(pass)!).clues).toBe(0);
  });

  it("Rotting Remains: 1 horror per point failed", () => {
    const r = toTurn(drawNew(bota({ bag: ["-2"] }), "02223"), R);
    expect(inv(gOf(r), R).horror).toBe(2);
  });

  it("Servant of Many Mouths: after you defeat it, discover 1 clue at any location", () => {
    const r0 = bota({
      prep: (g) => {
        enemyHere(g, R, "02224");
        setCounter(g, loc(g, "02204"), "clues", 2);
      },
    });
    const servant = findByCode(gOf(r0), "02224", [ZONE.Enemy])!;
    const r = until(
      inject(r0, () => {}, { t: STEP.DefeatEnemy, enemy: servant.id, by: R }),
      offered(/discover 1 clue/),
    );
    const after = toTurn(pick(r, /discover 1 clue/), R);
    expect(inv(gOf(after), R).clues).toBe(1);
    expect(card(gOf(after), loc(gOf(after), "02204")).clues).toBe(1);
  });
});

describe("the story allies and Silas Bishop", () => {
  it("Zebulon Whateley: +1 willpower; after a willpower test on a treachery succeeds, exhaust to draw", () => {
    const r0 = bota({ bag: ["+1"], prep: (g) => void inPlay(g, R, "02217") });
    expect(lastTest(run(r0, test("willpower")))?.base).toBe(4);
    const r = until(drawNew(r0, "02223"), offered(/Zebulon Whateley/));
    const n = inv(gOf(r), R).hand.length;
    expect(inv(gOf(toTurn(pick(r, /Zebulon Whateley/), R)), R).hand.length).toBe(n + 1);
  });

  it("Earl Sawyer: +1 agility; after you evade, exhaust to draw", () => {
    const r0 = bota({
      bag: ["+1"],
      prep: (g) => {
        inPlay(g, R, "02218");
        enemyHere(g, R);
      },
    });
    const r = until(evade(r0, "01160"), offered(/Earl Sawyer/));
    expect(lastTest(r)?.base).toBe(3);
    const n = inv(gOf(r), R).hand.length;
    expect(inv(gOf(toTurn(pick(r, /Earl Sawyer/), R)), R).hand.length).toBe(n + 1);
  });

  it("Silas Bishop: Massive, and no attack of opportunity", () => {
    const r = bota({ prep: (g) => void putEnemy(g, SILAS, inv(g, R).location!, null) });
    const g = gOf(r);
    const silas = findByCode(g, SILAS, [ZONE.Enemy])!;
    expect(silas.engagedWith).toBeNull();
    const before = inv(g, R).damage + inv(g, R).horror;
    const after = toTurn(pick(r, "Gain 1 resource"), R);
    expect(inv(gOf(after), R).damage + inv(gOf(after), R).horror).toBe(before);
  });

  it("Powder of Ibn-Ghazi: enters play with a clue per survivor; moves one to an exhausted Brood", () => {
    const r = bota({
      log: { henryArmitageSurvived: true, earlSawyerSurvived: true },
      prep: (g) => {
        const brood = putEnemy(g, "02255", inv(g, R).location!, null);
        exhaust(g, brood);
      },
    });
    let r2 = inject(r, (g) => {
      const id = createCard(g, "02219", ZONE.Limbo, R);
      moveCard(g, id, ZONE.Hand);
    });
    r2 = toTurn(play(r2, "02219"), R);
    expect(findByCode(gOf(r2), "02219", [ZONE.Play])?.clues).toBe(2);
    r2 = toTurn(use(r2, "02219", 1), R);
    expect(findByCode(gOf(r2), "02219", [ZONE.Play])?.clues).toBe(1);
    expect(findByCode(gOf(r2), "02255", [ZONE.Enemy])?.clues).toBe(1);
  });
});

describe("the locations", () => {
  it("Bishop's Brook: enemies there deal +1 horror; Burned Ruins: enemies there get +1 evade", () => {
    const g = gOf(
      bota({
        prep: (g) => {
          putEnemy(g, "01160", standAt(g, "02202"), null);
          putEnemy(g, "01161", loc(g, "02204"), null);
        },
      }),
    );
    expect(enemyStat(g, findByCode(g, "01160", [ZONE.Enemy])!.id, "horror")).toBe(2);
    expect(enemyStat(g, findByCode(g, "01161", [ZONE.Enemy])!.id, "evade")).toBe(
      g.db.cards["01161"].enemy!.evade! + 1,
    );
  });

  it("Bishop's Brook (the other): while someone is there, the others can't enter", () => {
    const r = bota({
      invs: [R, D],
      prep: (g) => {
        standAt(g, "02203", D);
        standAt(g, COMMONS, R);
      },
    });
    expect(() => move(r, "02203")).toThrow(/not offered/);
  });

  it("Burned Ruins (the other): failing to investigate it flips a clue to doom", () => {
    const r = bota({
      bag: ["autoFail"],
      prep: (g) => setCounter(g, standAt(g, "02205"), "clues", 2),
    });
    const after = toTurn(investigate(r), R);
    const ruins = card(gOf(after), at(after)!);
    expect(ruins.clues).toBe(1);
    expect(ruins.doom).toBe(1);
  });

  it("Osborn's General Store: no resources while there; the other copy searches 3 cards for an Item for 1 resource", () => {
    const r = bota({ prep: (g) => void standAt(g, "02206") });
    const res = inv(gOf(r), R).resources;
    expect(inv(gOf(toTurn(pick(r, "Gain 1 resource"), R)), R).resources).toBe(res);
    const other = bota({ prep: (g) => void standAt(g, "02207") });
    const searched = until(use(other, "02207"), offered(/Take nothing/));
    expect(inv(gOf(searched), R).resources).toBe(res - 1);
    // only Items among the top 3 are offered
    const g = gOf(searched);
    for (const o of searched.state.pending!.options.filter((x) => x.id !== "none"))
      expect(g.db.cards[card(g, o.value as string).code].traits).toContain("Item");
  });

  /** a location of this code (unrevealed) revealed, its forced effects resolved */
  function revealNew(code: string): Result {
    let id = "";
    const r = mutate(bota(), (g) => {
      const there = findByCode(g, code, [ZONE.Location]);
      id = there?.id ?? createCard(g, code, ZONE.Limbo);
      if (!there) moveCard(g, id, ZONE.Location);
    });
    return toTurn(
      inject(r, () => {}, { t: STEP.RevealLocation, location: id }),
      R,
    );
  }
  const traitsAtCommons = (r: Result) =>
    enemiesAt(gOf(r), loc(gOf(r), COMMONS)).flatMap((e) => gOf(r).db.cards[e.code].traits);

  it("Congregational Church: revealed, a Humanoid enemy from the encounter deck spawns at the Commons; the other copy trades a card for 2 resources", () => {
    expect(traitsAtCommons(revealNew("02208"))).toContain("Humanoid");
    const other = bota({ prep: (g2) => void standAt(g2, "02209") });
    const res = inv(gOf(other), R).resources;
    const cards = inv(gOf(other), R).hand.length;
    const traded = toTurn(use(other, "02209"), R);
    expect(inv(gOf(traded), R).resources).toBe(res + 2);
    expect(inv(gOf(traded), R).hand.length).toBe(cards - 1);
  });

  it("House in the Reeds (the other): revealed, a Nightgaunt from the encounter deck spawns at the Commons", () => {
    expect(traitsAtCommons(revealNew("02211"))).toContain("Nightgaunt");
  });

  it("House in the Reeds: no events there, though they can still be committed", () => {
    const r = bota({
      prep: (g) => {
        standAt(g, "02210");
        hand(g, R, "01024"); // Dynamite Blast
      },
    });
    expect(() => play(r, "01024")).toThrow(/not offered/);
    const out = bota({ prep: (g) => void hand(g, R, "01024") });
    expect(() => play(out, "01024")).not.toThrow();
    // committed to a test, it isn't played
    const commit = until(
      inject(r, () => {}, test("willpower", 1)),
      (x) => x.state.pending?.kind === "commit",
    );
    expect(commit.state.pending!.options.some((o) => /Dynamite Blast/.test(o.label))).toBe(true);
  });

  it("Schoolhouse: no skill cards committed there; the other copy: clues there only by investigating", () => {
    const commits = (code: string) =>
      until(
        inject(
          bota({ prep: (g) => void (standAt(g, code), hand(g, R, "01089")) }),
          () => {},
          test("willpower", 1),
        ),
        (x) => x.state.pending?.kind === "commit",
      ).state.pending!.options.some((o) => /Guts/.test(o.label));
    expect(commits("02212")).toBe(false);
    expect(commits(COMMONS)).toBe(true);
    const other = bota({
      bag: ["+1"],
      prep: (g) => setCounter(g, standAt(g, "02213"), "clues", 2),
    });
    const effect = run(other, {
      t: STEP.Eff,
      effect: { op: "discoverClues", amount: 1 },
      ctx: { you: R, source: null },
    });
    expect(inv(gOf(effect), R).clues).toBe(0);
    const investigated = toTurn(investigate(other), R);
    expect(inv(gOf(investigated), R).clues).toBe(1);
  });
});

// ---------- 5.6 the campaign ----------
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
  function finish(
    c: CampaignState,
    resolution: string,
    prep: (game: GameContext) => void = () => {},
  ) {
    const r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c, 1))));
    return walk(
      applyScenarioEnd(db, c, inject(r, prep, { t: STEP.Resolution, id: resolution }).state),
    );
  }
  /** the campaign at Blood on the Altar: EA, HAW and the Museum R1 (Roland takes the Necronomicon), Essex R1 */
  function atAltar() {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-dunwich-legacy",
        difficulty: "standard",
        seed: 2,
        investigators: [
          { code: R, deckId: "roland-starter" },
          { code: D, deckId: "daisy-starter" },
        ],
      }),
    );
    for (const res of ["R1", "R1", "R2", "R1"]) c = finish(c, res);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "blood-on-the-altar" });
    return c;
  }
  const deckOf = (c: CampaignState, who: string) =>
    c.investigators.find((i) => i.code === who)!.deck;
  /** the cards of these codes beneath the current agenda (taken from the pile, or made) */
  const beneath =
    (...codes: string[]) =>
    (game: GameContext) => {
      for (const code of codes) {
        const pooled = sideDeck(game, "sacrifices").find((id) => card(game, id).code === code);
        putBeneath(game, pooled ?? createCard(game, code, ZONE.Limbo), currentAgenda(game)!);
      }
    };
  const sacrificedOf = (c: CampaignState) => c.log.sacrificed?.cards.sacrificed ?? [];

  it("the kidnapped of the earlier scenarios are the potential sacrifices", () => {
    const c = atAltar();
    const setup = scenarioSetup(db, c, 1);
    const r = toTurn(skipMulligans(createGame(db, setup)));
    const kidnapped = [
      ["henryArmitageKidnapped", "02040"],
      ["warrenRiceKidnapped", "02061"],
      ["francisMorganKidnapped", "02080"],
    ].filter(([k]) => hasEntry(c.log, k));
    expect(kidnapped.length).toBeGreaterThan(0);
    expect(sacrifices(r)).toEqual([...kidnapped.map(([, code]) => code), "02217", "02218"].sort());
  });

  it("R1: the unique cards beneath the agenda deck are sacrificed to Yog-Sothoth, out of every deck; the Survivors read the rest", () => {
    const c = atAltar();
    deckOf(c, R).push("01117", "01021");
    const out = finish(c, "R1", (g) => {
      beneath("02217")(g);
      // Roland's own unique ally, and a non-unique one
      for (const code of ["01117", "01021"])
        putBeneath(g, createCard(g, code, ZONE.Limbo, R), currentAgenda(g)!);
    });
    expect(sacrificedOf(out).sort()).toEqual(["01117", "02217"]);
    expect(deckOf(out, R)).not.toContain("01117");
    expect(deckOf(out, R)).toContain("01021");
    expect(hasEntry(out.log, "killedSilasBishop")).toBe(true);
    expect(hasEntry(out.log, "zebulonWhateleySurvived")).toBe(false);
    expect(hasEntry(out.log, "earlSawyerSurvived")).toBe(true);
    expect(out.flow.waiting?.step).toEqual({ kind: "play", scenario: "undimensioned-and-unseen" });
  });

  it("no resolution: every potential sacrifice left is sacrificed, the ritual completed, no Survivors", () => {
    const c = atAltar();
    const out = finish(c, "none");
    expect(sacrificedOf(out)).toContain("02217");
    expect(sacrificedOf(out)).toContain("02218");
    expect(hasEntry(out.log, "ritualCompleted")).toBe(true);
    expect(hasEntry(out.log, "earlSawyerSurvived")).toBe(false);
    expect(hasEntry(out.log, "henryArmitageSurvived")).toBe(!sacrificedOf(out).includes("02040"));
  });

  it("the Necronomicon is stolen only from an investigator defeated with it", () => {
    const c = atAltar();
    expect(deckOf(c, R)).toContain("02140");
    const kept = finish(c, "R1");
    expect(hasEntry(kept.log, "necronomiconStolen")).toBe(false);
    expect(deckOf(kept, R)).toContain("02140");
    const lost = finish(c, "R1", (g) => setStatus(g, R, "defeated", "damage"));
    expect(hasEntry(lost.log, "necronomiconStolen")).toBe(true);
    expect(deckOf(lost, R)).not.toContain("02140");
  });
});

// ---------- random legal play: the engine never throws or dead-locks ----------
describe("random play", () => {
  for (const invs of [[R], [R, D], [R, D, "01003", "01004"]])
    for (const seed of [1, 2, 3])
      it(`${invs.join("+")} seed ${seed}`, () => {
        let r = bota({
          invs,
          seed,
          log: { henryArmitageKidnapped: true, boneToPick: true },
          bag: ["+1", "0", "-1", "-2", "skull", "cultist", "tablet", "elderThing", "autoFail"],
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
