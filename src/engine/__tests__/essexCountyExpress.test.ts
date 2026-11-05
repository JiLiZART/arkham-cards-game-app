/** The Essex County Express (campaign-the-dunwich-legacy, group 4): setup, tokens, the train, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, dispatch, type Result } from "../index";
import { next } from "../world/rng";
import { db, giveCard, gOf, mutate, options, pick, putEnemy, skipMulligans } from "../kits/testkit";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry } from "../campaign/log";
import { game, inject, inPlay, move, offered, toTurn, until } from "../kits/driver";
import { cardsIn, cellOf, connections, findByCode, locationAt, locations } from "../queries";
import {
  card,
  currentAct,
  currentAgenda,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setCode,
  setCounter,
  setStatus,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const ENGINES = ["02175", "02176", "02177"];
const CARS = ["02167", "02168", "02169", "02170", "02171", "02172", "02173", "02174"];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  prep?: (game: GameContext) => void;
}
const essex = ({ invs = [R], bag = ["0"], difficulty = "standard", seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "essex-county-express",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-dunwich-legacy", difficulty },
  });

/** the car at a column of the train */
const carAt = (game: GameContext, col: number) => locationAt(game, [col, 0])!;
/** the cars in play, left to right, as codes */
const line = (r: Result) => {
  const g = gOf(r);
  return [0, 1, 2, 3, 4, 5, 6].map((c) =>
    locationAt(g, [c, 0]) ? card(g, carAt(g, c)).code : null,
  );
};
const at = (r: Result, who = R) => inv(gOf(r), who).location;
/** Roland at a car, revealed, its clues gone */
const standAt = (game: GameContext, col: number, who = R) => {
  const id = carAt(game, col);
  reveal(game, id);
  setCounter(game, id, "clues", 0);
  placeInvestigator(game, who, id);
  return id;
};
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const willpowerTest = (difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill: "willpower", difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
const advanceAgenda = (r: Result) => run(r, { t: STEP.AdvanceAgenda });

// ---------- 4.2 setup ----------
describe("setup", () => {
  it("one random Engine Car rightmost, six random Train Cars to its left, the rest out of the game; everyone in the leftmost, revealed", () => {
    const engines = new Set<string>();
    const firsts = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = essex({ invs: [R, D], seed });
      const g = gOf(r);
      const codes = line(r);
      expect(codes.every(Boolean)).toBe(true);
      expect(ENGINES).toContain(codes[6]);
      expect(codes.slice(0, 6).every((c) => CARS.includes(c!))).toBe(true);
      expect(new Set(codes).size).toBe(7);
      engines.add(codes[6]!);
      firsts.add(codes[0]!);
      expect(locations(g)).toHaveLength(7);
      for (const code of [...ENGINES, ...CARS].filter((c) => !codes.includes(c)))
        expect(findByCode(g, code)?.zone).toBe(ZONE.Removed);
      expect(at(r, R)).toBe(carAt(g, 0));
      expect(at(r, D)).toBe(carAt(g, 0));
      expect(card(g, carAt(g, 0)).revealed).toBe(true);
      for (const c of [1, 2, 3, 4, 5, 6]) expect(card(g, carAt(g, c)).revealed).toBe(false);
    }
    expect(engines.size).toBeGreaterThan(1);
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("the four copies of Across Space and Time are set aside", () => {
    const g = gOf(essex());
    expect(cardsIn(g, ZONE.SetAside).filter((c) => c.code === "02178")).toHaveLength(4);
    expect(pile(g, ZONE.EncounterDeck).some((id) => card(g, id).code === "02178")).toBe(false);
  });
});

// ---------- 4.3 tokens ----------
describe("chaos tokens", () => {
  const testWith = (token: ChaosToken, difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(essex({ bag: [token], difficulty, prep }), willpowerTest(against));

  for (const d of ["easy", "standard"] as const) {
    it(`${d}: skull −X, X the agenda's stage`, () => {
      expect(mods(testWith("skull", d))).toEqual([-1]);
    });
    it(`${d}: cultist −1; failing on your turn loses your actions and ends it`, () => {
      const pass = testWith("cultist", d, -10);
      expect(mods(pass)).toEqual([-1]);
      expect(inv(gOf(pass), R).actionsLeft).toBeGreaterThan(0);
      const r = essex({ bag: ["cultist"], difficulty: d });
      const fail = inject(r, () => {}, willpowerTest(10));
      const p = fail.state.pending;
      // Roland's turn is over: the next prompt is not his turn's
      expect(p?.kind === "turn" && p.inv === R).toBe(false);
    });
    it(`${d}: tablet −2, 1 doom on the nearest Cultist`, () => {
      let acolyte = "";
      const after = testWith("tablet", d, 0, (g) => {
        acolyte = putEnemy(g, "01169", inv(g, R).location!, null);
      });
      expect(mods(after)).toEqual([-2]);
      expect(card(gOf(after), acolyte).doom).toBe(1);
    });
    it(`${d}: elder thing −3; failing discards a card of your choice from your hand`, () => {
      const r = essex({ bag: ["elderThing"], difficulty: d });
      const n = inv(gOf(r), R).hand.length;
      const after = until(
        inject(r, () => {}, willpowerTest(10)),
        (x) => x.state.pending?.kind === "turn",
      );
      expect(mods(after)).toEqual([-3]);
      expect(inv(gOf(after), R).hand.length).toBe(n - 1);
    });
  }

  for (const d of ["hard", "expert"] as const) {
    it(`${d}: skull −(X + 1): −3 on agenda 2`, () => {
      expect(mods(testWith("skull", d))).toEqual([-2]);
      const r = essex({ bag: ["skull"], difficulty: d, prep: (g) => void standAt(g, 1) });
      const on2 = advanceAgenda(r);
      expect(card(gOf(on2), currentAgenda(gOf(on2))!).code).toBe("02161");
      expect(mods(run(on2, willpowerTest()))).toEqual([-3]);
    });
    it(`${d}: cultist reveals another token`, () => {
      // revealed first, the cultist (0) brings the −2 out after it; the −2 first ends the reveal
      const seen = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
        mods(run(essex({ bag: ["cultist", "-2"], difficulty: d, seed }), willpowerTest())),
      );
      for (const m of seen) expect(m[0] === 0 ? [0, -2] : [-2]).toEqual(m);
      expect(seen.some((m) => m.length === 2)).toBe(true);
    });
    it(`${d}: tablet −4, 1 doom on each Cultist in play`, () => {
      let a = "";
      let b = "";
      const after = testWith("tablet", d, 0, (g) => {
        a = putEnemy(g, "01169", inv(g, R).location!, null);
        b = putEnemy(g, "01169", carAt(g, 3), null);
      });
      expect(mods(after)).toEqual([-4]);
      expect(card(gOf(after), a).doom).toBe(1);
      expect(card(gOf(after), b).doom).toBe(1);
    });
    it(`${d}: elder thing −3; failing discards a card for each point failed by`, () => {
      const r = essex({ bag: ["elderThing"], difficulty: d });
      const n = inv(gOf(r), R).hand.length;
      // willpower 3 − 3 = 0 against 2: failed by 2
      const after = until(
        inject(r, () => {}, willpowerTest(2)),
        (x) => x.state.pending?.kind === "turn",
      );
      expect(inv(gOf(after), R).hand.length).toBe(n - 2);
    });
  }
});

// ---------- 4.4 the train ----------
describe("the train", () => {
  it("each car connects to the cars beside it: the leftmost and the Engine Car to one", () => {
    const g = gOf(essex());
    expect(connections(g, carAt(g, 0))).toEqual([carAt(g, 1)]);
    expect([...connections(g, carAt(g, 3))].sort()).toEqual([carAt(g, 2), carAt(g, 4)].sort());
    expect(connections(g, carAt(g, 6))).toEqual([carAt(g, 5)]);
  });

  it("an unrevealed car can't be entered while the location to its left has clues", () => {
    const r = essex({ seed: 3 });
    const g = gOf(r);
    const next = card(g, carAt(g, 1)).code;
    if (card(g, carAt(g, 0)).clues > 0) expect(() => move(r, next)).toThrow();
    const clear = mutate(r, (x) => setCounter(x, carAt(x, 0), "clues", 0));
    expect(card(gOf(toTurn(move(clear, next), R)), carAt(gOf(clear), 1)).revealed).toBe(true);
  });

  it("after agenda 1 the leftmost car is gone, the investigators there defeated; the new leftmost connects to one car", () => {
    const r = essex({
      invs: [R, D],
      prep: (g) => {
        standAt(g, 1, R);
        setCounter(g, R, "clues", 2);
      },
    });
    const g0 = gOf(r);
    const [first, second] = [carAt(g0, 0), carAt(g0, 1)];
    expect(at(r, D)).toBe(first);
    const after = advanceAgenda(r);
    const g = gOf(after);
    expect([ZONE.Removed, ZONE.Victory]).toContain(card(g, first).zone);
    expect(inv(g, D).status).toBe("defeated");
    expect(inv(g, R).status).toBe("playing");
    expect(inv(g, R).clues).toBe(0);
    expect(locations(g)).toHaveLength(6);
    expect(connections(g, second)).toEqual([carAt(g, 2)]);
    expect(cellOf(g, second)).toEqual([1, 0]);
  });

  it("agendas 3 and 4 remove two cars each; agenda 5 defeats everyone with 1 mental trauma (→R2)", () => {
    let r = essex({ prep: (g) => void standAt(g, 6) });
    for (const left of [6, 5, 3, 1]) {
      r = advanceAgenda(r);
      expect(locations(gOf(r))).toHaveLength(left);
    }
    expect(card(gOf(r), currentAgenda(gOf(r))!).code).toBe("02164");
    const end = advanceAgenda(r);
    expect(end.state.phase).toBe("ended");
    expect(end.state.resolution).toBe("R2");
    expect(inv(gOf(end), R).mentalTrauma).toBe(1);
  });

  it("every investigator defeated otherwise: no resolution", () => {
    const r = essex();
    const end = until(advanceAgenda(r), () => false, 50);
    expect(end.state.resolution).toBe("none");
  });
});

// ---------- 4.5 cards ----------
describe("acts", () => {
  /** Roland beside the unrevealed Engine Car, the car he is in cleared */
  const besideEngine = (bag: ChaosToken[] = ["0"]) =>
    essex({ bag, prep: (g) => void standAt(g, 5) });
  const engineCode = (r: Result) => card(gOf(r), carAt(gOf(r), 6)).code;

  it("Run!: entering the Engine Car advances; failing to dodge the creature is 1 mental trauma", () => {
    const r = besideEngine(["autoFail"]);
    const asked = until(move(r, engineCode(r)), offered(/^Test agility/));
    const after = toTurn(pick(asked, /^Test agility/), R);
    expect(card(gOf(after), currentAct(gOf(after))!).code).toBe("02166");
    expect(inv(gOf(after), R).mentalTrauma).toBe(1);
    expect(inv(gOf(after), R).physicalTrauma).toBe(0);
  });

  it("Run!: failing to endure the heat is 1 physical trauma; succeeding is nothing", () => {
    const r = besideEngine(["autoFail"]);
    const asked = until(move(r, engineCode(r)), offered(/^Test combat/));
    expect(inv(gOf(toTurn(pick(asked, /^Test combat/), R)), R).physicalTrauma).toBe(1);
    const ok = besideEngine(["+1"]);
    const passed = until(move(ok, engineCode(ok)), offered(/^Test combat/));
    expect(inv(gOf(toTurn(pick(passed, /^Test combat/), R)), R).physicalTrauma).toBe(0);
  });

  it("Get the Engine Running!: no clues in the Engine Car (→R1)", () => {
    const r = besideEngine(["+1"]);
    const asked = until(move(r, engineCode(r)), offered(/^Test combat/));
    const act2 = toTurn(pick(asked, /^Test combat/), R);
    const end = inject(act2, (g) => setCounter(g, carAt(g, 6), "clues", 0), {
      t: STEP.CheckObjectives,
    });
    expect(end.state.resolution).toBe("R1");
  });
});

describe("the train cars", () => {
  /** Roland moves into the next car, made this code, with these cards as his hand */
  function enter(code: string, hand: string[], bag: ChaosToken[] = ["0"]) {
    const r = essex({
      bag,
      prep: (g) => {
        standAt(g, 0);
        setCode(g, carAt(g, 1), code);
        for (const id of inv(g, R).hand.slice()) moveCard(g, id, ZONE.Deck);
        for (const c of hand) giveCard(g, R, c);
      },
    });
    return move(r, code);
  }

  it("Passenger Car (agility): discard cards with 2 agility icons, one at a time…", () => {
    let r = enter("02167", ["01023", "01023", "01025"]);
    r = pick(r, /^Discard cards/);
    // the first Dodge chosen, the second is the only card left with the icon
    r = pick(r, /Dodge/);
    const g = gOf(toTurn(r, R));
    expect(inv(g, R).hand.map((id) => card(g, id).code)).toEqual(["01025"]);
    expect(inv(g, R).damage).toBe(0);
  });

  it("…or take 2 damage; with too few icons the damage is taken without asking", () => {
    const taken = toTurn(pick(enter("02167", ["01023", "01023"]), /^Take 2 damage/), R);
    expect(inv(gOf(taken), R).damage).toBe(2);
    expect(inv(gOf(taken), R).hand).toHaveLength(2);
    const forced = toTurn(enter("02167", ["01023"]), R);
    expect(inv(gOf(forced), R).damage).toBe(2);
  });

  it("Passenger Car (willpower): 2 horror; (wild): a card with a wild icon or 1 damage and 1 horror", () => {
    const will = toTurn(enter("02169", ["01025"]), R);
    expect(inv(gOf(will), R).horror).toBe(2);
    const wild = toTurn(pick(enter("02171", ["01006"]), /^Discard a card/), R);
    expect(inv(gOf(wild), R).hand).toHaveLength(0);
    const hit = toTurn(enter("02171", ["01025"]), R);
    expect([inv(gOf(hit), R).damage, inv(gOf(hit), R).horror]).toEqual([1, 1]);
  });

  it("Sleeping Car: gain 3 resources, once per game for the group", () => {
    const r = toTurn(enter("02172", []), R);
    const res = inv(gOf(r), R).resources;
    const used = toTurn(pick(r, /^Sleeping Car/), R);
    expect(inv(gOf(used), R).resources).toBe(res + 3);
    expect(options(used).some((o) => o.startsWith("Sleeping Car"))).toBe(false);
  });

  it("Dining Car: revealed, a Grappling Horror drawn from the encounter deck", () => {
    const r = toTurn(enter("02173", []), R);
    expect(findByCode(gOf(r), "02182", [ZONE.Enemy])?.location).toBe(at(r));
  });

  it("Parlor Car: not investigated; 3 resources discover its clue", () => {
    const r = toTurn(enter("02174", []), R);
    const g = gOf(r);
    expect(options(r).some((o) => o.startsWith("Investigate"))).toBe(false);
    const clues = card(g, at(r)!).clues;
    const used = toTurn(pick(r, /^Parlor Car/), R);
    expect(inv(gOf(used), R).clues).toBe(1);
    expect(card(gOf(used), at(r)!).clues).toBe(clues - 1);
    expect(inv(gOf(used), R).resources).toBe(inv(g, R).resources - 3);
  });

  it("Engine Cars: 02176 draws a Grappling Horror, 02177 the top 3 encounter cards", () => {
    const horror = toTurn(enter("02176", []), R);
    expect(findByCode(gOf(horror), "02182", [ZONE.Enemy])).toBeDefined();
    const r = essex({
      prep: (g) => {
        standAt(g, 0);
        setCode(g, carAt(g, 1), "02177");
      },
    });
    const deck = pile(gOf(r), ZONE.EncounterDeck).length;
    const drawn = until(move(r, "02177"), (x) => x.state.pending?.kind === "turn");
    expect(pile(gOf(drawn), ZONE.EncounterDeck).length).toBeLessThanOrEqual(deck - 3);
  });
});

describe("the encounter cards", () => {
  /** Roland draws this encounter card */
  function draw(r: Result, code: string, who = R): Result {
    let id = "";
    const made = mutate(r, (g) => {
      id = findByCode(g, code, [ZONE.EncounterDeck])?.id ?? createCard(g, code, ZONE.EncounterDeck);
    });
    return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
  }

  it("Across Space and Time: the top 3 cards of your deck discarded", () => {
    const r = essex();
    const n = inv(gOf(r), R).deck.length;
    const after = toTurn(draw(r, "02178"), R);
    expect(inv(gOf(after), R).deck.length).toBe(n - 3);
  });

  it("Helpless Passenger: into play at the location to your left, uncontrolled; parley takes control; leaving play, 1 horror each", () => {
    const r = essex({ invs: [R, D], prep: (g) => void standAt(g, 2) });
    const after = toTurn(draw(r, "02179"), R);
    const g = gOf(after);
    const p = findByCode(g, "02179", [ZONE.Attached])!;
    expect(p.location).toBe(carAt(g, 1));
    expect(p.controller).toBeNull();
    // at the leftmost, no location to the left: at Roland's own
    const left = toTurn(draw(essex({ invs: [R, D] }), "02179"), R);
    expect(findByCode(gOf(left), "02179", [ZONE.Attached])!.location).toBe(carAt(gOf(left), 0));
    const parley = toTurn(pick(left, /^Helpless Passenger/), R);
    const taken = findByCode(gOf(parley), "02179", [ZONE.Play])!;
    expect(taken.controller).toBe(R);
    // defeated by a point of damage, it leaves play
    const hurt = inject(parley, () => {}, {
      t: STEP.Eff,
      effect: { op: "takeDamage", amount: 1 },
      ctx: { you: R, source: null },
    });
    const gone = toTurn(pick(hurt, /Helpless Passenger/), R);
    expect(findByCode(gOf(gone), "02179", [ZONE.Play])).toBeUndefined();
    expect(inv(gOf(gone), R).horror).toBe(1);
    expect(inv(gOf(gone), D).horror).toBe(1);
  });

  it("Claws of Steam: failing, 2 damage to your assets first and no moving this round", () => {
    let ally = "";
    const r = essex({
      bag: ["autoFail"],
      prep: (g) => {
        ally = inPlay(g, R, "01117");
        setCounter(g, carAt(g, 0), "clues", 0);
      },
    });
    const asked = draw(r, "02180");
    const after = toTurn(asked, R);
    expect(card(gOf(after), ally).damage).toBe(2);
    expect(inv(gOf(after), R).damage).toBe(0);
    expect(options(after).some((o) => o.startsWith("Move"))).toBe(false);
  });

  it("Broken Rails: each investigator at your location loses 1 action; with 4 damage, also an asset", () => {
    let gun = "";
    const r = essex({
      invs: [R, D],
      prep: (g) => {
        gun = inPlay(g, R, "01006");
        setCounter(g, R, "damage", 4);
      },
    });
    const before = inv(gOf(r), R).actionsLeft;
    const after = toTurn(draw(r, "02181"), R);
    expect(inv(gOf(after), R).actionsLeft).toBe(before - 1);
    expect(card(gOf(after), gun).zone).not.toBe(ZONE.Play);
  });

  it("Grappling Horror: hunter; engaged, you can't move", () => {
    const r = essex({
      prep: (g) => {
        setCounter(g, carAt(g, 0), "clues", 0);
        putEnemy(g, "02182", carAt(g, 0), R);
      },
    });
    expect(options(r).some((o) => o.startsWith("Move"))).toBe(false);
  });

  it("Emergent Monstrosity: spawns to your right, exhausted", () => {
    const r = essex({ prep: (g) => void standAt(g, 2) });
    const after = toTurn(draw(r, "02183"), R);
    const m = findByCode(gOf(after), "02183", [ZONE.Enemy])!;
    expect(m.location).toBe(carAt(gOf(after), 3));
    expect(m.exhausted).toBe(true);
    const engine = toTurn(draw(essex({ prep: (g) => void standAt(g, 6) }), "02183"), R);
    expect(findByCode(gOf(engine), "02183", [ZONE.Enemy])!.location).toBe(carAt(gOf(engine), 6));
  });
});

// ---------- 4.6 the campaign ----------
describe("the campaign", () => {
  function walk(c: CampaignState): CampaignState {
    for (let k = 0; k < 50 && c.flow.waiting; k++) {
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
  /** the campaign at The Essex County Express: EA and HAW R1, the Museum R2 (Roland takes the Necronomicon) */
  function atEssex(difficulty: Difficulty = "standard") {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-dunwich-legacy",
        difficulty,
        seed: 2,
        investigators: [
          { code: R, deckId: "roland-starter" },
          { code: D, deckId: "daisy-starter" },
        ],
      }),
    );
    c = finish(c, "R1");
    c = finish(c, "R1");
    c = finish(c, "R2");
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "essex-county-express" });
    return c;
  }
  const count = (bag: ChaosToken[], t: ChaosToken) => bag.filter((x) => x === t).length;
  const xpOf = (c: CampaignState, who: string) => c.investigators.find((i) => i.code === who)!;

  it("Hard: a −4 is in the bag in the Express, and still in it in Blood on the Altar", () => {
    const c = atEssex("hard");
    const before = count(c.chaosBag, "-4");
    const setup = scenarioSetup(db, c, 1);
    expect(count(setup.chaosBag ?? [], "-4")).toBe(before);
    const next = finish(c, "R1");
    expect(next.flow.waiting?.step).toEqual({ kind: "play", scenario: "blood-on-the-altar" });
    expect(count(scenarioSetup(db, next, 1).chaosBag ?? [], "-4")).toBe(before);
    // the token came from the Express's setup step in the flow (`before`): more than the campaign's starting bag holds
    expect(before).toBeGreaterThan(
      count(db.campaigns["the-dunwich-legacy"].chaosBags.hard ?? [], "-4"),
    );
  });

  it("R1 with Roland defeated holding the Necronomicon: Across Space and Time, 1 bonus experience, the Necronomicon stolen", () => {
    const c = atEssex();
    expect(xpOf(c, R).deck).toContain("02140");
    const after = finish(c, "R1", (g) => setStatus(g, R, "defeated", "horror"));
    expect(xpOf(after, R).deck).toContain("02178");
    expect(xpOf(after, R).deck).not.toContain("02140");
    expect(xpOf(after, D).deck).not.toContain("02178");
    expect(xpOf(after, R).xp - xpOf(c, R).xp).toBe(xpOf(after, D).xp - xpOf(c, D).xp + 1);
    expect(hasEntry(after.log, "necronomiconStolen")).toBe(true);
    expect(hasEntry(after.log, "investigatorsDelayed")).toBe(false);
  });

  it("R1 with no one defeated: no defeat steps; R2 and no resolution: delayed on the way to Dunwich", () => {
    const c = atEssex();
    const r1 = finish(c, "R1");
    expect(xpOf(r1, R).deck).not.toContain("02178");
    expect(hasEntry(r1.log, "necronomiconStolen")).toBe(false);
    for (const id of ["R2", "none"]) {
      const out = finish(c, id, (g) => {
        setStatus(g, R, "defeated", "horror");
        setStatus(g, D, "defeated", "horror");
      });
      expect(hasEntry(out.log, "investigatorsDelayed")).toBe(true);
      expect(xpOf(out, D).deck).toContain("02178");
      expect(hasEntry(out.log, "necronomiconStolen")).toBe(true);
    }
  });
});

// ---------- random legal play: the engine never throws or dead-locks ----------
describe("random play", () => {
  for (const invs of [[R], [R, D], [R, D, "01003", "01004"]])
    for (const seed of [1, 2, 3])
      it(`${invs.join("+")} seed ${seed}`, () => {
        let r = essex({
          invs,
          seed,
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
