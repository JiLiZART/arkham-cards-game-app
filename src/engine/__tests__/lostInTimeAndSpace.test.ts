/** Lost in Time and Space (campaign-the-dunwich-legacy, group 8): setup, tokens, the map, cards, acts and agendas, the campaign. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty, Effect } from "../../content/schema";
import { createGame, dispatch, type Result } from "../index";
import { next } from "../world/rng";
import { db, gOf, mutate, pick, skipMulligans } from "../kits/testkit";
import { game, inject, lastTest, move, toTurn, until, use } from "../kits/driver";
import { cardsIn, connections, enemies, enemyStat, findByCode, locations } from "../queries";
import {
  card,
  currentAct,
  currentAgenda,
  inv,
  placeInvestigator,
  reveal,
  setCounter,
  setStatus,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import * as flags from "../world/flags";
import { tokenX } from "../rules/tokens";
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
const AD = "02320";
const EDGE = "02321";
const TTT = "02322";
const YOG = "02323";
const TEAR = "02324";
const CASCADE = "02325";
const BRIDGE = "02326";
const STEPS = "02327";
const DOORWAY = "02328";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const litas = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
  prep,
}: Opts = {}) =>
  game({
    scenario: "lost-in-time-and-space",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-dunwich-legacy", difficulty, campaignLog: log },
  });

const loc = (game: GameContext, code: string): InstId | undefined =>
  findByCode(game, code, [ZONE.Location])?.id;
/** a copy of an encounter location put into play revealed with its clues (`n`: which copy, from the encounter deck) */
function place(game: GameContext, code: string): InstId {
  const c = cardsIn(game, ZONE.EncounterDeck).find((x) => x.code === code);
  const id =
    c?.id ?? findByCode(game, code, [ZONE.SetAside])?.id ?? createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  reveal(game, id);
  setCounter(game, id, "clues", game.db.cards[code].clues ?? 0);
  return id;
}
/** a card of this code on top of the encounter deck */
function onTop(game: GameContext, code: string): InstId {
  const c = cardsIn(game, ZONE.EncounterDeck).find((x) => x.code === code);
  const id = c?.id ?? createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.EncounterDeck, { top: true });
  return id;
}
const at = (r: Result, who = R) => inv(gOf(r), who).location!;
const codeAt = (r: Result, who = R) => card(gOf(r), at(r, who)).code;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const test = (skill: "willpower" | "agility" | "intellect", difficulty = 0): Step => ({
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
    id = cardsIn(g, ZONE.EncounterDeck).find((x) => x.code === code)?.id ?? "";
    if (!id) id = createCard(g, code, ZONE.Limbo);
    else moveCard(g, id, ZONE.Limbo);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const actCode = (r: Result) => card(gOf(r), currentAct(gOf(r))!).code;
const agendaCode = (r: Result) => card(gOf(r), currentAgenda(gOf(r))!).code;
const codes = (game: GameContext, ids: InstId[]) => ids.map((id) => card(game, id).code).sort();
/** make this act (or agenda) the current one */
function toCard(game: GameContext, code: string) {
  const zone = game.db.cards[code].type === "act" ? ZONE.Act : ZONE.Agenda;
  const deck = zone === ZONE.Act ? ZONE.ActDeck : ZONE.AgendaDeck;
  // the cards before it in its deck, and the current one, are gone
  for (const c of cardsIn(game, deck).filter((x) => x.code < code))
    moveCard(game, c.id, ZONE.Removed);
  const id = findByCode(game, code, [deck])!.id;
  moveCard(game, zone === ZONE.Act ? currentAct(game)! : currentAgenda(game)!, ZONE.Removed);
  moveCard(game, id, zone, { deck: "a" });
}
const horror = (r: Result, who = R) => inv(gOf(r), who).horror;

// ---------- 8.2 setup ----------
describe("setup", () => {
  it("Another Dimension in play, everyone there; the Edge, Tear Through Time and Yog-Sothoth set aside; the single-sided locations in the encounter deck", () => {
    const g = gOf(litas({ invs: [R, D] }));
    expect(
      codes(
        g,
        locations(g).map((l) => l.id),
      ),
    ).toEqual([AD]);
    for (const i of [R, D]) expect(card(g, inv(g, i).location!).code).toBe(AD);
    expect(
      codes(
        g,
        cardsIn(g, ZONE.SetAside).map((c) => c.id),
      ),
    ).toEqual([EDGE, TTT, YOG]);
    const deck = cardsIn(g, ZONE.EncounterDeck).map((c) => c.code);
    for (const [code, n] of [
      [TEAR, 4],
      [CASCADE, 2],
      [BRIDGE, 2],
      [STEPS, 1],
      [DOORWAY, 1],
    ] as const)
      expect(deck.filter((c) => c === code)).toHaveLength(n);
    // a set-aside location connects to nothing until it is in play
    expect(connections(g, loc(g, AD)!)).toEqual([]);
  });
});

// ---------- 8.3 chaos tokens ----------
describe("chaos tokens", () => {
  const testWith = (token: ChaosToken, difficulty: Difficulty, prep?: Opts["prep"], against = 0) =>
    run(litas({ bag: [token], difficulty, prep }), test("willpower", against));
  const extra = (n: number) => (game: GameContext) => {
    const list = [TEAR, TEAR, TEAR, TEAR, CASCADE, CASCADE, BRIDGE];
    for (const code of list.slice(0, n)) place(game, code);
  };

  it("skull: −1 per Extradimensional location in play, max −5 on Easy/Standard; no maximum on Hard/Expert", () => {
    expect(tokenX(gOf(litas({ prep: extra(3) })), "extradimensionalLocations", R)).toBe(3);
    for (const d of ["easy", "standard"] as const) {
      expect(mods(testWith("skull", d, extra(2)))).toEqual([-2]);
      expect(mods(testWith("skull", d, extra(7)))).toEqual([-5]);
    }
    for (const d of ["hard", "expert"] as const)
      expect(mods(testWith("skull", d, extra(7)))).toEqual([-7]);
  });

  it("elder thing: −X, X your location's shroud (twice it on Hard/Expert); a failure at an Extradimensional location discards it", () => {
    for (const [d, x] of [
      ["easy", -6],
      ["standard", -6],
      ["hard", -12],
      ["expert", -12],
    ] as const)
      expect(mods(testWith("elderThing", d))).toEqual([x]); // Another Dimension: shroud 6
    expect(tokenX(gOf(litas()), "yourLocationShroud", R)).toBe(6);
    // at Endless Bridge (shroud 4): failed, the Bridge is discarded and Roland is moved to Another Dimension
    let bridge = "";
    const r = testWith(
      "elderThing",
      "standard",
      (g) => {
        bridge = place(g, BRIDGE);
        placeInvestigator(g, R, bridge);
      },
      1,
    );
    expect(mods(r)).toEqual([-4]);
    expect(lastTest(r)!.success).toBe(false);
    expect(card(gOf(r), bridge).zone).toBe(ZONE.EncounterDiscard);
    expect(codeAt(r)).toBe(AD);
  });

  it("cultist: another token; on Easy/Standard a failure, after the test, discards until a location, which comes into play, and you move there", () => {
    // the seed whose first token is the cultist
    const fail = (d: Difficulty, against: number) => {
      for (let seed = 1; ; seed++) {
        const r = litas({
          bag: ["cultist", "0"],
          difficulty: d,
          seed,
          prep: (g) => void onTop(g, CASCADE),
        });
        const out = run(r, test("willpower", against));
        if (lastTest(out)!.tokens[0] === "cultist") return out;
      }
    };
    const failed = fail("standard", 10);
    expect(lastTest(failed)!.tokens).toHaveLength(2);
    expect(codeAt(failed)).toBe(CASCADE);
    // the agenda: moved by an encounter card effect, 1 horror
    expect(horror(failed)).toBe(1);
    const passed = fail("standard", 0);
    expect(codeAt(passed)).toBe(AD);
    expect(loc(gOf(passed), CASCADE)).toBeUndefined();
    // Hard/Expert: whether or not it failed
    expect(codeAt(fail("expert", 0))).toBe(CASCADE);
  });

  it("tablet: −3 (−5 on Hard/Expert); with Yog-Sothoth in play, it attacks you after the test", () => {
    for (const [d, m] of [
      ["easy", -3],
      ["standard", -3],
      ["hard", -5],
      ["expert", -5],
    ] as const)
      expect(mods(testWith("tablet", d))).toEqual([m]);
    const yogged = testWith("tablet", "standard", (g) => {
      const yog = findByCode(g, YOG, [ZONE.SetAside])!.id;
      moveCard(g, yog, ZONE.Enemy, { location: loc(g, AD)! });
    });
    expect(yogged.state.log.some((e) => e.type === "attack")).toBe(true);
  });
});

// ---------- 8.4 connections ----------
describe("connections", () => {
  it("by symbol, every copy of Tear Through Space sharing its row: the copies link to each other, to Another Dimension, Prismatic Cascade and Endless Bridge", () => {
    let a = "";
    let b = "";
    let cascade = "";
    const g = gOf(
      litas({
        prep: (g) => {
          a = place(g, TEAR);
          b = place(g, TEAR);
          cascade = place(g, CASCADE);
        },
      }),
    );
    expect(codes(g, connections(g, a))).toEqual([AD, TEAR, CASCADE].sort());
    expect(connections(g, a)).toContain(b);
    expect(connections(g, b)).toContain(a);
    expect(codes(g, connections(g, loc(g, AD)!))).toEqual([TEAR, TEAR, CASCADE].sort());
    expect(codes(g, connections(g, cascade))).toEqual([AD, TEAR, TEAR].sort());
  });

  it("Another Dimension's row from the card scan: square, diamond, triangle (Tear Through Space, Prismatic Cascade, Endless Bridge); the Edge links only to Steps and the Doorway", () => {
    const g = gOf(
      litas({
        prep: (g) => {
          for (const c of [TEAR, CASCADE, BRIDGE, STEPS, DOORWAY]) place(g, c);
          moveCard(g, findByCode(g, EDGE, [ZONE.SetAside])!.id, ZONE.Location);
        },
      }),
    );
    expect(codes(g, connections(g, loc(g, AD)!))).toEqual([TEAR, CASCADE, BRIDGE].sort());
    expect(codes(g, connections(g, loc(g, EDGE)!))).toEqual([STEPS, DOORWAY].sort());
    expect(codes(g, connections(g, loc(g, STEPS)!))).toEqual([CASCADE, EDGE].sort());
    expect(codes(g, connections(g, loc(g, DOORWAY)!))).toEqual([BRIDGE, EDGE].sort());
  });

  it("a location leaving play sends its investigators and enemies to Another Dimension (two copies of Tear Through Space in play)", () => {
    let a = "";
    let b = "";
    let enemy = "";
    let r = litas({
      invs: [R, D],
      prep: (g) => {
        a = place(g, TEAR);
        b = place(g, TEAR);
        placeInvestigator(g, R, a);
        enemy = createCard(g, "01160", ZONE.Limbo); // Ghoul Minion
        moveCard(g, enemy, ZONE.Enemy, { location: a });
      },
    });
    r = toTurn(inject(r, () => {}, { t: STEP.RemoveLocation, location: a }));
    const g = gOf(r);
    expect(card(g, a).zone).toBe(ZONE.EncounterDiscard);
    expect(inv(g, R).status).toBe("playing");
    expect(card(g, inv(g, R).location!).code).toBe(AD);
    expect(card(g, enemy).location).toBe(loc(g, AD));
    expect(connections(g, loc(g, AD)!)).toEqual([b]);
    expect(horror(r)).toBe(1); // moved by an encounter card effect
  });
});

// ---------- 8.5 cards ----------
describe("the locations", () => {
  it("Tear Through Space: drawn, it comes into play revealed with its clue and surges; at the end of the round, doom on it or discard it", () => {
    let r = litas({ prep: (g) => void onTop(g, "02331") }); // Collapsing Reality under it
    r = drawNew(r, TEAR);
    const g = gOf(r);
    const tear = loc(g, TEAR)!;
    expect([card(g, tear).revealed, card(g, tear).clues]).toEqual([true, 1]);
    expect(
      r.state.log.some((e) => e.type === "encounter" && /Collapsing Reality/.test(e.text)),
    ).toBe(true);
    // the end of the round: the lead chooses
    const ended = until(
      inject(toTurn(r, R), () => {}, { t: STEP.Window, trigger: "roundEnds", data: {} }),
      (x) => x.state.pending?.prompt === "Choose one:",
    );
    expect(ended.state.pending!.options.map((o) => o.label)).toEqual([
      "Place 1 doom on Tear Through Space",
      "Discard Tear Through Space",
    ]);
    expect(card(gOf(toTurn(pick(ended, "Place 1 doom on Tear Through Space"), R)), tear).doom).toBe(
      1,
    );
    expect(card(gOf(toTurn(pick(ended, "Discard Tear Through Space"), R)), tear).zone).toBe(
      ZONE.EncounterDiscard,
    );
  });

  it("Prismatic Cascade: a random card of your hand discarded; discarded once its last clue is gone", () => {
    let r = litas();
    const before = inv(gOf(r), R).hand.length;
    r = toTurn(drawNew(r, CASCADE), R);
    expect(inv(gOf(r), R).hand.length).toBe(before - 1);
    const cascade = loc(gOf(r), CASCADE)!;
    r = toTurn(
      inject(
        r,
        (g) => {
          placeInvestigator(g, R, cascade);
          setCounter(g, cascade, "clues", 1);
        },
        { t: STEP.DiscoverClues, inv: R, location: cascade, n: 1 },
      ),
      R,
    );
    expect(card(gOf(r), cascade).zone).toBe(ZONE.EncounterDiscard);
    expect(codeAt(r)).toBe(AD);
  });

  it("Endless Bridge: 2 resources lost; after an investigator leaves it, doom on it or discard it", () => {
    let r = litas();
    const res = inv(gOf(r), R).resources;
    r = toTurn(drawNew(r, BRIDGE), R);
    expect(inv(gOf(r), R).resources).toBe(res - 2);
    const bridge = loc(gOf(r), BRIDGE)!;
    r = mutate(r, (g) => placeInvestigator(g, R, bridge));
    r = until(move(r, AD), (x) => x.state.pending?.prompt === "Choose one:");
    expect(codeAt(r)).toBe(AD);
    r = toTurn(pick(r, "Discard Endless Bridge"), R);
    expect(card(gOf(r), bridge).zone).toBe(ZONE.EncounterDiscard);
    expect(horror(r)).toBe(0);
  });

  it("Steps of Y'hagharl: the topmost Madness card of your discard drawn; leaving it, a failed willpower (2) shuffles it into the encounter deck instead", () => {
    let r = litas({
      bag: ["autoFail"],
      prep: (g) => {
        const m = createCard(g, "01099", ZONE.Limbo, R); // Psychosis: into the threat area
        moveCard(g, m, ZONE.Discard, { inv: R });
      },
    });
    r = toTurn(drawNew(r, STEPS), R);
    const steps = loc(gOf(r), STEPS)!;
    expect(card(gOf(r), steps).revealed).toBe(true);
    expect(findByCode(gOf(r), "01099", [ZONE.Threat])).toBeDefined();
    r = mutate(r, (g) => {
      place(g, CASCADE);
      placeInvestigator(g, R, steps);
    });
    r = toTurn(move(r, CASCADE), R);
    expect(card(gOf(r), steps).zone).toBe(ZONE.EncounterDeck);
    expect(codeAt(r)).toBe(AD);
  });

  it("Dimensional Doorway: the topmost Hex card of the encounter discard drawn; at the end of your turn there, spend 2 resources or shuffle it back", () => {
    let r = litas({
      prep: (g) => {
        const hex = createCard(g, "02084", ZONE.Limbo); // Beyond the Veil: a Hex treachery
        moveCard(g, hex, ZONE.EncounterDiscard);
      },
    });
    r = toTurn(drawNew(r, DOORWAY), R);
    const doorway = loc(gOf(r), DOORWAY)!;
    r = mutate(r, (g) => {
      placeInvestigator(g, R, doorway);
      setCounter(g, R, "resources", 5);
    });
    r = until(pick(r, "End turn"), (x) => x.state.pending?.prompt === "Choose one:");
    r = toTurn(pick(r, "Spend 2 resources"), R);
    expect(inv(gOf(r), R).resources).toBeLessThanOrEqual(3 + 1);
    expect(card(gOf(r), doorway).zone).toBe(ZONE.Location);
    r = mutate(r, (g) => setCounter(g, R, "resources", 0));
    r = toTurn(
      until(pick(r, "End turn"), (x) => x.state.pending?.kind === "turn"),
      R,
    );
    expect(card(gOf(r), doorway).zone).toBe(ZONE.EncounterDeck);
  });

  it("The Edge of the Universe: you need 2 clues to move there", () => {
    let steps = "";
    let r = litas({
      prep: (g) => {
        steps = place(g, STEPS);
        moveCard(g, findByCode(g, EDGE, [ZONE.SetAside])!.id, ZONE.Location);
        placeInvestigator(g, R, steps);
        setCounter(g, R, "clues", 1);
      },
    });
    expect(() => move(r, EDGE)).toThrow(/not offered/);
    r = mutate(r, (g) => setCounter(g, R, "clues", 2));
    r = move(r, EDGE);
    expect(codeAt(toTurn(r, R))).toBe(EDGE);
  });

  it("Tear Through Time: spend 2 clues to resign", () => {
    let r = litas({
      invs: [R, D],
      prep: (g) => {
        moveCard(g, findByCode(g, TTT, [ZONE.SetAside])!.id, ZONE.Location);
        reveal(g, loc(g, TTT)!);
        placeInvestigator(g, R, loc(g, TTT)!);
        setCounter(g, R, "clues", 2);
      },
    });
    r = toTurn(use(r, TTT), (x) => inv(gOf(x), R).status !== "playing");
    expect(inv(gOf(r), R).status).toBe("resigned");
    expect(inv(gOf(r), R).clues).toBe(0);
  });
});

describe("the enemies", () => {
  it("Yog-Sothoth here is not immune to player card effects (only Realms Beyond makes it so)", () => {
    let gun = "";
    const r = mutate(
      litas({
        prep: (g) => {
          const yog = findByCode(g, YOG, [ZONE.SetAside])!.id;
          moveCard(g, yog, ZONE.Enemy, { location: loc(g, AD)! });
        },
      }),
      (g) => {
        gun = createCard(g, "01016", ZONE.Limbo); // .45 Automatic, a player card
      },
    );
    const yog = enemies(gOf(r)).find((e) => e.code === YOG)!.id;
    const effect: Effect = { op: "placeDoom", amount: 1, on: "nearestEnemy" };
    const after = run(r, { t: STEP.Eff, effect, ctx: { you: R, source: gun } } as Step);
    expect(card(gOf(after), yog).doom).toBe(1);
  });

  it("Yog-Sothoth: 4 + 6 health per investigator, cannot be evaded, no attacks of opportunity", () => {
    const r = litas({
      invs: [R, D],
      prep: (g) => {
        const yog = findByCode(g, YOG, [ZONE.SetAside])!.id;
        moveCard(g, yog, ZONE.Enemy, { location: loc(g, AD)! });
      },
    });
    const g = gOf(r);
    const yog = enemies(g).find((e) => e.code === YOG)!.id;
    expect(enemyStat(g, yog, "health")).toBe(16);
    const labels = r.state.pending!.options.map((o) => o.label);
    expect(labels.some((l) => l.startsWith("Evade Yog"))).toBe(false);
    expect(labels.some((l) => l.startsWith("Engage Yog"))).toBe(false); // Massive
  });

  it("Yog-Sothoth's reaction: discard X cards instead of X horror; an empty deck drives you insane", () => {
    let r = litas({
      prep: (g) => {
        const yog = findByCode(g, YOG, [ZONE.SetAside])!.id;
        moveCard(g, yog, ZONE.Enemy, { location: loc(g, AD)! });
      },
    });
    const yog = enemies(gOf(r)).find((e) => e.code === YOG)!.id;
    const deck = inv(gOf(r), R).deck.length;
    r = inject(r, () => {}, { t: STEP.EnemyAttack, enemy: yog, inv: R, aoo: false, key: "atk:t" });
    r = until(
      r,
      (x) => !!x.state.pending?.options.some((o) => /Yog-Sothoth: discard/.test(o.label)),
    );
    r = pick(r, /Yog-Sothoth: discard/);
    r = pick(r, "Discard 5 card(s) instead of 5 horror");
    r = toTurn(r, R);
    expect(inv(gOf(r), R).deck.length).toBe(deck - 5);
    expect(horror(r)).toBe(0);
    // an emptied deck: driven insane
    let e = litas({
      prep: (g) => {
        const y = findByCode(g, YOG, [ZONE.SetAside])!.id;
        moveCard(g, y, ZONE.Enemy, { location: loc(g, AD)! });
        for (const id of inv(g, R).deck.slice(2)) moveCard(g, id, ZONE.Discard, { inv: R });
      },
    });
    e = inject(e, () => {}, { t: STEP.EnemyAttack, enemy: yog, inv: R, aoo: false, key: "atk:t" });
    e = until(
      e,
      (x) => !!x.state.pending?.options.some((o) => /Yog-Sothoth: discard/.test(o.label)),
    );
    e = until(
      pick(pick(e, /Yog-Sothoth: discard/), "Discard 2 card(s) instead of 2 horror"),
      (x) => x.state.phase === "ended" || inv(gOf(x), R).status !== "playing",
    );
    expect(inv(gOf(e), R).status).toBe("defeated");
    expect(flags.insane.get(gOf(e), R)).toBe(true);
  });

  it("Interstellar Traveler spawns at an Extradimensional location and turns a clue there into doom on itself", () => {
    let tear = "";
    let r = litas({ prep: (g) => void (tear = place(g, TEAR)) });
    r = toTurn(drawNew(r, "02329"), R);
    const g = gOf(r);
    const t = enemies(g).find((e) => e.code === "02329")!;
    expect(t.location).toBe(tear);
    expect([card(g, tear).clues, t.doom]).toEqual([0, 1]);
  });

  it("Yithian Starseeker spawns in Another Dimension; attacking someone with more than 10 discards, it gains 1 doom", () => {
    let r = toTurn(drawNew(litas(), "02330"), R);
    const s = enemies(gOf(r)).find((e) => e.code === "02330")!;
    expect(card(gOf(r), s.location!).code).toBe(AD);
    r = mutate(r, (g) => {
      for (const id of inv(g, R).deck.slice(0, 11)) moveCard(g, id, ZONE.Discard, { inv: R });
    });
    r = toTurn(
      inject(r, () => {}, { t: STEP.EnemyAttack, enemy: s.id, inv: R, aoo: false, key: "atk:s" }),
      R,
    );
    expect(card(gOf(r), s.id).doom).toBe(1);
  });
});

describe("the treacheries", () => {
  it("Collapsing Reality: at an Extradimensional location it is discarded and you take 1 damage; elsewhere 2 damage", () => {
    expect(inv(gOf(toTurn(drawNew(litas(), "02331"), R)), R).damage).toBe(2);
    let tear = "";
    const r = toTurn(
      drawNew(
        litas({
          prep: (g) => {
            tear = place(g, TEAR);
            placeInvestigator(g, R, tear);
          },
        }),
        "02331",
      ),
      R,
    );
    expect(card(gOf(r), tear).zone).toBe(ZONE.EncounterDiscard);
    expect(codeAt(r)).toBe(AD);
    expect(inv(gOf(r), R).damage).toBe(1);
  });

  it("Wormhole: discards until a location, which resolves its revelation; you move there (1 horror from the agenda)", () => {
    const r = toTurn(drawNew(litas({ prep: (g) => void onTop(g, BRIDGE) }), "02332"), R);
    expect(codeAt(r)).toBe(BRIDGE);
    expect(inv(gOf(r), R).resources).toBe(5 - 2);
    expect(horror(r)).toBe(1);
  });

  it("Vast Expanse: surge with no Extradimensional location; else willpower (X), 1 horror per point failed", () => {
    const surged = toTurn(drawNew(litas({ prep: (g) => void onTop(g, "02331") }), "02333"), R);
    expect(inv(gOf(surged), R).damage).toBe(2); // the Collapsing Reality drawn by the surge
    const tested = toTurn(
      drawNew(
        litas({
          bag: ["-2"],
          prep: (g) => {
            for (const c of [TEAR, TEAR, CASCADE, BRIDGE]) place(g, c);
          },
        }),
        "02333",
      ),
      R,
    );
    expect(lastTest(tested)!.difficulty).toBe(4);
    expect(horror(tested)).toBe(3); // willpower 3 − 2 = 1 against 4
  });
});

// ---------- acts and agendas ----------
describe("acts and agendas", () => {
  it("the acts' action: the top 3 encounter cards discarded; a location among them chosen resolves its revelation", () => {
    let r = litas({
      prep: (g) => {
        onTop(g, "02331");
        onTop(g, BRIDGE);
        onTop(g, CASCADE);
      },
    });
    r = until(
      use(r, "02316"),
      (x) => x.state.pending?.prompt.startsWith("Choose a discarded") ?? false,
    );
    r = toTurn(pick(r, "Endless Bridge"), R);
    expect(loc(gOf(r), BRIDGE)).toBeDefined();
    expect(loc(gOf(r), CASCADE)).toBeUndefined();
    expect(cardsIn(gOf(r), ZONE.EncounterDiscard).map((c) => c.code)).toContain(CASCADE);
  });

  it("act 1's back: the Edge into play; act 2: entering the Edge advances; act 3: only those at the Edge spend, its back removes the Edge (to Another Dimension) and puts Tear Through Time into play", () => {
    let r = run(litas(), { t: STEP.AdvanceAct });
    expect(actCode(r)).toBe("02317");
    expect(loc(gOf(r), EDGE)).toBeDefined();
    r = mutate(r, (g) => {
      const steps = place(g, STEPS);
      placeInvestigator(g, R, steps);
      setCounter(g, R, "clues", 3);
    });
    r = toTurn(move(r, EDGE), R);
    expect(actCode(r)).toBe("02318");
    r = run(r, { t: STEP.AdvanceAct });
    expect(actCode(r)).toBe("02319");
    expect(loc(gOf(r), EDGE)).toBeUndefined();
    expect(findByCode(gOf(r), EDGE, [ZONE.Removed])).toBeDefined();
    expect(codeAt(r)).toBe(AD);
    expect(loc(gOf(r), TTT)).toBeDefined();
  });

  it("act 4: when everyone left has resigned (→R1); everyone defeated: no resolution", () => {
    const resign = (by: "resign" | "effect") =>
      until(
        inject(litas(), (g) => toCard(g, "02319"), { t: STEP.Defeated, inv: R, by }),
        (x) => x.state.phase === "ended",
      );
    expect(resign("resign").state.resolution).toBe("R1");
    expect(resign("effect").state.resolution).toBe("none");
  });

  it("agenda 1's back: the lead resolves a location found in the encounter deck; 1 horror each if the students were not saved", () => {
    // Endless Bridge the only location left in the encounter deck
    const back = (log: Record<string, unknown>) =>
      run(
        litas({
          log,
          prep: (g) => {
            for (const c of cardsIn(g, ZONE.EncounterDeck))
              if (g.db.cards[c.code].type === "location" && c.code !== BRIDGE)
                moveCard(g, c.id, ZONE.Removed);
          },
        }),
        { t: STEP.AdvanceAgenda },
      );
    const plain = back({});
    expect(agendaCode(plain)).toBe("02313");
    expect(loc(gOf(plain), BRIDGE)).toBeDefined();
    expect(horror(plain)).toBe(0);
    expect(horror(back({ failedToSaveStudents: true }))).toBe(1);
  });

  it("agenda 2's back: each investigator tests willpower (X), X the names sacrificed; damage per point failed", () => {
    const r = run(
      litas({
        bag: ["0"],
        log: { sacrificed: ["02080", "02079", "02060", "02061", "02040"] },
        prep: (g) => toCard(g, "02313"),
      }),
      { t: STEP.AdvanceAgenda },
    );
    expect(agendaCode(r)).toBe("02314");
    expect(lastTest(r)!.difficulty).toBe(5);
    expect(inv(gOf(r), R).damage).toBe(2);
  });

  it("agenda 3's back: Yog-Sothoth spawns at the Edge, else in Another Dimension", () => {
    const r = run(litas({ prep: (g) => toCard(g, "02314") }), { t: STEP.AdvanceAgenda });
    expect(agendaCode(r)).toBe("02315");
    const yog = enemies(gOf(r)).find((e) => e.code === YOG)!;
    expect(card(gOf(r), yog.location!).code).toBe(AD);
  });

  it("agenda 4 at its threshold: Yog-Sothoth attacks each investigator wherever it is, the doom is removed and the agenda stays; Yog-Sothoth defeated (→R3)", () => {
    let r = litas({
      invs: [R, D],
      prep: (g) => {
        toCard(g, "02315");
        const yog = findByCode(g, YOG, [ZONE.SetAside])!.id;
        const tear = place(g, TEAR);
        moveCard(g, yog, ZONE.Enemy, { location: tear });
        setCounter(g, currentAgenda(g)!, "doom", 2);
      },
    });
    const n = r.state.log.length;
    r = run(r, { t: STEP.CheckDoom });
    expect(agendaCode(r)).toBe("02315");
    expect(card(gOf(r), currentAgenda(gOf(r))!).doom).toBe(0);
    // before the enemy phase: one attack on each, though neither is at Yog-Sothoth's location
    const before = r.state.log.slice(n);
    const phase = before.findIndex((e) => e.type === "phase");
    const attacks = before
      .slice(0, phase < 0 ? undefined : phase)
      .filter((e) => e.type === "attack");
    expect(attacks.map((e) => e.text)).toEqual([
      expect.stringMatching(/attacks Roland/),
      expect.stringMatching(/attacks Daisy/),
    ]);
    const won = until(
      inject(
        litas({ prep: (g) => toCard(g, "02315") }),
        (g) => moveCard(g, findByCode(g, YOG, [ZONE.SetAside])!.id, ZONE.EncounterDiscard),
        { t: STEP.CheckObjectives },
      ),
      (x) => x.state.phase === "ended",
    );
    expect(won.state.resolution).toBe("R3");
  });
});

// ---------- 8.6 the campaign ----------
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
  /** the campaign up to Lost in Time and Space */
  function atLitas(): CampaignState {
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
    for (const res of ["R1", "R1", "R2", "R1", "R1", "R1", "R1"]) c = finish(c, res);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "lost-in-time-and-space" });
    return c;
  }
  const status = (c: CampaignState, i: string) => c.investigators.find((x) => x.code === i)!.status;

  it("the spec: no resolution while act 2 is current → Resolution 4: Yog-Sothoth became one with reality, the campaign is lost; each defeated investigator is killed", () => {
    const out = finish(atLitas(), "none", (g) => {
      toCard(g, "02317");
      setStatus(g, R, "defeated");
    });
    expect(hasEntry(out.log, "yogSothothBecameOneWithReality")).toBe(true);
    expect(out.result).toBe("lose");
    expect(status(out, R)).toBe("killed");
  });

  it("no resolution on act 4 → Resolution 2: the campaign is won, the investigators lost forever", () => {
    const out = finish(atLitas(), "none", (g) => toCard(g, "02319"));
    expect(hasEntry(out.log, "yogSothothBecameOneWithReality")).toBe(false);
    expect(out.result).toBe("win");
  });

  it("R1: the tear closed, 2 physical and 2 mental trauma, the campaign won; a defeated investigator is killed", () => {
    const out = finish(atLitas(), "R1", (g) => {
      setStatus(g, D, "defeated");
    });
    expect(hasEntry(out.log, "closedTear")).toBe(true);
    expect(out.result).toBe("win");
    expect(status(out, D)).toBe("killed");
    expect(status(out, R)).toBe("active");
  });

  it("R3: Yog-Sothoth fled, every investigator killed", () => {
    const out = finish(atLitas(), "R3");
    expect(hasEntry(out.log, "yogSothothFled")).toBe(true);
    expect([status(out, R), status(out, D)]).toEqual(["killed", "killed"]);
  });

  it("an investigator Yog-Sothoth drove insane is insane in the campaign", () => {
    const out = finish(atLitas(), "R1", (g) => {
      flags.insane.set(g, R, true);
    });
    expect(status(out, R)).toBe("insane");
  });
});

// ---------- random legal play: the engine never throws or dead-locks ----------
describe("random play", () => {
  for (const invs of [[R], [R, D]])
    for (const seed of [1, 2, 3])
      it(`${invs.join("+")} seed ${seed}`, () => {
        let r = litas({
          invs,
          seed,
          difficulty: seed === 3 ? "expert" : "standard",
          log: { failedToSaveStudents: true, sacrificed: ["02079"] },
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
