/** Echoes of the Past (campaign-the-path-to-carcosa, group 4): setup, tokens, map, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, type Result } from "../index";
import { db, gOf, options, pick, putEnemy, skipMulligans } from "../kits/testkit";
import { game, hand, inject, inPlay, lastTest, toTurn, until, use } from "../kits/driver";
import {
  addTempMod,
  connections,
  enemies,
  enemyStat,
  findByCode,
  hasFlag,
  shroud,
  skillValue,
} from "../queries";
import { playCost } from "../rules/cards";
import {
  allCards,
  card,
  currentAct,
  currentAgenda,
  exhaust,
  inv,
  placeInvestigator,
  reveal,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
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

const R = "01001"; // Roland: intellect 3
const D = "01002";
const ENTRY_HALL = "03127";
const QUIET_2 = "03131";
const QUIET_3 = "03135";
const GROUND = ["03128", "03129", "03130"];
const SECOND = ["03132", "03133", "03134"];
const THIRD = ["03136", "03137", "03138"];
const LIBRARY = "03139";
const OATHSPEAKER = "03140";
const PEABODY = "03141";
const SEEKER = "03144";
const SEBASTIEN = "03068b";
const ACOLYTE = "01169"; // a Cultist; enters play with 1 doom
const GHOUL = "01160";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const eotp = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
  prep,
}: Opts = {}) =>
  game({
    scenario: "echoes-of-the-past",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-path-to-carcosa", campaignLog: log, difficulty },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const inGame = (game: GameContext, codes: string[]) => codes.filter((c) => loc(game, c));
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
/** Roland at a revealed location of this code (its clues as printed) */
const visit = (game: GameContext, code: string) => {
  const at = loc(game, code)!;
  reveal(game, at);
  placeInvestigator(game, R, at);
  return at;
};
/** a revealed in-game Historical Society of the floor */
const society = (game: GameContext, floor: string[]) => inGame(game, floor)[0];
/** to the next round's first turn */
const nextRound = (r: Result) =>
  toTurn(
    until(
      pick(r, "End turn"),
      (x) => x.state.round === r.state.round + 1 && x.state.pending?.kind === "turn",
    ),
    R,
  );
/** the current act made this one, the ones before it gone */
function toAct(game: GameContext, code: string) {
  const now = currentAct(game)!;
  moveCard(game, now, ZONE.Removed);
  const next = findByCode(game, code, [ZONE.ActDeck])!;
  moveCard(game, next.id, ZONE.Act, { deck: "a" });
}
function toAgenda(game: GameContext, code: string) {
  const now = currentAgenda(game)!;
  moveCard(game, now, ZONE.Removed);
  const next = findByCode(game, code, [ZONE.AgendaDeck])!;
  moveCard(game, next.id, ZONE.Agenda, { deck: "a" });
}

