/** Where Doom Awaits (campaign-the-dunwich-legacy, group 7): setup, tokens, the map, cards, acts and agendas, the campaign. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, dispatch, type Result } from "../index";
import { next } from "../world/rng";
import { db, gOf, mutate, pick, putEnemy, skipMulligans } from "../kits/testkit";
import { game, hand, inject, lastTest, move, toTurn, until, use } from "../kits/driver";
import { actSpenders, cardsIn, connections, enemies, findByCode, locations } from "../queries";
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
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import * as flags from "../world/flags";
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
const BASE = "02282";
const ASCENDING = "02283";
const PEAK = "02284";
const DIVERGING = ["02285", "02286", "02287", "02288"];
const ALTERED = ["02289", "02290", "02291", "02292"];
const SETH = "02293";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const wda = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
  prep,
}: Opts = {}) =>
  game({
    scenario: "where-doom-awaits",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-dunwich-legacy", difficulty, campaignLog: log },
  });

const loc = (game: GameContext, code: string): InstId | undefined =>
  findByCode(game, code, [ZONE.Location])?.id;
/** a path of this code in play (from the set-aside or the removed ones), revealed or not */
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
    id = createCard(g, code, ZONE.Limbo);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const actCode = (r: Result) => card(gOf(r), currentAct(gOf(r))!).code;
const agendaCode = (r: Result) => card(gOf(r), currentAgenda(gOf(r))!).code;
const codes = (game: GameContext, ids: InstId[]) => ids.map((id) => card(game, id).code).sort();

// ---------- 7.2 setup ----------
describe("setup", () => {
  it("Base of the Hill, Ascending Path and Sentinel Peak in play, everyone at the Base; 3 Diverging and 3 Altered Paths set aside, 1 of each out of the game at random; Seth set aside", () => {
    const removed = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = gOf(wda({ invs: [R, D], seed }));
      expect(
        codes(
          g,
          locations(g).map((l) => l.id),
        ),
      ).toEqual([BASE, ASCENDING, PEAK].sort());
      for (const i of [R, D]) expect(card(g, inv(g, i).location!).code).toBe(BASE);
      for (const kind of [DIVERGING, ALTERED]) {
        const aside = cardsIn(g, ZONE.SetAside).filter((c) => kind.includes(c.code));
        const out = cardsIn(g, ZONE.Removed).filter((c) => kind.includes(c.code));
        expect(aside).toHaveLength(3);
        expect(out).toHaveLength(1);
        removed.add(out[0].code);
      }
      expect(findByCode(g, SETH)?.zone).toBe(ZONE.SetAside);
      expect(card(g, loc(g, ASCENDING)!).revealed).toBe(false);
      expect(card(g, loc(g, PEAK)!).revealed).toBe(false);
    }
    expect(removed.size).toBeGreaterThan(2);
  });

  it("act 2 by the log: v. I if Silas was restored; v. II if the Necronomicon was not recovered or was stolen; else v. III", () => {
    const act2 = (log: Record<string, unknown>) => {
      const g = gOf(wda({ log }));
      return cardsIn(g, ZONE.ActDeck)
        .map((c) => c.code)
        .filter((c) => ["02278", "02279", "02280"].includes(c));
    };
    expect(act2({ restoredSilasBishop: true, necronomiconStolen: true })).toEqual(["02278"]);
    expect(act2({ failedToRecoverNecronomicon: true })).toEqual(["02279"]);
    expect(act2({ necronomiconStolen: true, killedSilasBishop: true })).toEqual(["02279"]);
    expect(act2({ tookNecronomicon: true, banishedSilasBishop: true })).toEqual(["02280"]);
    expect(act2({ destroyedNecronomicon: true })).toEqual(["02280"]);
  });

  it("the spec: the Necronomicon recovered, not stolen, Silas not restored → act 2 v. III; the Base connects to the Ascending Path and each Diverging Path, not to Sentinel Peak", () => {
    const r = wda({ log: { tookNecronomicon: true } });
    const g = gOf(r);
    expect(cardsIn(g, ZONE.ActDeck).map((c) => c.code)).toContain("02280");
    const div = path(g, "02285", false);
    const base = loc(g, BASE)!;
    expect(connections(g, base)).toContain(loc(g, ASCENDING));
    expect(connections(g, base)).toContain(div);
    expect(connections(g, base)).not.toContain(loc(g, PEAK));
  });

  it("the Brood that escaped: 1 doom on agenda 1a per Brood", () => {
    const doom = (n?: number) => {
      const g = gOf(wda({ log: n === undefined ? {} : { broodEscaped: n } }));
      return card(g, currentAgenda(g)!).doom;
    };
    expect(doom()).toBe(0);
    expect(doom(3)).toBe(3);
  });

  it("Naomi has your back: the lead gains 1 clue, 2 at 3–4 players", () => {
    expect(inv(gOf(wda({ log: { naomiHasBack: true } })), R).clues).toBe(1);
    expect(inv(gOf(wda({ log: {} })), R).clues).toBe(0);
    const three = gOf(wda({ invs: [R, D, "01003"], log: { naomiHasBack: true } }));
    expect(inv(three, R).clues + inv(three, D).clues + inv(three, "01003").clues).toBe(2);
  });

  it("Hideous Abominations only if Silas Bishop was killed: a Conglomeration of Spheres at the Ascending Path, the rest in the encounter deck", () => {
    const g = gOf(wda({ log: { killedSilasBishop: true } }));
    const glom = enemies(g).filter((e) => e.code === "02103");
    expect(glom).toHaveLength(1);
    expect(glom[0].location).toBe(loc(g, ASCENDING));
    expect(
      cardsIn(g, ZONE.EncounterDeck).filter((c) => ["02103", "02104"].includes(c.code)),
    ).toHaveLength(2);
    const none = gOf(wda({ log: { restoredSilasBishop: true } }));
    expect(enemies(none).filter((e) => e.code === "02103")).toHaveLength(0);
    for (const c of cardsIn(none, ZONE.EncounterDeck))
      expect(["02103", "02104"]).not.toContain(c.code);
  });
});

