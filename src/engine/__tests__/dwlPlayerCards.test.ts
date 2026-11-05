/** The Dunwich Legacy's player cards and its five investigators (player-cards-dwl, group 1): one test each, at least. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { logEntry } from "../world/flags";
import { card, exhaust, inv, placeInvestigator, setController, setCounter } from "../context";
import type { GameContext } from "../context";
import {
  addLocation,
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  investigate,
  lastTest,
  play,
  toTurn,
  until,
  use,
  windowOf,
} from "../kits/driver";
import { commitDone, deckCodes, gOf, locId, options, pick, putEnemy } from "../kits/testkit";
import { createCard, moveCard, putOnTop } from "../movement";
import { controlled, enemies, findByCode } from "../queries";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import type { Result } from "../index";
import type { ChaosToken, Effect } from "../../content/schema";

beforeAll(() => loadPack("dwl"));

const ROLAND = "01001"; // willpower 3, intellect 3, combat 4, agility 2
const DAISY = "01002";
const ZOEY = "02001";
const REX = "02002";
const JENNY = "02003";
const JIM = "02004";
const PETE = "02005"; // willpower 4, intellect 2, combat 2, agility 3
const STUDY = "01111";
const HALLWAY = "01112"; // shroud 1
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3
const DUKE = "02014";

/** the Study with the Hallway (1 clue, unless said) beside it */
const hallway = (game: GameContext, clues = 1) => {
  const id = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
  setCounter(game, id, "clues", clues);
  return id;
};
const at = (r: Result, i: string) => card(gOf(r), inv(gOf(r), i).location!).code;
const cardOf = (r: Result, id: string) => card(gOf(r), id);
/** run one effect for an investigator, answering neutrally until the next turn */
const effect = (r: Result, you: string, e: Effect) =>
  toTurn(inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source: null } }));