// ---------- 4.1 setup ----------
describe("setup", () => {
  it("Entry Hall, both Quiet Halls and two Historical Societies per floor; the third of each floor out of the game", () => {
    const g = gOf(eotp({ invs: [R, D] }));
    for (const c of [ENTRY_HALL, QUIET_2, QUIET_3]) expect(loc(g, c)).toBeDefined();
    for (const floor of [GROUND, SECOND, THIRD]) {
      expect(inGame(g, floor)).toHaveLength(2);
      const out = floor.filter((c) => !loc(g, c));
      expect(findByCode(g, out[0], [ZONE.Removed])).toBeDefined();
    }
    expect(codeOf(g, inv(g, R).location)).toBe(ENTRY_HALL);
    expect(codeOf(g, inv(g, D).location)).toBe(ENTRY_HALL);
  });

  it("the floors' Societies are random", () => {
    const pick = (seed: number) =>
      inGame(gOf(eotp({ seed })), [...GROUND, ...SECOND, ...THIRD]).join();
    expect(new Set([1, 2, 3, 4, 5, 6].map(pick)).size).toBeGreaterThan(1);
  });

  it("set aside: Hidden Library, Possessed Oathspeaker, Mr. Peabody, The Tattered Cloak, Clasp of Black Onyx, and Sebastien unless slain", () => {
    const g = gOf(eotp());
    for (const c of [LIBRARY, OATHSPEAKER, PEABODY, "03142", "03143", SEBASTIEN])
      expect(findByCode(g, c)?.zone).toBe(ZONE.SetAside);
    const slain = gOf(eotp({ log: { [SEBASTIEN]: true } }));
    expect(findByCode(slain, SEBASTIEN)).toBeUndefined();
  });

  it("Sebastien interviewed: 1 clue per investigator on the Entry Hall", () => {
    const at = (log: Record<string, unknown>) => {
      const g = gOf(eotp({ invs: [R, D], log }));
      return card(g, loc(g, ENTRY_HALL)!).clues;
    };
    expect(at({ "03079": true })).toBe(2);
    expect(at({})).toBe(0);
  });

  it("Seekers of Carcosa by the number of investigators, each at a different Society (revealed by it)", () => {
    const seekers = (invs: string[]) => {
      const g = gOf(eotp({ invs }));
      return enemies(g)
        .filter((e) => e.code === SEEKER)
        .map((e) => e.location!);
    };
    expect(seekers([R])).toHaveLength(0);
    const g2 = gOf(eotp({ invs: [R, D] }));
    const two = enemies(g2).filter((e) => e.code === SEEKER);
    expect(two).toHaveLength(1);
    expect(THIRD).toContain(codeOf(g2, two[0].location));
    expect(card(g2, two[0].location!).revealed).toBe(true);
    const three = seekers([R, D, "01003"]);
    expect(new Set(three).size).toBe(2);
    const g4 = gOf(eotp({ invs: [R, D, "01003", "01004"] }));
    const four = enemies(g4).filter((e) => e.code === SEEKER);
    expect(new Set(four.map((e) => e.location)).size).toBe(3);
    for (const e of four) expect([...SECOND, ...THIRD]).toContain(codeOf(g4, e.location));
  });

  it("the encounter deck holds the five Midnight Masks treacheries and none of its locations, acts or agendas", () => {
    const g = gOf(eotp());
    const deck = allCards(g)
      .filter((c) => c.zone === ZONE.EncounterDeck)
      .map((c) => c.code);
    expect(deck.filter((c) => c === "01135")).toHaveLength(3);
    expect(deck.filter((c) => c === "01136")).toHaveLength(2);
    expect(deck.some((c) => /^011(2\d|3[0-4])/.test(c))).toBe(false);
    expect(deck).toContain(ACOLYTE); // Dark Cult
  });

  it("the investigators fled the dinner party: 1 more action in the first turn only", () => {
    let r = eotp({ log: { fledDinnerParty: true } });
    expect(inv(gOf(r), R).actionsLeft).toBe(4);
    r = nextRound(r);
    expect(inv(gOf(r), R).actionsLeft).toBe(3);
    expect(inv(gOf(eotp()), R).actionsLeft).toBe(3);
  });
});