// ---------- 7.3 tokens ----------
/** agenda 2 current in place of agenda 1 */
const toAgenda2 = (game: GameContext) => {
  moveCard(game, currentAgenda(game)!, ZONE.Removed);
  moveCard(game, findByCode(game, "02276", [ZONE.AgendaDeck])!.id, ZONE.Agenda, { deck: "a" });
};
/** Roland stands at a revealed Altered Path */
const onAltered = (game: GameContext) => placeInvestigator(game, R, path(game, "02289"));

describe("chaos tokens", () => {
  const testWith = (token: ChaosToken, difficulty: Difficulty, prep?: Opts["prep"], against = 0) =>
    run(wda({ bag: [token], difficulty, prep }), test("willpower", against));

  it("skull: −1 (−3 at an Altered location) on Easy/Standard; −2 (−5) on Hard/Expert", () => {
    for (const [d, plain, altered] of [
      ["easy", -1, -3],
      ["standard", -1, -3],
      ["hard", -2, -5],
      ["expert", -2, -5],
    ] as const) {
      expect(mods(testWith("skull", d))).toEqual([plain]);
      expect(mods(testWith("skull", d, onAltered))).toEqual([altered]);
    }
  });

  it("tablet: −2 (−4 on agenda 2) on Easy/Standard; −3, and an automatic failure on agenda 2, on Hard/Expert", () => {
    for (const d of ["easy", "standard"] as const) {
      expect(mods(testWith("tablet", d))).toEqual([-2]);
      expect(mods(testWith("tablet", d, toAgenda2))).toEqual([-4]);
    }
    for (const d of ["hard", "expert"] as const) {
      const one = testWith("tablet", d);
      expect(mods(one)).toEqual([-3]);
      expect(lastTest(one)!.success).toBe(true);
      const two = testWith("tablet", d, toAgenda2);
      expect(lastTest(two)!.success).toBe(false);
      expect(String(two.state.log.findLast((e) => e.type === "testResult")!.text)).toMatch(
        /auto-fail/,
      );
    }
  });

  it("the spec: Expert, agenda 2 current, a tablet → the test fails automatically", () => {
    const r = testWith("tablet", "expert", toAgenda2, -10);
    expect(lastTest(r)!.success).toBe(false);
  });

  it("elder thing: −X, the top 2 cards discarded (3 on Hard/Expert), X their total printed cost", () => {
    for (const [d, n] of [
      ["standard", 2],
      ["expert", 3],
    ] as const) {
      const r = testWith("elderThing", d);
      const g = gOf(r);
      const gone = inv(g, R).discard.slice(-n);
      expect(inv(g, R).discard).toHaveLength(n);
      const cost = gone.reduce((s, id) => {
        const c = g.db.cards[card(g, id).code].cost;
        return s + (typeof c === "number" ? c : 0);
      }, 0);
      expect(mods(r)).toEqual([-cost]);
    }
  });

  it("cultist: another token, and the committed skill cards lose their icons and effects", () => {
    const committed = (d: Difficulty, seed: number) => {
      let r = wda({
        bag: ["cultist", "0"],
        difficulty: d,
        seed,
        prep: (g) => void hand(g, R, "01089"), // Guts: 2 willpower icons; draw 1 card if it succeeds
      });
      const handBefore = inv(gOf(r), R).hand.length;
      r = inject(r, () => {}, test("willpower", 4));
      r = toTurn(pick(r, /Guts/), R);
      return { t: lastTest(r)!, drew: inv(gOf(r), R).hand.length - (handBefore - 1) };
    };
    for (const d of ["standard", "hard"] as const) {
      const seen = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => committed(d, seed));
      // the cultist first: another token, and Guts gives nothing; the 0 first: Roland's 3 + Guts' 2 succeed, Guts draws
      for (const { t, drew } of seen)
        if (t.tokens[0] === "cultist") {
          expect(t.tokens).toEqual(["cultist", "0"]);
          expect(t).toMatchObject({ total: 3, success: false });
          expect(drew).toBe(0);
        } else expect(t).toMatchObject({ total: 5, success: true });
      expect(seen.some(({ t }) => t.tokens[0] === "cultist")).toBe(true);
    }
  });
});