/** the token modifiers of the last skill test */
const tokenMods = (r: Result) =>
  (r.state.log.findLast((x) => x.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;

describe("the Dunwich investigators", () => {
  it("Zoey Samaras gains 1 resource when an enemy engages her", () => {
    let r = game({ investigators: [ZOEY] });
    const before = inv(gOf(r), ZOEY).resources;
    const minion = createCard(gOf(r), MINION, ZONE.Limbo);
    r = inject(r, (g) => moveCard(g, minion, ZONE.Limbo), {
      t: STEP.Spawn,
      enemy: minion,
      inv: ZOEY,
    });
    r = pick(r, /^Zoey: gain 1 resource/);
    expect(inv(gOf(r), ZOEY).resources).toBe(before + 1);
  });

  it("Zoey's elder sign: +1, and the attack deals +1 damage", () => {
    let r = game({
      investigators: [ZOEY],
      bag: ["elderSign"],
      prep: (g) => enemyHere(g, ZOEY, RAVENOUS),
    });
    r = toTurn(effect(r, ZOEY, { op: "fight" }), ZOEY);
    expect(lastTest(r)?.success).toBe(true);
    expect(tokenMods(r)).toEqual([1]);
    const ghoul = enemies(gOf(r))[0];
    expect(ghoul.damage).toBe(2);
  });

  it("Rex Murphy discovers 1 more clue after succeeding by 2 while investigating", () => {
    let r = game({
      investigators: [REX],
      bag: ["0"],
      prep: (g) => setCounter(g, inv(g, REX).location!, "clues", 3),
    });
    // intellect 4 against the Study's shroud 2
    r = until(investigate(r), (x) => options(x).some((o) => o.startsWith("Rex:")));
    r = toTurn(pick(r, /^Rex:/), REX);
    expect(inv(gOf(r), REX).clues).toBe(2);
  });

  it("Rex's elder sign may instead fail the test to draw 3 cards", () => {
    let r = game({ investigators: [REX], bag: ["elderSign"] });
    const deck0 = inv(gOf(r), REX).deck.length;
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "intellect", difficulty: 1 },
      ctx: { you: REX, source: null },
    });
    r = until(r, (x) => options(x).some((o) => /Automatically fail/.test(o)));
    r = toTurn(pick(r, /Automatically fail/), REX);
    expect(lastTest(r)?.success).toBe(false);
    expect(inv(gOf(r), REX).deck.length).toBe(deck0 - 3);
  });

  it("Jenny Barnes collects 2 resources in the upkeep; her elder sign is +1 per resource", () => {
    let r = game({ investigators: [JENNY], bag: ["elderSign"] });
    const before = inv(gOf(r), JENNY).resources;
    r = inject(r, () => {}, { t: STEP.GainResource, inv: JENNY });
    expect(inv(gOf(r), JENNY).resources).toBe(before + 2);
    r = effect(r, JENNY, { op: "skillTest", skill: "willpower", difficulty: 1 });
    expect(tokenMods(r)).toEqual([before + 2]);
  });

  it("Jim Culver's skull is 0 and its effect still resolves (The Gathering, Hard)", () => {
    let r = game({
      investigators: [JIM],
      bag: ["skull"],
      extra: { difficulty: "hard" },
    });
    const foes = enemies(gOf(r)).length;
    r = effect(r, JIM, { op: "skillTest", skill: "willpower", difficulty: 6 });
    expect(tokenMods(r)).toEqual([0]);
    expect(lastTest(r)?.success).toBe(false);
    // the hard skull's failure draws a Ghoul from the encounter deck
    expect(enemies(gOf(r)).length).toBe(foes + 1);
  });

  it("Jim Culver may treat his elder sign as a skull", () => {
    let r = game({ investigators: [JIM], bag: ["elderSign"] });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 2 },
      ctx: { you: JIM, source: null },
    });
    r = until(r, (x) => windowOf(x) === "tokenRevealed");
    r = toTurn(pick(r, /treat the elder sign as a skull/), JIM);
    // a skull, and Jim's skull is 0 (not the elder sign's +1)
    expect(tokenMods(r)).toEqual([0]);
  });

  it('"Ashcan" Pete begins with Duke in play, not in his deck or hand', () => {
    const r = game({
      investigators: [PETE],
      extra: { investigators: [{ code: PETE, deck: [...deckCodes("roland-starter"), DUKE] }] },
    });
    const g = gOf(r);
    const dukes = controlled(g, PETE).filter((c) => c.code === DUKE);
    expect(dukes).toHaveLength(1);
    expect(dukes[0].zone).toBe(ZONE.Play);
    expect(
      [...inv(g, PETE).deck, ...inv(g, PETE).hand].some((id) => card(g, id).code === DUKE),
    ).toBe(false);
  });

  it("Pete discards a card to ready an exhausted asset, once per round; his elder sign readies Duke", () => {
    let r = game({ investigators: [PETE], bag: ["elderSign"] });
    const duke = controlled(gOf(r), PETE).find((c) => c.code === DUKE)!.id;
    r = inject(r, (g) => exhaust(g, duke));
    const hand0 = inv(gOf(r), PETE).hand.length;
    r = use(r, PETE, 0);
    r = pick(r, /./); // the card to discard
    expect(cardOf(r, duke).exhausted).toBe(false);
    expect(inv(gOf(r), PETE).hand.length).toBe(hand0 - 1);
    r = inject(r, (g) => exhaust(g, duke));
    expect(options(r).some((o) => o.startsWith("Pete:"))).toBe(false);
    r = effect(r, PETE, { op: "skillTest", skill: "willpower", difficulty: 1 });
    expect(cardOf(r, duke).exhausted).toBe(false);
  });
});

describe("Duke", () => {
  it("attacks with a base combat of 4 and +1 damage", () => {
    let r = game({ investigators: [PETE], bag: ["0"], prep: (g) => enemyHere(g, PETE, RAVENOUS) });
    r = toTurn(use(r, DUKE, 0), PETE);
    expect(lastTest(r)?.base).toBe(4);
    expect(enemies(gOf(r))[0].damage).toBe(2);
  });

  it("moves to a connecting location, then investigates it with a base intellect of 4", () => {
    let hall = "";
    let r = game({ investigators: [PETE], bag: ["0"], prep: (g) => (hall = hallway(g)) });
    r = use(r, DUKE, 1);
    r = commitDone(pick(r, "Hallway"));
    r = toTurn(r, PETE);
    expect(at(r, PETE)).toBe(HALLWAY);
    expect(lastTest(r)?.base).toBe(4);
    expect(inv(gOf(r), PETE).clues).toBe(1);
    expect(cardOf(r, hall).clues).toBe(0);
    expect(controlled(gOf(r), PETE).find((c) => c.code === DUKE)!.exhausted).toBe(true);
  });
});