// ---------- 4.2 tokens ----------
describe("chaos tokens", () => {
  const draw = (bag: ChaosToken[], difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(eotp({ bag, difficulty, prep }), testOf("willpower", against));
  const doomed = (game: GameContext) => {
    const at = loc(game, QUIET_2)!;
    setCounter(game, putEnemy(game, GHOUL, at), "doom", 2);
    setCounter(game, putEnemy(game, GHOUL, at), "doom", 1);
  };

  it("skull −X: the most doom on one enemy; Hard: the doom on all enemies", () => {
    expect(mods(draw(["skull"], "standard", 0, doomed))).toEqual([-2]);
    expect(mods(draw(["skull"], "hard", 0, doomed))).toEqual([-3]);
  });

  it("cultist −2, a failure places 1 doom on the nearest enemy; Hard −4 and always", () => {
    const near = (game: GameContext) => void putEnemy(game, GHOUL, loc(game, QUIET_2)!);
    const doom = (r: Result) => enemies(gOf(r)).reduce((n, e) => n + e.doom, 0);
    expect(doom(draw(["cultist"], "standard", 0, near))).toBe(0);
    expect(doom(draw(["cultist"], "standard", 10, near))).toBe(1);
    const hard = draw(["cultist"], "hard", 0, near);
    expect(mods(hard)).toEqual([-4]);
    expect(doom(hard)).toBe(1);
  });

  it("tablet −2, a failure discards a random card from your hand; Hard always", () => {
    const n = (r: Result) => inv(gOf(r), R).hand.length;
    const before = n(eotp());
    expect(n(draw(["tablet"], "standard", 0))).toBe(before);
    expect(n(draw(["tablet"], "standard", 10))).toBe(before - 1);
    expect(n(draw(["tablet"], "hard", 0))).toBe(before - 1);
  });

  it("elder thing −2, a failure with an enemy at your location takes 1 horror; Hard always", () => {
    const here = (game: GameContext) => void putEnemy(game, GHOUL, inv(game, R).location!);
    expect(inv(gOf(draw(["elderThing"], "standard", 10)), R).horror).toBe(0);
    expect(inv(gOf(draw(["elderThing"], "standard", 10, here)), R).horror).toBe(1);
    expect(inv(gOf(draw(["elderThing"], "hard", 0, here)), R).horror).toBe(1);
  });
});

// ---------- 4.5 connections ----------
describe("connections", () => {
  const links = (game: GameContext, code: string, enemy = false) =>
    connections(game, loc(game, code)!, enemy)
      .map((id) => card(game, id).code)
      .sort();

  it("the map: Entry Hall–Quiet Halls (2nd)–Quiet Halls (3rd); each hall to the Societies of its floor", () => {
    const g = gOf(eotp());
    expect(links(g, ENTRY_HALL)).toEqual([...inGame(g, GROUND), QUIET_2].sort());
    expect(links(g, QUIET_2)).toEqual([...inGame(g, SECOND), ENTRY_HALL, QUIET_3].sort());
    expect(links(g, QUIET_3)).toEqual([...inGame(g, THIRD), QUIET_2].sort());
    for (const c of inGame(g, [...GROUND, ...SECOND, ...THIRD]))
      expect(links(g, c)).toHaveLength(1);
  });

  it("the floors are rows of the map, the Societies on either side of their hall", () => {
    const g = gOf(eotp());
    const cell = (c: string) => g.s.world.tables.cell[loc(g, c)!];
    expect(cell(QUIET_3)).toEqual([1, 0]);
    expect(inGame(g, SECOND).map(cell)).toEqual([
      [0, 1],
      [2, 1],
    ]);
  });

  it("act 3: the Passageways are connected to one another; the Hidden Library only for an enemy's move", () => {
    // every Passageway Society in play
    const r = eotp({
      seed: 3,
      prep: (g) => {
        toAct(g, "03126");
        moveCard(g, findByCode(g, LIBRARY, [ZONE.SetAside])!.id, ZONE.Location);
      },
    });
    const g = gOf(r);
    const ways = inGame(g, ["03128", "03133", "03136", "03137"]);
    expect(ways.length).toBeGreaterThanOrEqual(2);
    for (const w of ways)
      expect(links(g, w)).toEqual(expect.arrayContaining(ways.filter((x) => x !== w)));
    expect(links(g, LIBRARY)).toEqual([]);
    expect(links(g, LIBRARY, true)).toEqual([...ways].sort());
    // before act 3 they are not
    const before = gOf(eotp({ seed: 3 }));
    expect(links(before, ways[0])).not.toContain(ways[1]);
  });
});

// ---------- 4.3 the agendas ----------
describe("the agendas", () => {
  it("the mythos phase places no doom on the agenda", () => {
    const r = nextRound(eotp());
    expect(card(gOf(r), currentAgenda(gOf(r))!).doom).toBe(0);
  });

  it("clues placed on an enemy turn to doom", () => {
    let e = "";
    const r = run(
      eotp({
        prep: (g) => {
          e = putEnemy(g, ACOLYTE, loc(g, QUIET_2)!);
          setCounter(g, e, "doom", 0);
          setCounter(g, R, "clues", 1);
        },
      }),
      {
        t: STEP.Eff,
        effect: {
          op: "moveClues",
          amount: 1,
          from: "you",
          to: "chooseEnemy",
          filter: { trait: "Cultist" },
        },
        ctx: { you: R, source: null },
      },
    );
    expect(card(gOf(r), e)).toMatchObject({ clues: 0, doom: 1 });
  });

  it("the doom on enemies counts toward the threshold, checked in the mythos phase; 1b shuffles the discard pile back", () => {
    const r = nextRound(
      eotp({
        prep: (g) => {
          setCounter(g, putEnemy(g, GHOUL, loc(g, QUIET_3)!), "doom", 2);
          moveCard(g, createCard(g, "01135", ZONE.Limbo), ZONE.EncounterDiscard);
        },
      }),
    );
    const g = gOf(r);
    expect(codeOf(g, currentAgenda(g))).toBe("03122");
    expect(allCards(g).filter((c) => c.zone === ZONE.EncounterDiscard)).toHaveLength(0);
  });

  it("2b: the Oathspeaker spawns at the Entry Hall, with Sebastien unless he was slain", () => {
    const spawned = (log: Record<string, unknown>) => {
      const r = run(eotp({ log, prep: (g) => toAgenda(g, "03122") }), { t: STEP.AdvanceAgenda });
      const g = gOf(r);
      return enemies(g)
        .filter((e) => codeOf(g, e.location) === ENTRY_HALL)
        .map((e) => e.code)
        .sort();
    };
    expect(spawned({})).toEqual([SEBASTIEN, OATHSPEAKER]);
    expect(spawned({ [SEBASTIEN]: true })).toEqual([OATHSPEAKER]);
  });

  it("3b: (→R4)", () => {
    const r = until(
      inject(eotp({ prep: (g) => toAgenda(g, "03123") }), () => {}, { t: STEP.AdvanceAgenda }),
      () => false,
    );
    expect(r.state.resolution).toBe("R4");
  });
});

// ---------- 4.3 the acts ----------
describe("the acts", () => {
  it("1b: each revealed Historical Society gets 1 clue per investigator, to its clue value", () => {
    let soc = "";
    const r = run(
      eotp({
        invs: [R, D],
        prep: (g) => {
          soc = society(g, THIRD);
          reveal(g, loc(g, soc)!);
          setCounter(g, loc(g, soc)!, "clues", 0);
          const other = society(g, SECOND);
          setCounter(g, loc(g, other)!, "clues", 0); // unrevealed: none
        },
      }),
      { t: STEP.AdvanceAct },
    );
    const g = gOf(r);
    expect(card(g, loc(g, soc)!).clues).toBe(2);
    expect(card(g, loc(g, society(g, SECOND))!).clues).toBe(0);
    expect(codeOf(g, currentAct(g))).toBe("03125");
  });

  it("2b: the lead chooses who takes control of Mr. Peabody; the Hidden Library enters play", () => {
    let r = inject(eotp({ invs: [R, D], prep: (g) => toAct(g, "03125") }), () => {}, {
      t: STEP.AdvanceAct,
    });
    r = toTurn(pick(r, /Wendy|Daisy|Walker/), R);
    const g = gOf(r);
    expect(findByCode(g, PEABODY)).toMatchObject({ zone: ZONE.Play, controller: D });
    expect(loc(g, LIBRARY)).toBeDefined();
    expect(codeOf(g, currentAct(g))).toBe("03126");
  });

  it("3: the clues are spent only by investigators in the Hidden Library", () => {
    const prep = (at: string) => (game: GameContext) => {
      toAct(game, "03126");
      moveCard(game, findByCode(game, LIBRARY, [ZONE.SetAside])!.id, ZONE.Location);
      visit(game, at);
      setCounter(game, R, "clues", 3);
    };
    expect(options(eotp({ prep: prep(LIBRARY) })).some((o) => /Advance act/.test(o))).toBe(true);
    expect(options(eotp({ prep: prep(ENTRY_HALL) })).some((o) => /Advance act/.test(o))).toBe(
      false,
    );
  });

  it("3b: the investigators decide: take the clasp (→R1) or leave it (→R2)", () => {
    const end = (choice: RegExp) => {
      const r = inject(eotp({ prep: (g) => toAct(g, "03126") }), () => {}, { t: STEP.AdvanceAct });
      return until(pick(r, choice), () => false).state.resolution;
    };
    expect(end(/take it with us/)).toBe("R1");
    expect(end(/Leave it behind/)).toBe("R2");
  });
});

// ---------- 4.4 cards ----------
describe("Mr. Peabody and the Hidden Library", () => {
  it("Mr. Peabody: a location gets -1 shroud and becomes a Passageway until he readies", () => {
    let r = eotp({
      prep: (g) => {
        toAct(g, "03126");
        inPlay(g, R, PEABODY);
        reveal(g, loc(g, QUIET_2)!);
      },
    });
    const before = shroud(gOf(r), loc(gOf(r), QUIET_2)!);
    r = use(r, PEABODY);
    r = toTurn(pick(r, /^Quiet Halls/), R);
    let g = gOf(r);
    expect(shroud(g, loc(g, QUIET_2)!)).toBe(before - 1);
    const ways = inGame(g, ["03128", "03133", "03136", "03137"]);
    expect(connections(g, loc(g, QUIET_2)!).map((id) => card(g, id).code)).toEqual(
      expect.arrayContaining(ways),
    );
    r = nextRound(r);
    g = gOf(r);
    expect(shroud(g, loc(g, QUIET_2)!)).toBe(before);
  });

  it("Peabody's Office: -2 shroud while an investigator there controls Mr. Peabody", () => {
    const g = gOf(
      eotp({
        prep: (g) => {
          const office = createCard(g, "03137", ZONE.Limbo);
          moveCard(g, office, ZONE.Location);
          reveal(g, office);
          placeInvestigator(g, R, office);
          inPlay(g, R, PEABODY);
        },
      }),
    );
    expect(shroud(g, inv(g, R).location!)).toBe(2);
  });
});

describe("Possessed Oathspeaker", () => {
  const withHim = (act: string, prep?: (game: GameContext) => void) =>
    eotp({
      prep: (g) => {
        toAct(g, act);
        putEnemy(g, OATHSPEAKER, inv(g, R).location!, R);
        prep?.(g);
      },
    });
  const him = (r: Result) => enemies(gOf(r)).find((e) => e.code === OATHSPEAKER)!;

  it("cannot be damaged during act 1 or act 2", () => {
    expect(hasFlag(gOf(withHim("03125")), him(withHim("03125")).id, "cannotBeDamaged")).toBe(true);
    expect(hasFlag(gOf(withHim("03126")), him(withHim("03126")).id, "cannotBeDamaged")).toBe(false);
  });

  it("at the beginning of the enemy phase the investigators ready it or place 1 doom on it", () => {
    let r = withHim("03126", (g) => exhaust(g, enemies(g).find((e) => e.code === OATHSPEAKER)!.id));
    r = until(pick(r, "End turn"), (x) => /must decide/.test(x.state.pending?.prompt ?? ""));
    expect(options(r)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Ready/), expect.stringMatching(/doom/)]),
    );
    r = until(pick(r, /doom/), (x) => x.state.phase === "upkeep");
    expect(him(r).doom).toBe(1);
  });

  it("defeated: (→R3)", () => {
    const r = withHim("03126");
    const end = until(
      inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: him(r).id, by: R }),
      () => false,
    );
    expect(end.state.resolution).toBe("R3");
  });
});