// ---------- 7.4 the map ----------
describe("connections", () => {
  it("Base ↔ Ascending Path and each Diverging Path; Ascending Path ↔ Sentinel Peak and each Altered Path; no Base–Peak", () => {
    const g = gOf(wda());
    const ids = Object.fromEntries(
      [...DIVERGING, ...ALTERED].map((c) => [c, path(g, c, false)] as const),
    );
    const base = loc(g, BASE)!;
    const asc = loc(g, ASCENDING)!;
    const peak = loc(g, PEAK)!;
    expect(codes(g, connections(g, base))).toEqual([ASCENDING, ...DIVERGING].sort());
    expect(codes(g, connections(g, asc))).toEqual([BASE, PEAK, ...ALTERED].sort());
    expect(codes(g, connections(g, peak))).toEqual([ASCENDING]);
    // unrevealed paths print no symbol: each links to its hill location only
    for (const c of DIVERGING) expect(codes(g, connections(g, ids[c]))).toEqual([BASE]);
    for (const c of ALTERED) expect(codes(g, connections(g, ids[c]))).toEqual([ASCENDING]);
  });

  it("revealed paths link by symbol: + ↔ hourglass (02285, 02288 ↔ 02286), 02287 ↔ 02290, T ↔ moon (02289, 02292 ↔ 02291)", () => {
    let r = wda();
    r = mutate(r, (g) => {
      for (const c of [...DIVERGING, ...ALTERED]) path(g, c, true);
    });
    r = run(r, {
      t: STEP.Eff,
      effect: { op: "script", fn: "wdaRelink" },
      ctx: { you: R, source: null },
    });
    const g = gOf(r);
    const links = (c: string) => codes(g, connections(g, loc(g, c)!));
    expect(links("02285")).toEqual([BASE, "02286"]);
    expect(links("02288")).toEqual([BASE, "02286"]);
    expect(links("02286")).toEqual([BASE, "02285", "02288"]);
    expect(links("02287")).toEqual([BASE, "02290"]);
    expect(links("02290")).toEqual([ASCENDING, "02287"]);
    expect(links("02289")).toEqual([ASCENDING, "02291"]);
    expect(links("02292")).toEqual([ASCENDING, "02291"]);
    expect(links("02291")).toEqual([ASCENDING, "02289", "02292"]);
  });

  it("revealing a path by entering it links it to the revealed paths of its symbol", () => {
    let r = wda({
      prep: (g) => {
        path(g, "02286", true);
        path(g, "02285", false);
      },
    });
    r = move(r, "02285");
    const g = gOf(r);
    expect(codes(g, connections(g, loc(g, "02285")!))).toEqual([BASE, "02286"]);
  });

  it("the Ascending Path can't be entered while unrevealed; Sentinel Peak costs 2 clues per investigator while unrevealed", () => {
    const r = wda();
    const g = gOf(r);
    const moves = (x: Result) =>
      x.state.pending!.options.filter((o) => o.label.startsWith("Move")).map((o) => o.label);
    expect(moves(r).some((l) => /Ascending/.test(l))).toBe(false);
    const open = mutate(r, (x) => {
      reveal(x, loc(x, ASCENDING)!);
      placeInvestigator(x, R, loc(x, ASCENDING)!);
    });
    expect(moves(open).some((l) => /Sentinel Peak/.test(l))).toBe(false);
    const rich = mutate(open, (x) => setCounter(x, R, "clues", 2));
    const there = move(rich, PEAK);
    expect(codeAt(there)).toBe(PEAK);
    expect(inv(gOf(there), R).clues).toBe(0);
    expect(g).toBeTruthy();
  });
});