describe("the Dunwich player cards", () => {
  it("Zoey's Cross: exhaust and spend 1 resource to deal 1 damage to the enemy that engaged you", () => {
    let r = game({ investigators: [ROLAND], prep: (g) => void inPlay(g, ROLAND, "02006") });
    const minion = createCard(gOf(r), MINION, ZONE.Limbo);
    const res = inv(gOf(r), ROLAND).resources;
    r = inject(r, () => {}, { t: STEP.Spawn, enemy: minion, inv: ROLAND });
    r = pick(r, /^Zoey's Cross/);
    expect(cardOf(r, minion).damage).toBe(1);
    expect(inv(gOf(r), ROLAND).resources).toBe(res - 1);
  });

  it("Search for the Truth draws 1 card per clue on you, at most 5", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "02008");
        setCounter(g, ROLAND, "clues", 7);
      },
    });
    const deck0 = inv(gOf(r), ROLAND).deck.length;
    r = play(r, "02008");
    expect(inv(gOf(r), ROLAND).deck.length).toBe(deck0 - 5);
  });

  it("Jenny's Twin .45s: X resources paid, X ammo", () => {
    let r = game({ investigators: [JENNY], prep: (g) => void hand(g, JENNY, "02010") });
    const res = inv(gOf(r), JENNY).resources;
    r = play(r, "02010");
    r = pick(r, "X = 3");
    const guns = controlled(gOf(r), JENNY).find((c) => c.code === "02010")!;
    expect(guns.uses).toBe(3);
    expect(inv(gOf(r), JENNY).resources).toBe(res - 3);
  });

  it("Jim's Trumpet heals 1 horror from an investigator at a connecting location when a skull is revealed", () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      bag: ["skull"],
      prep: (g) => {
        inPlay(g, ROLAND, "02012");
        placeInvestigator(g, DAISY, hallway(g));
        setCounter(g, DAISY, "horror", 2);
      },
    });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 1 },
      ctx: { you: ROLAND, source: null },
    });
    r = until(r, (x) => options(x).some((o) => o.startsWith("Jim's Trumpet")));
    r = pick(r, /^Jim's Trumpet/);
    r = pick(r, "Daisy Walker");
    expect(inv(gOf(r), DAISY).horror).toBe(1);
  });

  it("Wracked by Nightmares exhausts your assets, and they don't ready", () => {
    let flash = "";
    let r = game({ investigators: [ROLAND], prep: (g) => (flash = inPlay(g, ROLAND, "01087")) });
    const wracked = createCard(gOf(r), "02015", ZONE.Limbo, ROLAND);
    r = toTurn(
      inject(r, () => {}, { t: STEP.Revelation, inv: ROLAND, card: wracked }),
      ROLAND,
    );
    expect(cardOf(r, flash).exhausted).toBe(true);
    expect(cardOf(r, wracked).zone).toBe(ZONE.Threat);
    r = inject(r, () => {}, { t: STEP.ReadyAll });
    expect(cardOf(r, flash).exhausted).toBe(true);
  });

  it("Blackjack: a failed attack on an enemy engaged with another investigator deals them no damage", () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      bag: ["autoFail"],
      prep: (g) => {
        inPlay(g, ROLAND, "02016");
        putEnemy(g, MINION, inv(g, ROLAND).location!, DAISY);
      },
    });
    const before = inv(gOf(r), DAISY).damage;
    r = toTurn(use(r, "02016"), ROLAND);
    expect(lastTest(r)?.success).toBe(false);
    expect(inv(gOf(r), DAISY).damage).toBe(before);
  });

  it("Taunt (2) engages the enemies at your location and draws a card for each", () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        hand(g, ROLAND, "02019");
        putEnemy(g, MINION, inv(g, ROLAND).location!, DAISY);
        putEnemy(g, MINION, inv(g, ROLAND).location!, null);
      },
    });
    const hand0 = inv(gOf(r), ROLAND).hand.length;
    r = play(r, "02019");
    r = pick(r, "Ghoul Minion");
    r = pick(r, "Ghoul Minion");
    r = toTurn(r, ROLAND);
    expect(enemies(gOf(r)).every((e) => e.engagedWith === ROLAND)).toBe(true);
    expect(inv(gOf(r), ROLAND).hand.length).toBe(hand0 - 1 + 2);
  });

  it("Taunt engages any number of enemies at your location", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "02017");
        putEnemy(g, MINION, inv(g, ROLAND).location!, null);
      },
    });
    r = pick(play(r, "02017"), "Ghoul Minion");
    expect(enemies(gOf(r))[0].engagedWith).toBe(ROLAND);
  });

  it("Teamwork: an Item asset and resources change hands at your location", () => {
    let flash = "";
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        hand(g, ROLAND, "02018");
        flash = inPlay(g, ROLAND, "01087");
      },
    });
    const res = inv(gOf(r), DAISY).resources;
    r = play(r, "02018");
    // Daisy is the only other investigator there: she receives without a question
    r = pick(r, "Give Flashlight");
    r = pick(r, "Give 1 resource from Roland Banks");
    r = toTurn(pick(r, "Done"), ROLAND);
    expect(cardOf(r, flash).controller).toBe(DAISY);
    expect(inv(gOf(r), DAISY).resources).toBe(res + 1);
  });

  it("Strange Solution: a success discards it, draws 2 and records that the solution was identified", () => {
    let sol = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["+1"],
      prep: (g) => (sol = inPlay(g, ROLAND, "02021")),
    });
    const deck0 = inv(gOf(r), ROLAND).deck.length;
    r = toTurn(use(r, "02021"), ROLAND);
    expect(cardOf(r, sol).zone).toBe(ZONE.Discard);
    expect(inv(gOf(r), ROLAND).deck.length).toBe(deck0 - 2);
    expect(logEntry.get(gOf(r), ["", "identifiedTheSolution"])).toBe(true);
  });

  it("Shortcut moves an investigator at your location to a connecting location", () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        hand(g, ROLAND, "02022");
        hallway(g);
      },
    });
    r = pick(play(r, "02022"), "Daisy Walker");
    expect(at(r, DAISY)).toBe(HALLWAY);
    expect(at(r, ROLAND)).toBe(STUDY);
  });

  it("Seeking Answers discovers the clue at a connecting location instead", () => {
    let hall = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        hand(g, ROLAND, "02023");
        hall = hallway(g);
        setCounter(g, inv(g, ROLAND).location!, "clues", 2);
      },
    });
    r = toTurn(commitDone(play(r, "02023")), ROLAND);
    expect(inv(gOf(r), ROLAND).clues).toBe(1);
    expect(cardOf(r, hall).clues).toBe(0);
    expect(card(gOf(r), locId(gOf(r), STUDY)).clues).toBe(2);
  });

  it("Liquid Courage heals the chosen investigator, who then tests willpower and heals 1 more", () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02024");
        setCounter(g, DAISY, "horror", 3);
      },
    });
    r = pick(use(r, "02024"), "Daisy Walker");
    r = toTurn(r, ROLAND);
    expect(inv(gOf(r), DAISY).horror).toBe(1);
    expect(lastTest(r)?.success).toBe(true);
  });

  it("Think on Your Feet: you move away before the enemy spawns at your previous location", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "02025");
        hallway(g);
      },
    });
    const minion = createCard(gOf(r), MINION, ZONE.Limbo);
    r = inject(r, () => {}, { t: STEP.Spawn, enemy: minion, inv: ROLAND });
    expect(windowOf(r)).toBe("enemyWouldSpawn");
    r = toTurn(pick(r, /Think on Your Feet/), ROLAND);
    expect(at(r, ROLAND)).toBe(HALLWAY);
    expect(card(gOf(r), cardOf(r, minion).location!).code).toBe(STUDY);
    expect(cardOf(r, minion).engagedWith).toBe(null);
  });

  it("Double or Nothing doubles the difficulty and the clues a success discovers", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        hand(g, ROLAND, "02026");
        setCounter(g, inv(g, ROLAND).location!, "clues", 5);
        // intellect 3 + the card's wild icon = 4 against the Study's shroud 2, doubled
      },
    });
    // the action chosen by its label: the driver's `investigate` would close the commit window
    r = pick(r, "Investigate Study");
    r = toTurn(commitDone(pick(r, /^Commit Double or Nothing/)), ROLAND);
    expect(lastTest(r)?.difficulty).toBe(4);
    expect(inv(gOf(r), ROLAND).clues).toBe(2);
  });

  it("Double or Nothing with Deduction: each resolution discovers 2 clues", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["+1"],
      prep: (g) => {
        hand(g, ROLAND, "02026");
        hand(g, ROLAND, "01039");
        setCounter(g, inv(g, ROLAND).location!, "clues", 5);
      },
    });
    r = pick(r, "Investigate Study");
    r = pick(r, /^Commit Double or Nothing/);
    r = pick(r, /^Commit Deduction/);
    r = toTurn(commitDone(r), ROLAND);
    expect(lastTest(r)?.success).toBe(true);
    expect(inv(gOf(r), ROLAND).clues).toBe(4);
  });

  it("Hired Muscle: +1 combat; at the end of the upkeep, pay 1 resource or discard it", () => {
    let muscle = "";
    let r = game({ investigators: [ROLAND], prep: (g) => (muscle = inPlay(g, ROLAND, "02027")) });
    expect(
      lastTest(effect(r, ROLAND, { op: "skillTest", skill: "combat", difficulty: 0 }))?.base,
    ).toBe(5);
    const res = inv(gOf(r), ROLAND).resources;
    r = inject(r, () => {}, { t: STEP.Window, trigger: "upkeepPhaseEnds", data: {} });
    r = pick(r, "Pay 1 resource");
    expect(inv(gOf(r), ROLAND).resources).toBe(res - 1);
    expect(cardOf(r, muscle).zone).toBe(ZONE.Play);
  });

  it("Rite of Seeking: willpower, 1 more clue; a symbol ends the turn after the test", () => {
    const rite = (bag: ChaosToken[]) =>
      game({
        investigators: [ROLAND],
        bag,
        prep: (g) => {
          inPlay(g, ROLAND, "02028");
          setCounter(g, inv(g, ROLAND).location!, "clues", 3);
        },
      });
    let r = toTurn(use(rite(["0"]), "02028"), ROLAND);
    expect(inv(gOf(r), ROLAND).clues).toBe(2);
    expect(inv(gOf(r), ROLAND).actionsLeft).toBe(2);
    // a cultist: after the test, the 2 actions left are lost and the turn ends (the next turn is the next round's)
    r = rite(["cultist"]);
    const round = r.state.round;
    r = toTurn(use(r, "02028"));
    expect(r.state.round).toBe(round + 1);
  });

  it("Ritual Candles: +1 skill value when a symbol is revealed in your test", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["tablet"],
      prep: (g) => void inPlay(g, ROLAND, "02029"),
    });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 1 },
      ctx: { you: ROLAND, source: null },
    });
    r = until(r, (x) => options(x).some((o) => o.startsWith("Ritual Candles")));
    r = toTurn(pick(r, /^Ritual Candles/), ROLAND);
    expect(lastTest(r)?.base).toBe(4);
  });

  it("Bind Monster: evaded with willpower, the enemy keeps exhausted while a willpower test succeeds", () => {
    let minion = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        hand(g, ROLAND, "02031");
        minion = enemyHere(g, ROLAND, MINION);
      },
    });
    r = toTurn(commitDone(play(r, "02031")), ROLAND);
    const bind = findByCode(gOf(r), "02031", [ZONE.Attached])!;
    expect(bind.attachedTo).toBe(minion);
    expect(cardOf(r, minion).exhausted).toBe(true);
    r = inject(r, () => {}, {
      t: STEP.Window,
      trigger: "enemyWouldReady",
      data: { enemy: minion },
    });
    r = pick(r, /^Bind Monster/);
    r = inject(
      until(r, (x) => x.state.pending?.kind === "turn"),
      () => {},
      { t: STEP.ReadyAll },
    );
    expect(cardOf(r, minion).exhausted).toBe(true);
  });

  it("Fire Axe: +1 damage with no resources; spend 1 resource for +2 combat, three times an attack", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02032");
        enemyHere(g, ROLAND, RAVENOUS);
        setCounter(g, ROLAND, "resources", 1);
      },
    });
    r = pick(r, "Fire Axe: fight");
    r = pick(r, /^Fire Axe: spend 1 resource/);
    r = toTurn(commitDone(r), ROLAND);
    expect(lastTest(r)?.base).toBe(6);
    // the resource spent, the attack deals 2
    expect(enemies(gOf(r))[0].damage).toBe(2);
  });

  it("Peter Sylvestre heals 1 horror from himself after your turn", () => {
    let peter = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        peter = inPlay(g, ROLAND, "02033");
        setCounter(g, peter, "horror", 1);
      },
    });
    r = pick(r, "End turn");
    r = until(r, (x) => options(x).some((o) => o.startsWith("Peter Sylvestre")));
    r = pick(r, /^Peter Sylvestre/);
    expect(cardOf(r, peter).horror).toBe(0);
  });

  it("Bait and Switch evades a non-Elite enemy and moves it to a connecting location", () => {
    let minion = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["+1"],
      prep: (g) => {
        hand(g, ROLAND, "02034");
        hallway(g);
        minion = enemyHere(g, ROLAND, MINION);
      },
    });
    r = toTurn(commitDone(play(r, "02034")), ROLAND);
    expect(card(gOf(r), cardOf(r, minion).location!).code).toBe(HALLWAY);
    expect(cardOf(r, minion).exhausted).toBe(true);
    expect(cardOf(r, minion).engagedWith).toBe(null);
  });

  it("Kukri: after a success, spend 1 more action for +1 damage", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02036");
        enemyHere(g, ROLAND, RAVENOUS);
      },
    });
    r = until(use(r, "02036"), (x) => options(x).some((o) => o.startsWith("Use Kukri")));
    r = toTurn(pick(r, /^Use Kukri/), ROLAND);
    expect(enemies(gOf(r))[0].damage).toBe(2);
    expect(inv(gOf(r), ROLAND).actionsLeft).toBe(1);
  });

  it("Indebted: you start the game with 2 fewer resources", () => {
    const r = game({
      investigators: [ROLAND],
      extra: { investigators: [{ code: ROLAND, deck: [...deckCodes("roland-starter"), "02037"] }] },
    });
    expect(inv(gOf(r), ROLAND).resources).toBe(3);
  });

  it("Internal Injury and Chronophobia: 1 direct damage and horror at the end of your turn", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        for (const code of ["02038", "02039"]) {
          const id = createCard(g, code, ZONE.Limbo, ROLAND);
          moveCard(g, id, ZONE.Threat);
          setController(g, id, ROLAND);
        }
      },
    });
    const before = { ...inv(gOf(r), ROLAND) };
    r = until(
      pick(r, "End turn"),
      (x) => x.state.round > 1 || !!x.state.pending?.kind.match(/never/),
    );
    expect(inv(gOf(r), ROLAND).damage).toBe(before.damage + 1);
    expect(inv(gOf(r), ROLAND).horror).toBe(before.horror + 1);
  });

  it("Dr. Henry Armitage: discard a non-weakness card you draw and exhaust him to gain 3 resources", () => {
    let armitage = "";
    let r = game({ investigators: [ROLAND], prep: (g) => (armitage = inPlay(g, ROLAND, "02040")) });
    const res = inv(gOf(r), ROLAND).resources;
    // a non-weakness card on top
    r = inject(r, (g) => putOnTop(g, ROLAND, [createCard(g, "01088", ZONE.Limbo, ROLAND)]), {
      t: STEP.Draw,
      inv: ROLAND,
      n: 1,
    });
    r = pick(r, /^Dr. Henry Armitage/);
    expect(inv(gOf(r), ROLAND).resources).toBe(res + 3);
    expect(cardOf(r, armitage).exhausted).toBe(true);
    expect(inv(gOf(r), ROLAND).discard.map((id) => cardOf(r, id).code)).toContain("01088");
  });

  it("Final Rhapsody: 1 damage and 1 horror for each skull and auto-fail among 5 tokens", () => {
    let r = game({ investigators: [ROLAND], bag: ["skull", "skull", "autoFail", "0", "0", "0"] });
    const id = createCard(gOf(r), "02013", ZONE.Limbo, ROLAND);
    r = inject(r, () => {}, { t: STEP.Revelation, inv: ROLAND, card: id });
    while (r.state.pending?.kind === "assign") r = pick(r, r.state.pending.options[0].label);
    const me = inv(gOf(r), ROLAND);
    // 5 of the 6 tokens: 2 or 3 of the 3 skull and auto-fail ones
    expect(me.damage + me.horror).toBeGreaterThanOrEqual(4);
    expect(r.state.chaosBag).toHaveLength(6);
  });

  it("Rex's Curse: a success reveals a new token; the failure it causes shuffles it into the deck", () => {
    const cursed = ([seed, bag]: [number, ChaosToken[]]) => {
      let curse = "";
      let r = game({
        investigators: [ROLAND],
        seed,
        bag,
        prep: (g) => {
          curse = createCard(g, "02009", ZONE.Limbo, ROLAND);
          moveCard(g, curse, ZONE.Threat);
          setController(g, curse, ROLAND);
        },
      });
      r = effect(r, ROLAND, { op: "skillTest", skill: "willpower", difficulty: 1 });
      const tokens = r.state.log
        .slice(r.state.log.findLastIndex((e) => e.type === "testStart"))
        .filter((e) => e.type === "token" && (e.data as { token?: string }).token)
        .map((e) => (e.data as { token: string }).token);
      return { tokens, zone: cardOf(r, curse).zone, success: lastTest(r)?.success };
    };
    const bags: ChaosToken[][] = [
      ["0", "autoFail"],
      ["autoFail", "0"],
      ["autoFail", "0", "autoFail"],
      ["0", "autoFail", "autoFail"],
      ["autoFail", "autoFail", "0"],
    ];
    const runs = [1, 2, 3].flatMap((seed) => bags.map((bag) => cursed([seed, bag])));
    // both outcomes of the new token happen among these
    expect(runs.some((x) => x.tokens.join() === "0,autoFail")).toBe(true);
    // a 0 first: back to the bag, and a new token decides (the curse redraws once per test)
    const redrawn = runs.filter((x) => x.tokens[0] === "0");
    expect(redrawn.length).toBeGreaterThan(0);
    for (const x of redrawn) {
      expect(x.tokens).toHaveLength(2);
      expect(x.zone).toBe(x.tokens[1] === "autoFail" ? ZONE.Deck : ZONE.Threat);
    }
    // an auto-fail first: no success to stop, the curse stays
    for (const x of runs.filter((y) => y.tokens[0] === "autoFail"))
      expect(x.zone).toBe(ZONE.Threat);
  });

  it("Smite the Wicked: attached to the next enemy of the encounter deck, spawned farthest from Zoey", () => {
    let r = game({ investigators: [ZOEY], prep: (g) => void hallway(g, 0) });
    const smite = createCard(gOf(r), "02007", ZONE.Limbo, ZOEY);
    r = toTurn(
      inject(r, () => {}, { t: STEP.Revelation, inv: ZOEY, card: smite }),
      ZOEY,
    );
    const host = cardOf(r, smite).attachedTo;
    expect(host && cardOf(r, host).zone).toBe(ZONE.Enemy);
    expect(card(gOf(r), cardOf(r, host!).location!).code).toBe(HALLWAY);
  });

  it("Searching for Izzie: attached farthest from Jenny; a success at its investigate discards it", () => {
    let r = game({ investigators: [JENNY], bag: ["+1"], prep: (g) => void hallway(g, 0) });
    const izzie = createCard(gOf(r), "02011", ZONE.Limbo, JENNY);
    r = toTurn(
      inject(r, () => {}, { t: STEP.Revelation, inv: JENNY, card: izzie }),
      JENNY,
    );
    expect(cardOf(r, izzie).zone).toBe(ZONE.Attached);
    expect(card(gOf(r), cardOf(r, izzie).location!).code).toBe(HALLWAY);
    r = inject(r, (g) => placeInvestigator(g, JENNY, locId(g, HALLWAY)));
    r = toTurn(commitDone(use(r, "02011", 1)), JENNY);
    expect(cardOf(r, izzie).zone).toBe(ZONE.Discard);
  });
});