describe("Seeker of Carcosa", () => {
  it("at the end of the mythos phase it takes 1 clue from its location (turned to doom); with none, 1 doom", () => {
    let r = eotp({ invs: [R, D] });
    const g0 = gOf(r);
    const s0 = enemies(g0).find((e) => e.code === SEEKER)!;
    const clues0 = card(g0, s0.location!).clues;
    r = nextRound(r);
    const g = gOf(r);
    const s = card(g, s0.id);
    expect(s.doom).toBe(1);
    expect(card(g, s0.location!).clues).toBe(clues0 - 1);
    const empty = nextRound(
      eotp({
        invs: [R, D],
        prep: (g) =>
          setCounter(g, enemies(g).find((e) => e.code === SEEKER)!.location!, "clues", 0),
      }),
    );
    expect(enemies(gOf(empty)).find((e) => e.code === SEEKER)!.doom).toBe(1);
  });
});

describe("locations", () => {
  it("Meeting Room: exhaust an Ally asset to discover a clue (once per round)", () => {
    let r = eotp({
      prep: (g) => {
        const room = createCard(g, "03128", ZONE.Limbo);
        moveCard(g, room, ZONE.Location);
        reveal(g, room);
        setCounter(g, room, "clues", 2);
        placeInvestigator(g, R, room);
        inPlay(g, R, "01117"); // Lita Chantler, an Ally
      },
    });
    r = toTurn(pick(r, /Meeting Room/), R);
    expect(inv(gOf(r), R).clues).toBe(1);
    expect(options(r).some((o) => /Meeting Room/.test(o))).toBe(false);
  });

  it("Historical Museum: while investigating it, your intellect cannot be increased", () => {
    let r = eotp({
      bag: ["0"],
      prep: (g) => {
        const museum = createCard(g, "03130", ZONE.Limbo);
        moveCard(g, museum, ZONE.Location);
        reveal(g, museum);
        placeInvestigator(g, R, museum);
        addTempMod(g, { stat: "intellect", value: 2 }, R, "round");
      },
    });
    r = toTurn(pick(r, /^Investigate/), R);
    expect(lastTest(r)).toMatchObject({ skill: "intellect", total: 3 });
  });

  it("Record Office: each enemy there gets +1 fight and +1 evade", () => {
    let e = "";
    const g = gOf(
      eotp({
        prep: (g) => {
          const office = createCard(g, "03129", ZONE.Limbo);
          moveCard(g, office, ZONE.Location);
          reveal(g, office);
          e = putEnemy(g, GHOUL, office);
        },
      }),
    );
    expect(enemies(g).find((x) => x.id === e)).toBeDefined();
    expect(enemyStat(g, e, "fight")).toBe(3);
    expect(enemyStat(g, e, "evade")).toBe(3);
  });

  it("Quiet Halls: with every location revealed and no clues on them, places 1 clue per investigator on itself", () => {
    const prep = (clear: boolean) => (game: GameContext) => {
      for (const l of allCards(game).filter((c) => c.zone === ZONE.Location)) {
        reveal(game, l.id);
        setCounter(game, l.id, "clues", clear ? 0 : 1);
      }
      placeInvestigator(game, R, loc(game, QUIET_2)!);
    };
    expect(options(eotp({ prep: prep(false) })).some((o) => /Quiet Halls: place/.test(o))).toBe(
      false,
    );
    const r = toTurn(pick(eotp({ prep: prep(true) }), /Quiet Halls: place/), R);
    expect(card(gOf(r), loc(gOf(r), QUIET_2)!).clues).toBe(1);
  });
});