// ---------- 7.5 cards ----------
/** Roland moves from the Base into a path put into play unrevealed, with `left` actions before the move */
function enterPath(code: string, left = 3, prep: Opts["prep"] = () => {}): Result {
  const r = wda({
    prep: (g) => {
      path(g, code, false);
      // an Altered Path is entered from the Ascending Path
      if (ALTERED.includes(code)) {
        reveal(g, loc(g, ASCENDING)!);
        placeInvestigator(g, R, loc(g, ASCENDING)!);
      }
      setCounter(g, R, "actionsLeft", left);
      prep(g);
    },
  });
  return move(r, code);
}
const usable = (r: Result, label: RegExp) =>
  !!r.state.pending?.options.some((o) => label.test(o.label));

describe("Base of the Hill and Ascending Path", () => {
  it("Base: investigate; succeeding puts a random set-aside Diverging Path into play (unrevealed) instead of clues, once per round", () => {
    let r = wda();
    expect(usable(r, /Base of the Hill: investigate/)).toBe(true);
    r = toTurn(use(r, BASE, 0), R);
    const g = gOf(r);
    const put = locations(g).filter((l) => DIVERGING.includes(l.code));
    expect(put).toHaveLength(1);
    expect(put[0].revealed).toBe(false);
    expect(cardsIn(g, ZONE.SetAside).filter((c) => DIVERGING.includes(c.code))).toHaveLength(2);
    expect(inv(g, R).clues).toBe(0);
    expect(usable(r, /Base of the Hill: investigate/)).toBe(false);
  });

  it("Ascending Path: the same with a set-aside Altered Path", () => {
    let r = wda({
      prep: (g) => {
        reveal(g, loc(g, ASCENDING)!);
        placeInvestigator(g, R, loc(g, ASCENDING)!);
      },
    });
    r = toTurn(use(r, ASCENDING, 0), R);
    const g = gOf(r);
    expect(locations(g).filter((l) => ALTERED.includes(l.code))).toHaveLength(1);
    expect(usable(r, /Ascending Path: investigate/)).toBe(false);
  });

  it("Sentinel Peak: an investigator there who draws a Hex card takes 1 damage", () => {
    const atPeak = wda({
      prep: (g) => {
        reveal(g, loc(g, PEAK)!);
        placeInvestigator(g, R, loc(g, PEAK)!);
      },
    });
    expect(inv(gOf(toTurn(drawNew(atPeak, "02296"), R)), R).damage).toBe(1);
    expect(inv(gOf(toTurn(drawNew(wda(), "02296"), R)), R).damage).toBe(0);
  });
});

