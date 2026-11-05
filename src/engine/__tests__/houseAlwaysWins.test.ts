/** The House Always Wins (campaign-the-dunwich-legacy, group 2): setup, tokens, map, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, dispatch, type Result } from "../index";
import { next } from "../world/rng";
import { db, gOf, mutate, options, pick, putEnemy, skipMulligans } from "../kits/testkit";
import { game, inject, inPlay, lastTest, toTurn, until } from "../kits/driver";
import { connections, enemies, findByCode, skillValue } from "../queries";
import {
  addCounter,
  card,
  currentAct,
  currentAgenda,
  currentTest,
  def,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setController,
  setPhase,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { remembered, resignedWith } from "../world/flags";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry } from "../campaign/log";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; 5 resources
const D = "01002"; // Daisy
const AFTER_EA = { warrenRiceKidnapped: true };

interface Opts {
  invs?: string[];
  log?: Record<string, unknown>;
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  prep?: (game: GameContext) => void;
}
/** The House Always Wins at its first turn: Roland alone, the bag a single 0 */
const haw = ({ invs = [R], log = {}, bag = ["0"], difficulty = "standard", prep }: Opts = {}) =>
  game({
    scenario: "the-house-always-wins",
    investigators: invs,
    bag,
    prep,
    extra: { campaignId: "the-dunwich-legacy", campaignLog: log, difficulty },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const where = (r: Result, code: string) => findByCode(gOf(r), code)?.zone;
const at = (r: Result, who = R) => card(gOf(r), inv(gOf(r), who).location!).code;
/** a set-aside location into play, revealed or not */
const place = (game: GameContext, code: string, revealed = true) => {
  const c = findByCode(game, code, [ZONE.SetAside])!;
  moveCard(game, c.id, ZONE.Location);
  if (revealed) reveal(game, c.id);
  return c.id;
};
/** Roland somewhere in the club, the location revealed */
const goTo = (game: GameContext, code: string) => {
  const id = loc(game, code) ?? place(game, code);
  reveal(game, id);
  placeInvestigator(game, R, id);
};
/** run steps (first first), then answer neutrally until Roland chooses an action again */
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** Roland draws this encounter card */
function draw(r: Result, code: string, who = R): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.EncounterDeck);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const willpowerTest = (difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill: "willpower", difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
const code = (r: Result, id: string | null) => (id ? card(gOf(r), id).code : null);
const toEnd = (r: Result) => until(r, () => false, 300);

// ---------- 2.2 setup ----------
describe("setup", () => {
  it("the club in play, everyone at La Bella Luna, the Pit Boss in the Lounge", () => {
    const r = haw({ invs: [R, D] });
    const g = gOf(r);
    for (const c of ["02070", "02071", "02072", "02073"]) expect(loc(g, c)).toBeDefined();
    expect(at(r, R)).toBe("02070");
    expect(at(r, D)).toBe("02070");
    const pit = findByCode(g, "02078", [ZONE.Enemy])!;
    expect(card(g, pit.location!).code).toBe("02071");
    expect(pit.engagedWith).toBeNull();
  });

  it("set aside: the Darkened Hall, the Back Hall Doorways, Peter Clover, Dr. Morgan, Hideous Abominations, Striking Fear", () => {
    const r = haw();
    const g = gOf(r);
    for (const c of [
      "02074",
      "02075",
      "02076",
      "02077",
      "02079",
      "02080",
      "02103",
      "02104",
      "01163",
      "01164",
      "01165",
    ])
      expect(where(r, c)).toBe(ZONE.SetAside);
    const deck = pile(g, "encounterDeck").map((id) => card(g, id).code);
    for (const c of ["02081", "02082", "02092", "02097", "01159"]) expect(deck).toContain(c);
    for (const c of ["02078", "02079", "02080", "02103", "02104", "01163"])
      expect(deck).not.toContain(c);
  });

  it("act 3 is All In before Extracurricular Activity, Fold after it", () => {
    const codes = (r: Result) => pile(gOf(r), "actDeck").map((id) => card(gOf(r), id).code);
    expect(codes(haw())).toEqual(["02067", "02068"]);
    expect(codes(haw({ log: AFTER_EA }))).toEqual(["02067", "02069"]);
  });
});

// ---------- 2.3 tokens ----------
describe("chaos tokens", () => {
  /** Roland tests willpower against `difficulty` with one token in the bag; `pay` answers the skull's question */
  function testWith(token: ChaosToken, difficulty: Difficulty, against = 0, pay = false) {
    const r = haw({ bag: [token], difficulty });
    let after = toTurn(
      inject(r, () => {}, willpowerTest(against)),
      (x) => x.state.pending?.promptKey === "payToZero",
    );
    if (pay) after = pick(after, "pay");
    after = toTurn(after, R);
    return {
      mods: mods(after),
      resources: inv(gOf(after), R).resources - inv(gOf(r), R).resources,
    };
  }

  for (const d of ["easy", "standard"] as const) {
    it(`${d}: skull −2, or 2 resources to make it a 0`, () => {
      expect(testWith("skull", d)).toEqual({ mods: [-2], resources: 0 });
      expect(testWith("skull", d, 0, true)).toEqual({ mods: [0], resources: -2 });
    });
    it(`${d}: cultist −3, a success gains 3 resources`, () => {
      expect(testWith("cultist", d)).toEqual({ mods: [-3], resources: 3 });
      expect(testWith("cultist", d, 10).resources).toBe(0);
    });
    it(`${d}: tablet −2, a failure discards 3 resources`, () => {
      expect(testWith("tablet", d, 10)).toEqual({ mods: [-2], resources: -3 });
      expect(testWith("tablet", d).resources).toBe(0);
    });
  }
  for (const d of ["hard", "expert"] as const) {
    it(`${d}: skull −3, or 3 resources to make it a 0`, () => {
      expect(testWith("skull", d)).toEqual({ mods: [-3], resources: 0 });
      expect(testWith("skull", d, 0, true)).toEqual({ mods: [0], resources: -3 });
    });
    it(`${d}: cultist −3, a failure discards 3 resources`, () => {
      expect(testWith("cultist", d, 10)).toEqual({ mods: [-3], resources: -3 });
      expect(testWith("cultist", d).resources).toBe(0);
    });
    it(`${d}: tablet −2, 3 resources discarded either way`, () => {
      expect(testWith("tablet", d)).toEqual({ mods: [-2], resources: -3 });
    });
  }
});

// ---------- 2.4 connections ----------
describe("connections", () => {
  it("as the card scans print them", () => {
    const r = haw({
      prep: (g) => {
        for (const c of ["02074", "02075", "02076", "02077"]) place(g, c);
      },
    });
    const g = gOf(r);
    const links = (c: string) =>
      connections(g, loc(g, c)!)
        .map((id) => card(g, id).code)
        .sort();
    expect(links("02070")).toEqual(["02071"]);
    expect(links("02071")).toEqual(["02070", "02072", "02073"]);
    expect(links("02072")).toEqual(["02071", "02073"]);
    expect(links("02073")).toEqual(["02071", "02072", "02074"]);
    expect(links("02074")).toEqual(["02073", "02075", "02076", "02077"]);
    for (const c of ["02075", "02076", "02077"]) expect(links(c)).toEqual(["02074"]);
  });
});

// ---------- 2.5 cards ----------
describe("the scenario's cards", () => {
  it("02063 The Clover Club: Criminals are aloof; damage to one advances the agenda", () => {
    const r = haw({ prep: (g) => goTo(g, "02071") });
    const pit = findByCode(gOf(r), "02078", [ZONE.Enemy])!.id;
    expect(card(gOf(r), pit).engagedWith).toBeNull();
    const hit = run(r, { t: STEP.DamageEnemy, enemy: pit, amount: 1, by: R });
    expect(code(hit, currentAgenda(gOf(hit)))).toBe("02064");
  });

  it("02063's back after Extracurricular Activity: straight to agenda 2b, La Bella Luna gone", () => {
    const r = haw({ log: AFTER_EA });
    const after = run(r, { t: STEP.AdvanceAgenda });
    expect(code(after, currentAgenda(gOf(after)))).toBe("02065");
    expect(where(after, "02070")).toBe(ZONE.Removed);
    expect(at(after)).toBe("02071");
  });

  it("02064 Underground Muscle: an Abomination in the Lounge, Striking Fear shuffled in, everyone out of La Bella Luna", () => {
    const r = run(haw(), { t: STEP.AdvanceAgenda });
    expect(code(r, currentAgenda(gOf(r)))).toBe("02064");
    const after = run(r, { t: STEP.AdvanceAgenda });
    const g = gOf(after);
    const abom = enemies(g).find((e) => ["02103", "02104"].includes(e.code))!;
    expect(card(g, abom.location!).code).toBe("02071");
    expect(where(after, "02070")).toBe(ZONE.Removed);
    expect(at(after)).toBe("02071");
    const deck = pile(g, "encounterDeck").map((id) => card(g, id).code);
    expect(deck).toContain("01163");
    expect(code(after, currentAgenda(g))).toBe("02065");
  });

  it("02065 Chaos in the Clover Club: as the enemy phase begins, Criminals with an Abomination are discarded; back (→R4)", () => {
    let thug = "";
    let mobster = "";
    const r = run(haw({ log: AFTER_EA }), { t: STEP.AdvanceAgenda });
    const ready = mutate(r, (g) => {
      const lounge = loc(g, "02071")!;
      putEnemy(g, "02103", lounge, null);
      thug = putEnemy(g, "02097", lounge, null);
      mobster = putEnemy(g, "02098", loc(g, "02072")!, null);
    });
    // the window's condition reads the phase: it opens in the enemy phase
    const inEnemy = run(
      mutate(ready, (g) => setPhase(g, "enemy")),
      { t: STEP.Window, trigger: "phaseBegins", data: { phase: "enemy" } },
    );
    expect(card(gOf(inEnemy), thug).zone).toBe(ZONE.EncounterDiscard);
    expect(card(gOf(inEnemy), mobster).zone).toBe(ZONE.Enemy);
    expect(toEnd(inject(r, () => {}, { t: STEP.AdvanceAgenda })).state.resolution).toBe("R4");
  });

  it("02066 Beginner's Luck: a revealed token treated as another of the bag, and you have cheated", () => {
    const r = haw({ bag: ["-4", "+1"] });
    const win = until(
      inject(r, () => {}, willpowerTest(0)),
      (x) => options(x).some((o) => /Beginner's Luck/.test(o)),
    );
    const drawn = currentTest(gOf(win))!.tokens[0];
    const other = drawn === "-4" ? "+1" : "-4";
    const asked = pick(win, /Beginner's Luck/);
    const done = toTurn(pick(asked, other), R);
    expect(mods(done)).toEqual([Number(other)]);
    expect(remembered.get(gOf(done), ["cheated", R])).toBe(true);
    // group limit once per round: no second offer this round
    const again = toTurn(
      inject(done, () => {}, willpowerTest(0)),
      (x) => options(x).some((o) => /Beginner's Luck/.test(o)),
    );
    expect(options(again).some((o) => /Beginner's Luck/.test(o))).toBe(false);
  });

  it("02066's back: the Darkened Hall into play and, on agenda 1, a Criminal enemy spawns there", () => {
    const r = haw();
    const after = run(r, { t: STEP.AdvanceAct });
    const g = gOf(after);
    const hall = loc(g, "02074")!;
    expect(hall).toBeDefined();
    expect(
      enemies(g).some((e) => e.location === hall && def(g, e.id).traits.includes("Criminal")),
    ).toBe(true);
    expect(code(after, currentAct(g))).toBe("02067");
  });

  it("02067 Skin Game: clues spent in the VIP Area advance it; Dr. Morgan in the VIP Area (All In)", () => {
    const r = run(haw(), { t: STEP.AdvanceAct });
    const ready = mutate(r, (g) => {
      goTo(g, "02076");
      addCounter(g, R, "clues", 2);
    });
    const after = toTurn(pick(ready, /Skin Game/), R);
    const g = gOf(after);
    expect(code(after, currentAct(g))).toBe("02068");
    const morgan = findByCode(g, "02080", [ZONE.Attached])!;
    expect(card(g, morgan.location!).code).toBe("02076");
    expect(morgan.controller).toBeNull();
    // only from the VIP Area
    const away = mutate(r, (g) => addCounter(g, R, "clues", 2));
    expect(options(away).some((o) => /Skin Game/.test(o))).toBe(false);
  });

  it("02067's back after Extracurricular Activity: Peter Clover and an Abomination in the Bar (Fold)", () => {
    const r = run(haw({ log: AFTER_EA }), { t: STEP.AdvanceAct }, { t: STEP.AdvanceAct });
    const g = gOf(r);
    expect(code(r, currentAct(g))).toBe("02069");
    const bar = loc(g, "02072")!;
    expect(findByCode(g, "02079", [ZONE.Attached])!.location).toBe(bar);
    expect(
      enemies(g).some((e) => e.location === bar && def(g, e.id).traits.includes("Abomination")),
    ).toBe(true);
  });

  it("02068 All In: parley with Dr. Morgan (willpower 3) — a clue on him, then control", () => {
    const r = run(
      haw({ prep: (g) => goTo(g, "02076") }),
      { t: STEP.AdvanceAct },
      { t: STEP.AdvanceAct },
    );
    const won = toTurn(pick(r, /All In: parley/), R); // willpower 3 + 0 vs 3
    const g = gOf(won);
    const morgan = findByCode(g, "02080")!;
    expect(morgan.controller).toBe(R);
    expect(morgan.zone).toBe(ZONE.Play);
    expect(skillValue(g, R, "combat")).toBe(5);
  });

  it("02069 Fold: parley with Peter Clover (willpower 3) — two investigators need 2 clues on him", () => {
    const r = run(
      haw({ invs: [R, D], log: AFTER_EA }),
      { t: STEP.AdvanceAct },
      { t: STEP.AdvanceAct },
    );
    const there = mutate(r, (g) => goTo(g, "02072"));
    const once = toTurn(pick(there, /Fold: parley/), R);
    const peter = findByCode(gOf(once), "02079")!;
    expect(peter.clues).toBe(1);
    expect(peter.controller).toBeNull();
    const twice = toTurn(pick(once, /Fold: parley/), R);
    expect(findByCode(gOf(twice), "02079")!.controller).toBe(R);
  });

  it("02070 La Bella Luna and 02077 Back Alley: resign", () => {
    expect(options(haw())).toContain("La Bella Luna: resign");
    const r = haw({ prep: (g) => goTo(g, "02077") });
    expect(options(r)).toContain("Back Alley: resign");
  });

  it("02071 Clover Club Lounge: on act 1, an Ally from hand for 2 clues, once per game", () => {
    let ally = "";
    const r = haw({
      prep: (g) => {
        ally = createCard(g, "01021", ZONE.Limbo, R);
        moveCard(g, ally, ZONE.Hand);
        goTo(g, "02071");
      },
    });
    const pitAway = mutate(r, (g) => {
      const pit = findByCode(g, "02078", [ZONE.Enemy])!.id;
      moveCard(g, pit, ZONE.Removed);
    });
    const after = toTurn(pick(pitAway, /Lounge: discard/), R);
    expect(inv(gOf(after), R).clues).toBe(2);
    expect(card(gOf(after), ally).zone).toBe(ZONE.Discard);
    expect(options(after).some((o) => /Lounge: discard/.test(o))).toBe(false);
  });

  it("02072 Clover Club Bar: 2 resources for 2 clues and 2 cards; the drink costs an action to Something in the Drinks", () => {
    const r = haw({ invs: [R, D], prep: (g) => goTo(g, "02072") });
    const hand = inv(gOf(r), R).hand.length;
    const drank = toTurn(pick(r, /Bar: spend/), R);
    expect(inv(gOf(drank), R).clues).toBe(2);
    expect(inv(gOf(drank), R).hand.length).toBe(hand + 2);
    expect(inv(gOf(drank), R).resources).toBe(inv(gOf(r), R).resources - 2);
    // 02081 Something in the Drinks, drawn by Daisy: Roland (who drank) loses an action, now on his turn
    const left = inv(gOf(drank), R).actionsLeft;
    const drinks = toTurn(draw(drank, "02081", D), R);
    expect(inv(gOf(drinks), R).actionsLeft).toBe(left - 1);
    expect(inv(gOf(drinks), D).actionsLeft).toBe(inv(gOf(drank), D).actionsLeft);
  });

  it("02073 Clover Club Cardroom: 2 resources to reveal a token; the elder sign gains 2 clues and 2 resources", () => {
    const r = haw({ bag: ["elderSign"], prep: (g) => goTo(g, "02073") });
    const after = toTurn(pick(r, /Cardroom: spend/), R);
    expect(inv(gOf(after), R).clues).toBe(2);
    expect(inv(gOf(after), R).resources).toBe(inv(gOf(r), R).resources);
    const odd = toTurn(
      pick(haw({ bag: ["-1"], prep: (g) => goTo(g, "02073") }), /Cardroom: spend/),
      R,
    );
    expect(inv(gOf(odd), R).clues).toBe(0);
  });

  it("the club's games end with act 1", () => {
    const r = run(haw({ prep: (g) => goTo(g, "02073") }), { t: STEP.AdvanceAct });
    expect(options(r).some((o) => /Cardroom: spend/.test(o))).toBe(false);
  });

  it("02074 Darkened Hall: revealed, the three Back Hall Doorways come into play", () => {
    const r = haw({ prep: (g) => void place(g, "02074", false) });
    const after = run(r, { t: STEP.RevealLocation, location: loc(gOf(r), "02074")! });
    for (const c of ["02075", "02076", "02077"]) expect(where(after, c)).toBe(ZONE.Location);
  });

  it("02075 Art Gallery: failing to investigate it loses 2 resources", () => {
    const r = haw({ bag: ["-4"], prep: (g) => goTo(g, "02075") });
    const after = toTurn(pick(r, /^Investigate/), R);
    expect(lastTest(after)?.success).toBe(false);
    expect(inv(gOf(after), R).resources).toBe(inv(gOf(r), R).resources - 2);
  });

  it("02076 VIP Area: no upkeep draw or resource there", () => {
    const r = haw({ prep: (g) => goTo(g, "02076") });
    const hand = inv(gOf(r), R).hand.length;
    const res = inv(gOf(r), R).resources;
    const next = toTurn(pick(r, "End turn"), R);
    expect(inv(gOf(next), R).hand.length).toBe(hand);
    expect(inv(gOf(next), R).resources).toBe(res);
  });

  it("02078 Clover Club Pit Boss: clues gained at its location ready it, engage and attack", () => {
    const r = haw({ prep: (g) => goTo(g, "02071") });
    const pit = findByCode(gOf(r), "02078", [ZONE.Enemy])!.id;
    const after = run(r, {
      t: STEP.Eff,
      effect: { op: "gainClues", amount: 1 },
      ctx: { you: R, source: null },
    });
    expect(card(gOf(after), pit).engagedWith).toBe(R);
    expect(inv(gOf(after), R).damage).toBe(2);
    // elsewhere it doesn't notice
    const away = run(haw(), {
      t: STEP.Eff,
      effect: { op: "gainClues", amount: 1 },
      ctx: { you: R, source: null },
    });
    expect(inv(gOf(away), R).damage).toBe(0);
  });

  it("02079 Peter Clover: 1 damage at the enemy phase while no one controls him; controlled, he evades a Criminal", () => {
    let peter = "";
    const r = haw({
      prep: (g) => {
        peter = findByCode(g, "02079", [ZONE.SetAside])!.id;
        moveCard(g, peter, ZONE.Attached, { location: inv(g, R).location });
        setController(g, peter, null);
      },
    });
    const hurt = run(
      mutate(r, (g) => setPhase(g, "enemy")),
      { t: STEP.Window, trigger: "phaseBegins", data: { phase: "enemy" } },
    );
    expect(card(gOf(hurt), peter).damage).toBe(1);
    let thug = "";
    const mine = haw({
      prep: (g) => {
        peter = findByCode(g, "02079", [ZONE.SetAside])!.id;
        moveCard(g, peter, ZONE.Play);
        setController(g, peter, R);
        thug = putEnemy(g, "02097", inv(g, R).location!, R);
      },
    });
    const evaded = toTurn(pick(mine, /Peter Clover: evade/), R);
    expect(card(gOf(evaded), thug).engagedWith).toBeNull();
    expect(card(gOf(evaded), thug).exhausted).toBe(true);
  });

  it("02080 Dr. Francis Morgan: +1 combat; after you defeat an enemy, exhaust him to draw 1 card", () => {
    let ghoul = "";
    let morgan = "";
    const r = haw({
      prep: (g) => {
        morgan = inPlay(g, R, "02080");
        ghoul = putEnemy(g, "01160", inv(g, R).location!, R);
      },
    });
    expect(skillValue(gOf(r), R, "combat")).toBe(5);
    const deck = inv(gOf(r), R).deck.length;
    const killed = until(
      inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: ghoul, by: R } as Step),
      (x) => options(x).some((o) => /Morgan: draw/.test(o)),
    );
    const drew = toTurn(pick(killed, /Morgan: draw/), R);
    expect(inv(gOf(drew), R).deck.length).toBe(deck - 1);
    expect(card(gOf(drew), morgan).exhausted).toBe(true);
  });

  it("02081 Something in the Drinks: whoever had a drink loses an action off their next turn", () => {
    const r = haw({ invs: [R, D], prep: (g) => remembered.set(g, ["hadADrink", D], true) });
    const drawn = toTurn(draw(r, "02081"), R);
    expect(inv(gOf(drawn), R).actionsLeft).toBe(inv(gOf(r), R).actionsLeft);
    const daisy = toTurn(pick(drawn, "End turn"), D);
    expect(inv(gOf(daisy), D).actionsLeft).toBe(2);
  });

  it("02082 Arousing Suspicions: doom on each Criminal here, else 2 resources lost", () => {
    const r = haw({ prep: (g) => goTo(g, "02071") });
    const pit = findByCode(gOf(r), "02078", [ZONE.Enemy])!.id;
    const doom = toTurn(draw(r, "02082"), R);
    expect(card(gOf(doom), pit).doom).toBe(1);
    const none = toTurn(draw(haw(), "02082"), R);
    expect(inv(gOf(none), R).resources).toBe(inv(gOf(haw()), R).resources - 2);
  });
});

// ---------- 2.6 the resolutions ----------
describe("the resolutions, played", () => {
  /** act 3 current, Roland at La Bella Luna with its resign */
  const act3 = (opts: Opts = {}) =>
    run(
      haw({ ...opts, prep: (g) => void place(g, "02076") }),
      { t: STEP.AdvanceAct },
      { t: STEP.AdvanceAct },
    );
  const take = (r: Result, ally: string) =>
    mutate(r, (g) => {
      const c = findByCode(g, ally)!;
      moveCard(g, c.id, ZONE.Play);
      setController(g, c.id, R);
    });
  const resign = (r: Result) => toEnd(pick(r, "La Bella Luna: resign"));

  it("R1: All In, resigned without Dr. Morgan", () => {
    expect(resign(act3()).state.resolution).toBe("R1");
  });

  it("R2: All In, resigned with Dr. Morgan", () => {
    const r = take(act3(), "02080");
    const end = resign(r);
    expect(end.state.resolution).toBe("R2");
    expect(resignedWith.get(gOf(end), R)).toContain("02080");
  });

  it("R3: Fold, resigned with Peter Clover; R1 without him", () => {
    const r = act3({ log: AFTER_EA });
    expect(resign(take(r, "02079")).state.resolution).toBe("R3");
    expect(resign(r).state.resolution).toBe("R1");
  });

  it("R4: the agenda deck runs out", () => {
    const r = run(haw(), { t: STEP.AdvanceAgenda }, { t: STEP.AdvanceAgenda });
    expect(toEnd(inject(r, () => {}, { t: STEP.AdvanceAgenda })).state.resolution).toBe("R4");
  });

  it("no resolution: everyone resigned before act 3", () => {
    const r = haw({ invs: [R, D] });
    const one = toTurn(pick(r, "La Bella Luna: resign"), D);
    expect(resign(one).state.resolution).toBe("none");
  });

  it("the cheat is told to the campaign log as the game ends", () => {
    const r = haw({ prep: (g) => remembered.set(g, ["cheated", R], true) });
    expect(resign(r).state.flags["log:hidden:cheated"]).toBe(true);
    expect(resign(haw()).state.flags["log:hidden:cheated"]).toBeUndefined();
  });
});

// ---------- 2.6 the campaign after it ----------
describe("the campaign", () => {
  /** answer the flow's prompts: read on, the first investigator, chooseOne by `choose` */
  function walk(c: CampaignState, choose: Record<string, string> = {}): CampaignState {
    for (let k = 0; k < 50 && c.flow.waiting; k++) {
      const w = c.flow.waiting;
      const st = w.step;
      if (st.kind === "play") break;
      const value =
        st.kind === "chooseOne"
          ? (choose[w.id] ?? st.choices[0].id)
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
  const begin = () =>
    walk(
      startCampaign(db, {
        campaignId: "the-dunwich-legacy",
        difficulty: "standard",
        seed: 2,
        investigators: [{ code: R, deckId: "roland-starter" }],
      }),
      { "dwl-prologue:scenario_choice": "1b" },
    );

  it("first scenario: no resolution plays as R1, and the cheat adds an elder thing token", () => {
    let c = begin();
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-house-always-wins" });
    const bag = c.chaosBag.filter((t) => t === "elderThing").length;
    c = walk(finish(c, "none", (g) => remembered.set(g, ["cheated", R], true)));
    expect(hasEntry(c.log, "boneToPick")).toBe(true);
    expect(hasEntry(c.log, "francisMorganKidnapped")).toBe(true);
    expect(c.chaosBag.filter((t) => t === "elderThing").length).toBe(bag + 1);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "extracurricular-activity" });
  });

  it("no cheat, no elder thing; R2 rescues Dr. Morgan", () => {
    let c = begin();
    c = walk(finish(c, "R2", () => {}));
    expect(c.chaosBag.includes("elderThing")).toBe(false);
    expect(hasEntry(c.log, "francisMorganRescued")).toBe(true);
    expect(c.investigators[0].deck).toContain("02080");
  });
});

// ---------- random legal play: the engine never throws or dead-locks ----------
describe("random play", () => {
  for (const [invs, log] of [
    [[R], {}],
    [[R, D], AFTER_EA],
    [[R, D, "01003", "01004"], {}],
  ] as const)
    for (const seed of [1, 2, 3])
      it(`${invs.join("+")} seed ${seed}`, () => {
        let r = haw({
          invs: [...invs],
          log,
          bag: ["+1", "0", "-1", "-2", "skull", "cultist", "tablet", "autoFail", "elderSign"],
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