describe("treacheries", () => {
  function draw(r: Result, c: string): Result {
    let id = "";
    const made = inject(r, (g) => {
      id = createCard(g, c, ZONE.EncounterDeck);
    });
    return inject(made, () => {}, { t: STEP.DrawEncounter, inv: R, card: id });
  }

  it("03145 Led Astray: a clue onto a Cultist enemy (turned to doom), or 1 doom on the agenda", () => {
    let e = "";
    let r = draw(
      eotp({
        prep: (g) => {
          e = putEnemy(g, ACOLYTE, loc(g, QUIET_2)!);
          setCounter(g, e, "doom", 0);
          setCounter(g, R, "clues", 1);
        },
      }),
      "03145",
    );
    r = toTurn(pick(r, /Cultist enemy/), R);
    expect(card(gOf(r), e)).toMatchObject({ clues: 0, doom: 1 });
    r = toTurn(draw(eotp(), "03145"), R);
    expect(card(gOf(r), currentAgenda(gOf(r))!).doom).toBe(1);
  });

  it("03146 The Cult's Search: the doom on Cultist enemies moves to the agenda; with none, a Cultist enemy is drawn", () => {
    let e = "";
    let r = toTurn(
      draw(
        eotp({
          prep: (g) => {
            e = putEnemy(g, ACOLYTE, loc(g, QUIET_3)!);
            setCounter(g, e, "doom", 1);
          },
        }),
        "03146",
      ),
      R,
    );
    let g = gOf(r);
    expect(card(g, e).doom).toBe(0);
    expect(card(g, currentAgenda(g)!).doom).toBe(1);
    r = toTurn(draw(eotp(), "03146"), R);
    g = gOf(r);
    expect(enemies(g).length).toBeGreaterThan(0);
  });
});