describe("the paths revealed", () => {
  it("Slaughtered Woods: 2 horror with no actions left, none otherwise", () => {
    expect(inv(gOf(enterPath("02285", 1)), R).horror).toBe(2);
    expect(inv(gOf(enterPath("02285", 3)), R).horror).toBe(0);
  });

  it("Eerie Glade: the top 2 cards of your deck discarded per action left", () => {
    expect(inv(gOf(enterPath("02286", 3)), R).discard).toHaveLength(4);
    expect(inv(gOf(enterPath("02286", 1)), R).discard).toHaveLength(0);
  });

  it("Destroyed Path: 1 doom per investigator on it; investigating it removes 1 instead of discovering clues", () => {
    let r = enterPath("02287", 3);
    const g = gOf(r);
    expect(card(g, loc(g, "02287")!).doom).toBe(1);
    r = toTurn(use(r, "02287", 1), R);
    expect(card(gOf(r), loc(gOf(r), "02287")!).doom).toBe(0);
    const two = gOf(
      move(
        wda({
          invs: [R, D],
          prep: (x) => void path(x, "02287", false),
        }),
        "02287",
      ),
    );
    expect(card(two, loc(two, "02287")!).doom).toBe(2);
  });

  it("Frozen Spring: the remaining actions lost, the turn ends", () => {
    const before = wda().state.round;
    const r = toTurn(enterPath("02288", 3), R);
    expect(r.state.round).toBe(before + 1);
  });

  it("Dimensional Gap: encounter cards discarded until an enemy, which spawns there", () => {
    const r = enterPath("02289", 3, (g) => {
      const top = [createCard(g, "02296", ZONE.Limbo), createCard(g, "02294", ZONE.Limbo)];
      for (const id of [...top].reverse()) moveCard(g, id, ZONE.EncounterDeck, { top: true });
    });
    const g = gOf(r);
    const devotee = enemies(g).find((e) => e.code === "02294")!;
    expect(devotee.location).toBe(loc(g, "02289"));
    expect(cardsIn(g, ZONE.EncounterDiscard).some((c) => c.code === "02296")).toBe(true);
  });

  it("A Tear in the Path: 2 damage with no actions left", () => {
    expect(inv(gOf(enterPath("02290", 1)), R).damage).toBe(2);
    expect(inv(gOf(enterPath("02290", 2)), R).damage).toBe(0);
  });

  it("Uprooted Woods: the top 5 cards discarded with no actions left", () => {
    expect(inv(gOf(enterPath("02291", 1)), R).discard).toHaveLength(5);
    expect(inv(gOf(enterPath("02291", 2)), R).discard).toHaveLength(0);
  });

  it("Lost Memories: 1 horror per action left", () => {
    expect(inv(gOf(enterPath("02292", 3)), R).horror).toBe(2);
    expect(inv(gOf(enterPath("02292", 1)), R).horror).toBe(0);
  });
});

describe("the enemies", () => {
  it("Devotee of the Key spawns at the Base, moves once toward Sentinel Peak at the end of the enemy phase; at the Peak it is discarded and 2 doom go on the agenda", () => {
    let r = wda({ prep: (g) => reveal(g, loc(g, ASCENDING)!) });
    r = toTurn(drawNew(r, "02294"), R);
    let g = gOf(r);
    const devotee = enemies(g).find((e) => e.code === "02294")!;
    expect(devotee.location).toBe(loc(g, BASE));
    r = mutate(r, (x) => setCounter(x, R, "actionsLeft", 0));
    r = mutate(r, (x) => moveCard(x, devotee.id, ZONE.Enemy, { location: loc(x, ASCENDING)! }));
    const doom = card(gOf(r), currentAgenda(gOf(r))!).doom;
    r = toTurn(pick(r, "End turn"), R);
    g = gOf(r);
    expect(card(g, devotee.id).location).toBe(loc(g, PEAK));
    r = toTurn(
      pick(
        mutate(r, (x) => setCounter(x, R, "actionsLeft", 0)),
        "End turn",
      ),
      R,
    );
    g = gOf(r);
    expect(card(g, devotee.id).zone).toBe(ZONE.EncounterDiscard);
    expect(card(g, currentAgenda(g)!).doom).toBeGreaterThanOrEqual(doom + 2);
  });

  it("Crazed Shoggoth spawns at the nearest Altered location; an investigator its attack would defeat is killed", () => {
    const r = wda({ prep: (g) => void path(g, "02291") });
    const g = gOf(toTurn(drawNew(r, "02295"), R));
    expect(enemies(g).find((e) => e.code === "02295")!.location).toBe(loc(g, "02291"));
    let shoggoth = "";
    const ready = mutate(wda({ invs: [R, D] }), (x) => {
      setCounter(x, R, "damage", 8);
      shoggoth = putEnemy(x, "02295", inv(x, R).location!, R);
    });
    const hit = inject(ready, () => {}, {
      t: STEP.EnemyAttack,
      enemy: shoggoth,
      inv: R,
      aoo: false,
      key: "atk:k",
    });
    const after = gOf(until(hit, (x) => inv(gOf(x), R).status !== "playing"));
    expect(inv(after, R).status).toBe("defeated");
    expect(flags.killed.get(after, R)).toBe(true);
    // another enemy's defeat is only a defeat
    let ghoul = "";
    const plain = mutate(wda({ invs: [R, D] }), (x) => {
      setCounter(x, R, "damage", 8);
      ghoul = putEnemy(x, "01160", inv(x, R).location!, R);
    });
    const beaten = gOf(
      until(
        inject(plain, () => {}, {
          t: STEP.EnemyAttack,
          enemy: ghoul,
          inv: R,
          aoo: false,
          key: "atk:k",
        }),
        (x) => inv(gOf(x), R).status !== "playing",
      ),
    );
    expect(flags.killed.get(beaten, R)).toBeUndefined();
  });
});

describe("the treacheries", () => {
  it("Rites Howled: the top 3 cards of each deck discarded; at an Altered location each weakness in the discard pile goes back into the deck", () => {
    const weakness = (game: GameContext) => {
      const id = createCard(game, "01096", ZONE.Limbo, R); // Amnesia
      moveCard(game, id, ZONE.Discard, { inv: R });
    };
    const away = gOf(toTurn(drawNew(wda({ prep: weakness }), "02296"), R));
    expect(inv(away, R).discard.map((id) => card(away, id).code)).toContain("01096");
    expect(inv(away, R).discard).toHaveLength(4);
    const altered = gOf(
      toTurn(
        drawNew(
          wda({
            prep: (g) => {
              weakness(g);
              onAltered(g);
            },
          }),
          "02296",
        ),
        R,
      ),
    );
    expect(inv(altered, R).discard.map((id) => card(altered, id).code)).not.toContain("01096");
    expect(inv(altered, R).discard).toHaveLength(3);
  });

  it("Spaces Between: every path back to its unrevealed side without clues, its investigators and enemies at the nearest Sentinel Hill location, its symbol links gone", () => {
    let ghoul = "";
    let r = wda({
      invs: [R, D],
      prep: (g) => {
        for (const c of ["02285", "02286", "02291", "02289"]) path(g, c);
        setCounter(g, loc(g, "02286")!, "clues", 2);
        reveal(g, loc(g, ASCENDING)!);
        placeInvestigator(g, R, loc(g, "02286")!);
        placeInvestigator(g, D, loc(g, "02291")!);
        ghoul = putEnemy(g, "01160", loc(g, "02289")!, null);
      },
    });
    r = run(r, {
      t: STEP.Eff,
      effect: { op: "script", fn: "wdaRelink" },
      ctx: { you: R, source: null },
    });
    expect(codes(gOf(r), connections(gOf(r), loc(gOf(r), "02285")!))).toContain("02286");
    r = toTurn(drawNew(r, "02297"), R);
    const g = gOf(r);
    for (const c of ["02285", "02286", "02291", "02289"]) {
      expect(card(g, loc(g, c)!).revealed).toBe(false);
      expect(card(g, loc(g, c)!).clues).toBe(0);
    }
    expect(codeAt(r, R)).toBe(BASE);
    expect(codeAt(r, D)).toBe(ASCENDING);
    expect(card(g, card(g, ghoul).location!).code).toBe(ASCENDING);
    expect(codes(g, connections(g, loc(g, "02285")!))).toEqual([BASE]);
    expect(card(g, loc(g, BASE)!).revealed).toBe(true);
  });

  it("Vortex of Time: each investigator at a Sentinel Hill location tests willpower (4), 2 damage on a failure", () => {
    const r = toTurn(
      drawNew(
        wda({
          invs: [R, D],
          bag: ["-2"],
          prep: (g) => placeInvestigator(g, D, path(g, "02285")),
        }),
        "02298",
      ),
      R,
    );
    expect(inv(gOf(r), R).damage).toBe(2);
    expect(inv(gOf(r), D).damage).toBe(0);
  });
});