describe("the player cards earned here", () => {
  it("03142 Clasp of Black Onyx: each other card in your hand costs 1 more while it is there", () => {
    let knife = "";
    const g = gOf(
      eotp({
        prep: (g) => {
          knife = hand(g, R, "01086");
          hand(g, R, "03142");
        },
      }),
    );
    expect(playCost(g, R, knife)).toBe(2);
    const clasp = allCards(g).find((c) => c.code === "03142")!.id;
    expect(playCost(g, R, clasp)).toBe(1);
  });

  it("03143 The Tattered Cloak: -1 sanity; +1 willpower, combat and agility at 3 or less remaining sanity", () => {
    const g = gOf(eotp({ prep: (g) => void inPlay(g, R, "03143") }));
    expect(skillValue(g, R, "combat")).toBe(4);
    const low = gOf(
      eotp({
        prep: (g) => {
          inPlay(g, R, "03143");
          setCounter(g, R, "horror", 5);
        },
      }),
    );
    expect(skillValue(low, R, "combat")).toBe(5);
  });
});

// ---------- 4.6 the end ----------
describe("the end of the game", () => {
  it("records Sebastien in the victory display under VIPs Slain", () => {
    const r = until(
      inject(
        eotp({
          prep: (g) => moveCard(g, findByCode(g, SEBASTIEN, [ZONE.SetAside])!.id, ZONE.Victory),
        }),
        () => {},
        { t: STEP.Resolution, id: "R2" },
      ),
      () => false,
    );
    expect(r.state.flags[`log:vipsSlain:${SEBASTIEN}`]).toBe(true);
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
    const setup = scenarioSetup(db, c, 1);
    let r = toTurn(skipMulligans(createGame(db, setup)));
    r = inject(r, fn, { t: STEP.Resolution, id: resolution });
    return applyScenarioEnd(db, c, r.state);
  }
  /** at Echoes of the Past: Curtain Call R1, The Last King R1, Interlude I */
  const atEchoes = () => {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-path-to-carcosa",
        difficulty: "standard",
        seed: 2,
        investigators: [{ code: R, deckId: "roland-starter" }],
      }),
    );
    c = walk(finish(c, "R1", () => {}));
    c = walk(finish(c, "R1", () => {}));
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "echoes-of-the-past" });
    return c;
  };

  it("no prompt for Sebastien: the scenario records him; R1 takes the clasp and marks Conviction", () => {
    const c = walk(
      finish(atEchoes(), "R1", (g) =>
        moveCard(g, findByCode(g, SEBASTIEN, [ZONE.SetAside])!.id, ZONE.Victory),
      ),
    );
    expect(hasEntry(c.log, SEBASTIEN, "vipsSlain")).toBe(true);
    expect(hasEntry(c.log, "tookOnyxClasp", "campaign_notes")).toBe(true);
    expect(c.investigators[0].deck).toContain("03142");
    expect(JSON.stringify(c.flow)).not.toMatch(/prompt_sebastien_moreau/);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-unspeakable-oath" });
  });

  it("no resolution goes the way of R4", () => {
    const f = db.flows["the-path-to-carcosa"];
    expect(f.resolutions["echoes-of-the-past"].none).toEqual(
      f.resolutions["echoes-of-the-past"].R4,
    );
    const c = walk(finish(atEchoes(), "none", () => {}));
    expect(hasEntry(c.log, "followersOfSignFoundWay", "campaign_notes")).toBe(true);
    for (const t of ["cultist", "tablet", "elderThing"] as const)
      expect(c.chaosBag.filter((x) => x === t).length).toBe(1);
  });
});