// ---------- acts and agendas ----------
describe("acts and agendas", () => {
  it("act 1: the clues spent as soon as the group holds 2 per investigator; back: no clues left on any location, the Ascending Path revealed", () => {
    let r = wda({
      prep: (g) => {
        const div = path(g, "02285");
        setCounter(g, div, "clues", 3);
        setCounter(g, R, "clues", 1);
      },
    });
    expect(actCode(r)).toBe("02277");
    r = toTurn(
      inject(r, (g) => setCounter(g, R, "clues", 2), { t: STEP.CheckObjectives }),
      R,
    );
    const g = gOf(r);
    expect(["02278", "02279", "02280"]).toContain(actCode(r));
    expect(inv(g, R).clues).toBe(0);
    for (const l of locations(g)) expect(l.clues).toBe(0);
    expect(card(g, loc(g, ASCENDING)!).revealed).toBe(true);
  });

  /** at act 2 (the version the log picks), Roland at the Ascending Path with 2 clues */
  const atAct2 = (log: Record<string, unknown> = {}, invs = [R]) =>
    toTurn(
      inject(
        wda({ invs, log }),
        (g) => {
          for (const i of invs) setCounter(g, i, "clues", 2);
        },
        { t: STEP.CheckObjectives },
      ),
      R,
    );

  it("act 2: clues go on Altered locations only; entering Sentinel Peak advances", () => {
    let r = atAct2();
    r = mutate(r, (g) => {
      placeInvestigator(g, R, loc(g, ASCENDING)!);
      setCounter(g, R, "clues", 2);
      path(g, "02285", false);
      path(g, "02291", false);
    });
    const altered = move(r, "02291");
    expect(card(gOf(altered), loc(gOf(altered), "02291")!).clues).toBe(1);
    const peak = toTurn(move(r, PEAK), R);
    expect(actCode(peak)).toBe("02281");
    // Sentinel Peak was revealed while act 2 forbade clues on it
    expect(card(gOf(peak), loc(gOf(peak), PEAK)!).clues).toBe(0);
    const div = mutate(r, (g) => placeInvestigator(g, R, loc(g, BASE)!));
    const woods = move(div, "02285");
    expect(card(gOf(woods), loc(gOf(woods), "02285")!).clues).toBe(0);
  });

  it("act 2's backs: v. I removes the set-aside Seth Bishop; v. II puts him at Sentinel Peak; v. III with 1 damage per investigator", () => {
    const enter = (log: Record<string, unknown>, invs = [R]) => {
      const r = mutate(atAct2(log, invs), (g) => {
        placeInvestigator(g, R, loc(g, ASCENDING)!);
        setCounter(g, R, "clues", 2 * invs.length);
      });
      return gOf(toTurn(move(r, PEAK), R));
    };
    const v1 = enter({ restoredSilasBishop: true });
    expect(findByCode(v1, SETH)!.zone).toBe(ZONE.Removed);
    const v2 = enter({ necronomiconStolen: true });
    const seth2 = findByCode(v2, SETH)!;
    expect(seth2.zone).toBe(ZONE.Enemy);
    expect(seth2.location).toBe(loc(v2, PEAK));
    expect(seth2.damage).toBe(0);
    const v3 = enter({}, [R, D]);
    const seth3 = findByCode(v3, SETH)!;
    expect(seth3.location).toBe(loc(v3, PEAK));
    expect(seth3.damage).toBe(2);
  });

  it("act 3: only the investigators at Sentinel Peak spend its clues; its back is Resolution 1", () => {
    const r = mutate(wda({ invs: [R, D] }), (g) => {
      const a3 = findByCode(g, "02281", [ZONE.ActDeck])!.id;
      moveCard(g, currentAct(g)!, ZONE.Removed);
      moveCard(g, a3, ZONE.Act, { deck: "a" });
      reveal(g, loc(g, PEAK)!);
      placeInvestigator(g, R, loc(g, PEAK)!);
      setCounter(g, R, "clues", 2);
      setCounter(g, D, "clues", 2);
    });
    expect(actSpenders(gOf(r))).toEqual([R]);
    const won = until(
      inject(r, () => {}, { t: STEP.AdvanceAct }),
      (x) => x.state.phase === "ended",
    );
    expect(won.state.resolution).toBe("R1");
  });

  it("agenda 1's back shuffles the encounter discard pile into the deck; agenda 2's is Resolution 2", () => {
    let r = mutate(wda(), (g) => {
      const id = createCard(g, "02296", ZONE.Limbo);
      moveCard(g, id, ZONE.EncounterDiscard);
    });
    r = toTurn(
      inject(r, () => {}, { t: STEP.AdvanceAgenda }),
      R,
    );
    expect(agendaCode(r)).toBe("02276");
    expect(cardsIn(gOf(r), ZONE.EncounterDiscard)).toHaveLength(0);
    const lost = until(
      inject(r, () => {}, { t: STEP.AdvanceAgenda }),
      (x) => x.state.phase === "ended",
    );
    expect(lost.state.resolution).toBe("R2");
  });

  it("doom on Destroyed Path counts toward the agenda's threshold", () => {
    const r = toTurn(
      inject(
        wda(),
        (g) => {
          setCounter(g, path(g, "02287"), "doom", 6);
          setCounter(g, currentAgenda(g)!, "doom", 6);
        },
        { t: STEP.CheckDoom },
      ),
      R,
    );
    expect(agendaCode(r)).toBe("02276");
  });
});

// ---------- the campaign ----------
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
  /** the campaign through Undimensioned and Unseen, up to Where Doom Awaits */
  function atWda(difficulty: Difficulty = "standard") {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-dunwich-legacy",
        difficulty,
        seed: 3,
        investigators: [
          { code: R, deckId: "roland-starter" },
          { code: D, deckId: "daisy-starter" },
        ],
      }),
    );
    for (const res of ["R1", "R1", "R2", "R1", "R1", "R1"]) c = finish(c, res);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "where-doom-awaits" });
    return c;
  }
  const count = (bag: ChaosToken[], t: ChaosToken) => bag.filter((x) => x === t).length;

  it("the difficulty's token (−5 on Standard, −7 on Expert) joins the bag once, for the rest of the campaign", () => {
    for (const [d, t] of [
      ["standard", "-5"],
      ["expert", "-7"],
    ] as const) {
      const c = atWda(d);
      const start = count(db.campaigns["the-dunwich-legacy"].chaosBags[d] ?? [], t);
      const before = count(c.chaosBag, t);
      expect(before).toBe(start + 1);
      expect(count(scenarioSetup(db, c, 1).chaosBag ?? [], t)).toBe(before);
      const next = finish(c, "R1");
      expect(next.flow.waiting?.step).toEqual({ kind: "play", scenario: "lost-in-time-and-space" });
      expect(count(next.chaosBag, t)).toBe(before);
    }
  });

  it("R1: the investigators entered the gate, on to Lost in Time and Space", () => {
    const out = finish(atWda(), "R1");
    expect(hasEntry(out.log, "enteredTheGate")).toBe(true);
    expect(out.result).toBeNull();
  });

  it("R2 and no resolution: Yog-Sothoth escaped, the campaign is lost", () => {
    for (const res of ["R2", "none"]) {
      const out = finish(atWda(), res);
      expect(hasEntry(out.log, "yogSothothEscaped")).toBe(true);
      expect(out.result).toBe("lose");
    }
  });

  it("an investigator Crazed Shoggoth's attack defeated is killed", () => {
    const out = finish(atWda(), "R1", (g) => {
      flags.killed.set(g, R, true);
    });
    expect(out.investigators.find((i) => i.code === R)!.status).toBe("killed");
    expect(out.investigators.find((i) => i.code === D)!.status).toBe("active");
  });
});

// ---------- random legal play: the engine never throws or dead-locks ----------
describe("random play", () => {
  for (const invs of [[R], [R, D]])
    for (const seed of [1, 2, 3])
      it(`${invs.join("+")} seed ${seed}`, () => {
        let r = wda({
          invs,
          seed,
          log: { broodEscaped: 2, naomiHasBack: true, killedSilasBishop: seed === 2 },
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
