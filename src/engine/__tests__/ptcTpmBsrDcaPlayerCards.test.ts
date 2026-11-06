/**
 * The player cards of The Pallid Mask, Black Stars Rise and Dim Carcosa (player-cards-ptc, groups 5–7): one test each,
 * at least.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import {
  allCards,
  card,
  cardsBeneath,
  cardsOf,
  exhaust,
  type GameContext,
  inv,
  setCounter,
  setStatus,
} from "../context";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import { flatLog } from "../campaign/log";
import type { CampaignState } from "../campaign/types";
import { upgradeDeck } from "../campaign/upgrade";
import { logEntry } from "../world/flags";
import {
  addLocation,
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  investigate,
  lastTest,
  move,
  offered,
  options,
  play,
  toTurn,
  until,
  use,
  windowOf,
} from "../kits/driver";
import { db, deckCodes, gOf, mutate, pick, skipMulligans } from "../kits/testkit";
import { botChoice } from "../bot";
import { createGame, dispatch, replay, type Result } from "../index";
import { createCard, moveCard } from "../movement";
import { controlled, shroud, skillValue, threatArea } from "../queries";
import { STEP } from "../steps/step";
import { PHASE, ZONE } from "../world/constants";
import type { ChaosToken, Effect } from "../../content/schema";
import type { Action, ChoiceOption, GameSetup } from "../world/types";

beforeAll(() => loadPack("ptc"));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; health 9, sanity 5
const D = "01002"; // Daisy
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2, 1 damage 1 horror
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3, evade 3, 1 damage 1 horror
const GUARD_DOG = "01021"; // Ally, cost 3, health 3
const FIRST_AID = "01019"; // uses (3 supplies)
const SHRIVELLING = "01060"; // Spell, 4 charges
const AUTOMATIC = "01016"; // .45 Automatic: Firearm, 4 ammo
const HUNCH = "01037"; // Working a Hunch: Insight, cost 2, discover 1 clue
const GRASPING = "01162"; // Grasping Hands: a non-weakness treachery
const FROZEN = "01164"; // Frozen in Fear: a Terror
const STUDY = "01111"; // shroud 2, 2 clues
const HALLWAY = "01112";

const eff = (r: Result, you: string, e: Effect, ctx: Record<string, unknown> = {}) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source: null, ...ctx } });
const test = (
  r: Result,
  you: string,
  skill: "willpower" | "intellect" | "combat" | "agility",
  n = 1,
) => eff(r, you, { op: "skillTest", skill, difficulty: n });
const attack = (r: Result, who: string, damage: number, horror = 0) =>
  inject(r, () => {}, {
    t: STEP.AssignDamage,
    inv: who,
    damage,
    horror,
    direct: false,
    source: null,
  });
const mine = (r: Result, i: string, code: string) =>
  controlled(gOf(r), i).find((c) => c.code === code);
const zoneOf = (r: Result, id: string) => card(gOf(r), id).zone;
const commitWindow = (r: Result) => until(r, (x) => x.state.pending?.kind === "commit");
const hallway = (g: Parameters<typeof addLocation>[0]) =>
  addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);

// ---------- The Pallid Mask ----------
describe("Inspiring Presence (03228)", () => {
  it("on a success an Ally at your location readies and heals 1 damage", () => {
    let dog = "";
    let r = game({
      investigators: [R, D],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03228");
        dog = inPlay(g, D, GUARD_DOG);
        setCounter(g, dog, "damage", 1);
        exhaust(g, dog);
      },
    });
    r = toTurn(pick(commitWindow(test(r, R, "willpower")), /Inspiring Presence/), R);
    expect(card(gOf(r), dog)).toMatchObject({ exhausted: false, damage: 0 });
  });
});

describe("Mano a Mano (03229)", () => {
  it("as the first action: 1 damage to an engaged enemy, no attack of opportunity", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03229");
        ghoul = enemyHere(g, R, RAVENOUS);
      },
    });
    r = toTurn(play(r, "03229"), R);
    expect(card(gOf(r), ghoul).damage).toBe(1);
    expect(inv(gOf(r), R).damage).toBe(0);
  });
});

describe("Eureka! (03231)", () => {
  it("on a success the tester draws a card from the top 3 of their deck", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void hand(g, R, "03231") });
    const n = inv(gOf(r), R).hand.length;
    r = until(pick(commitWindow(test(r, R, "willpower")), /Eureka/), offered("Take nothing"));
    expect(r.state.pending?.prompt).toBe("Search your deck (top 3)");
    r = toTurn(pick(r, /./), R);
    // Eureka! left the hand, the card found came in
    expect(inv(gOf(r), R).hand.length).toBe(n);
  });
});

describe("Shortcut (03232)", () => {
  it("attaches to your location; anyone there exhausts it to move to a connecting location", () => {
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        hand(g, R, "03232");
        hallway(g);
      },
    });
    r = play(r, "03232");
    const attached = allCards(gOf(r)).find((c) => c.code === "03232" && c.zone === ZONE.Attached);
    expect(attached).toBeDefined();
    r = toTurn(r, D);
    r = until(pick(r, /^Shortcut: move/), (x) => x.state.pending?.kind === "turn");
    expect(card(gOf(r), inv(gOf(r), D).location!).code).toBe(HALLWAY);
    expect(card(gOf(r), attached!.id).exhausted).toBe(true);
  });
});

describe('"Watch this!" (03233)', () => {
  it("spend up to 3 resources to commit it; succeed by 1 or more: gain twice as many", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void hand(g, R, "03233") });
    const res = inv(gOf(r), R).resources;
    r = pick(commitWindow(test(r, R, "willpower", 2)), /Watch this/);
    r = pick(pick(r, "Spend 1 resource"), "Spend 1 resource");
    expect(inv(gOf(r), R).resources).toBe(res - 2);
    // 3 willpower + 1 icon against 2: succeeds by 2
    r = toTurn(pick(r, /^Done/), R);
    expect(inv(gOf(r), R).resources).toBe(res + 2);
  });

  it("taken back, what it was paid with comes back; only to your own test", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void hand(g, R, "03233") });
    const res = inv(gOf(r), R).resources;
    r = pick(pick(commitWindow(test(r, R, "willpower", 2)), /Watch this/), "Spend 1 resource");
    r = pick(pick(r, "done"), /^Take back/);
    expect(inv(gOf(r), R).resources).toBe(res);
    expect(db.cards["03233"].commitOnlyOwnTest).toBe(true);
  });
});

describe(".41 Derringer (03234)", () => {
  it("+2 combat, +1 damage on a success; succeed by 3: one more action, once per turn", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "03234");
        ghoul = enemyHere(g, R, RAVENOUS);
        setCounter(g, ghoul, "damage", -10); // it survives two attacks
      },
    });
    const left = inv(gOf(r), R).actionsLeft;
    // 4 combat + 2 against 3: succeeds by 3
    r = toTurn(use(r, "03234"), R);
    expect(card(gOf(r), ghoul).damage).toBe(-8);
    expect(inv(gOf(r), R).actionsLeft).toBe(left);
    r = toTurn(use(r, "03234"), R);
    expect(inv(gOf(r), R).actionsLeft).toBe(left - 1);
  });
});

describe("Torrent of Power (03235)", () => {
  it("each charge spent from your assets gives it [willpower] [wild]", () => {
    let spell = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03235");
        spell = inPlay(g, R, SHRIVELLING);
      },
    });
    r = pick(commitWindow(test(r, R, "willpower", 9)), /Torrent of Power/);
    r = pick(pick(r, /^Spend 1 charge/), /^Spend 1 charge/);
    r = toTurn(pick(r, /^Done/), R);
    // 3 willpower + 1 wild + 2 × (willpower + wild)
    expect(lastTest(r)?.total).toBe(8);
    expect(card(gOf(r), spell).uses).toBe(2);
  });
});

describe("Scrying (03236)", () => {
  it("fast: look at the top 3 of a deck; a Terror among them costs 1 horror", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "03236");
        moveCard(g, createCard(g, FROZEN, ZONE.Limbo), ZONE.EncounterDeck, { top: true });
      },
    });
    r = until(pick(r, /^Scrying/), offered("Encounter deck"));
    r = toTurn(pick(r, "Encounter deck"), R);
    expect(inv(gOf(r), R).horror).toBe(1);
    expect(mine(r, R, "03236")?.uses).toBe(2);
  });
});

describe("Waylay (03237)", () => {
  it("an exhausted non-Elite enemy here, a test against its evade: success defeats it", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03237");
        ghoul = enemyHere(g, R, MINION, false);
        exhaust(g, ghoul);
      },
    });
    // 2 agility against the Ghoul Minion's 2 evade
    r = toTurn(play(r, "03237"), R);
    expect(lastTest(r)).toMatchObject({ difficulty: 2, success: true });
    expect(zoneOf(r, ghoul)).toBe(ZONE.EncounterDiscard);
  });
});

describe("A Chance Encounter (03238)", () => {
  it("an Ally from a discard pile into play under your control, its printed cost paid as X", () => {
    let dog = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        hand(g, R, "03238");
        dog = createCard(g, GUARD_DOG, ZONE.Limbo, D);
        moveCard(g, dog, ZONE.Discard);
      },
    });
    const res = inv(gOf(r), R).resources;
    r = toTurn(play(r, "03238"), R);
    expect(card(gOf(r), dog)).toMatchObject({ zone: ZONE.Play, controller: R });
    expect(inv(gOf(r), R).resources).toBe(res - 3);
  });

  it("not playable without an Ally you can pay for", () => {
    const r = game({ investigators: [R], prep: (g) => void hand(g, R, "03238") });
    expect(options(r).some((o) => /Chance Encounter/.test(o))).toBe(false);
  });
});

describe("Emergency Cache (03239)", () => {
  it("4 points: resources or supplies on assets here, in any combination", () => {
    let aid = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03239");
        aid = inPlay(g, R, FIRST_AID);
      },
    });
    const res = inv(gOf(r), R).resources;
    r = play(r, "03239");
    r = pick(pick(r, /^Place 1 supplies/), /^Place 1 supplies/);
    r = toTurn(pick(pick(r, "Gain 1 resource"), "Gain 1 resource"), R);
    expect(card(gOf(r), aid).uses).toBe(5);
    expect(inv(gOf(r), R).resources).toBe(res + 2);
  });
});

// ---------- Black Stars Rise ----------
describe("On the Hunt (03263)", () => {
  it("instead of the mythos draw, an enemy from the top 9 of the encounter deck spawns engaged with you", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03263");
        ghoul = createCard(g, RAVENOUS, ZONE.Limbo);
        moveCard(g, ghoul, ZONE.EncounterDeck, { top: true });
      },
    });
    r = until(r, offered(/^On the Hunt/));
    expect(windowOf(r)).toBe("wouldDrawEncounter");
    const before = gOf(r).s.log.filter((e) => e.type === "encounter").length;
    r = until(pick(r, /^On the Hunt/), offered(/Ravenous Ghoul/));
    r = toTurn(pick(r, /Ravenous Ghoul/), R);
    expect(card(gOf(r), ghoul)).toMatchObject({ zone: ZONE.Enemy, engagedWith: R });
    // no encounter card was drawn
    expect(gOf(r).s.log.filter((e) => e.type === "encounter").length).toBe(before);
  });
});

describe("Stick to the Plan (03264)", () => {
  const withPlan = () =>
    skipMulligans(
      createGame(db, {
        campaignId: "night-of-the-zealot",
        scenarioId: "the-gathering",
        difficulty: "standard",
        seed: 3,
        investigators: [
          { code: R, deck: [...deckCodes("roland-starter"), "03264", "01088", "01088", "01023"] },
        ],
      }),
    );

  it("starts in play; before the opening hand, different Tactic and Supply events go beneath it", () => {
    let r = createGame(db, {
      campaignId: "night-of-the-zealot",
      scenarioId: "the-gathering",
      difficulty: "standard",
      seed: 3,
      investigators: [
        { code: R, deck: [...deckCodes("roland-starter"), "03264", "01088", "01088", "01023"] },
      ],
    });
    expect(r.state.pending?.promptKey).toBe("stickToThePlan");
    expect(inv(gOf(r), R).hand).toEqual([]);
    // one Emergency Cache is offered, not two
    expect(options(r).filter((o) => o === "Emergency Cache")).toHaveLength(1);
    r = pick(pick(r, "Emergency Cache"), "Dodge");
    r = pick(r, "Done");
    const plan = mine(r, R, "03264")!;
    expect(cardsBeneath(gOf(r), plan.id)).toHaveLength(2);
    expect(r.state.pending?.kind).toBe("mulligan");
    expect(inv(gOf(r), R).hand).toHaveLength(5);
  });

  it("plays an attached card as from the hand, exhausting it; exhausted, none", () => {
    let r = withPlan();
    r = pick(r, "Emergency Cache");
    r = toTurn(skipMulligans(pick(r, "Done")), R);
    const res = inv(gOf(r), R).resources;
    r = toTurn(play(r, "01088"), R);
    expect(inv(gOf(r), R).resources).toBe(res + 3);
    expect(mine(r, R, "03264")?.exhausted).toBe(true);
  });
});

describe("Guidance (03265)", () => {
  it("another investigator here who has yet to take their turn takes an additional action", () => {
    let r = game({ investigators: [R, D], prep: (g) => void hand(g, R, "03265") });
    r = toTurn(play(r, "03265"), D);
    expect(inv(gOf(r), D).actionsLeft).toBe(4);
  });

  it("not playable with no one waiting", () => {
    const r = game({ investigators: [R], prep: (g) => void hand(g, R, "03265") });
    expect(options(r).some((o) => /Guidance/.test(o))).toBe(false);
  });
});

describe("Arcane Insight (03266)", () => {
  it("during a turn, 1 charge: your location gets -2 shroud until the end of the turn, once per turn", () => {
    let r = game({ investigators: [R], prep: (g) => void inPlay(g, R, "03266") });
    const study = inv(gOf(r), R).location!;
    r = pick(r, /^Arcane Insight/);
    expect(shroud(gOf(r), study)).toBe(0);
    expect(options(r).some((o) => o.startsWith("Arcane Insight"))).toBe(false);
    r = pick(r, "End turn");
    expect(shroud(gOf(r), study)).toBe(2);
  });
});

describe("Narrow Escape (03267)", () => {
  it("cancels an attack of opportunity; +2 to your next test this turn", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03267");
        enemyHere(g, R, MINION);
        hallway(g);
      },
    });
    r = until(move(r, HALLWAY), offered(/Narrow Escape/));
    r = toTurn(pick(r, /Narrow Escape/), R);
    expect(inv(gOf(r), R).damage).toBe(0);
    r = toTurn(test(r, R, "willpower"), R);
    expect(lastTest(r)?.total).toBe(5);
  });

  it("not offered for an enemy phase attack", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03267");
        enemyHere(g, R, MINION);
      },
    });
    r = until(
      pick(r, "End turn"),
      (x) => windowOf(x) === "enemyAttacks" || x.state.pending?.kind === "turn",
    );
    expect(options(r).some((o) => /Narrow Escape/.test(o))).toBe(false);
  });
});

describe("Suggestion (03268)", () => {
  it("evade adding your willpower; a charge goes unless it succeeds by 2", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["-2"],
      prep: (g) => {
        inPlay(g, R, "03268");
        ghoul = enemyHere(g, R, MINION);
      },
    });
    // 2 agility + 3 willpower - 2 against 2: succeeds by 1
    r = toTurn(use(r, "03268"), R);
    expect(card(gOf(r), ghoul)).toMatchObject({ exhausted: true, engagedWith: null });
    expect(mine(r, R, "03268")?.uses).toBe(2);
  });

  it("1 charge cancels a non-Elite enemy's attack on you", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "03268");
        enemyHere(g, R, MINION);
      },
    });
    r = until(pick(r, "End turn"), offered(/^Suggestion: cancel/));
    r = toTurn(pick(r, /^Suggestion: cancel/), R);
    expect(inv(gOf(r), R).damage).toBe(0);
    expect(mine(r, R, "03268")?.uses).toBe(2);
  });
});

describe("St. Hubert's Key (03269)", () => {
  it("+1 willpower and intellect, -2 sanity; discarded as horror would defeat you: heal 2 horror", () => {
    let key = "";
    let r = game({ investigators: [R], prep: (g) => void (key = inPlay(g, R, "03269")) });
    expect(skillValue(gOf(r), R, "willpower")).toBe(4);
    r = until(attack(r, R, 0, 3), offered(/^St. Hubert's Key/));
    r = toTurn(pick(r, /^St. Hubert's Key/), R);
    expect(inv(gOf(r), R)).toMatchObject({ horror: 1, status: "playing" });
    expect(zoneOf(r, key)).toBe(ZONE.Discard);
  });

  it("2 horror healed that still leave too much: defeated all the same", () => {
    let r = game({ investigators: [R], prep: (g) => void inPlay(g, R, "03269") });
    r = until(attack(r, R, 0, 6), offered(/^St. Hubert's Key/));
    r = until(pick(r, /^St. Hubert's Key/), () => false);
    expect(inv(gOf(r), R).status).toBe("defeated");
  });
});

describe("Ward of Protection (03270)", () => {
  it("an investigator at any location draws a non-weakness treachery: cancelled, you take 1 horror", () => {
    let hands = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        hand(g, R, "03270");
        hands = createCard(g, GRASPING, ZONE.Limbo);
      },
    });
    r = inject(r, () => {}, { t: STEP.DrawEncounter, inv: D, card: hands });
    r = until(r, offered(/Ward of Protection/));
    r = toTurn(pick(r, /Ward of Protection/), R);
    expect(inv(gOf(r), R).horror).toBe(1);
    expect(inv(gOf(r), D).damage).toBe(0);
  });
});

describe("Arcane Initiate (03271)", () => {
  it("enters play with 1 doom or 2 horror on it; fast: a Spell from the top 3", () => {
    let r = game({ investigators: [R], prep: (g) => void hand(g, R, "03271") });
    r = until(play(r, "03271"), offered(/^Place 2 horror/));
    r = toTurn(pick(r, /^Place 2 horror/), R);
    expect(mine(r, R, "03271")).toMatchObject({ horror: 2, doom: 0 });
    r = until(pick(r, /^Arcane Initiate/), offered("Take nothing"));
    expect(r.state.pending?.prompt).toBe("Search your deck (top 3)");
  });
});

describe('"Not without a fight!" (03272)', () => {
  it("only while engaged; [willpower] [combat] [agility] per enemy engaged with you", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03272");
        enemyHere(g, R, MINION);
        enemyHere(g, R, MINION);
      },
    });
    r = toTurn(pick(commitWindow(test(r, R, "combat", 9)), /Not without a fight/), R);
    expect(lastTest(r)?.total).toBe(4 + 1 + 2);
    const alone = game({ investigators: [R], prep: (g) => void hand(g, R, "03272") });
    expect(options(commitWindow(test(alone, R, "combat"))).some((o) => /Not without/.test(o))).toBe(
      false,
    );
  });
});

describe("True Survivor (03273)", () => {
  it("3 Innate skills from your discard pile back to your hand", () => {
    const skills: string[] = [];
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03273");
        for (const code of ["01089", "01092", "01093", "01090"]) {
          const id = createCard(g, code, ZONE.Limbo, R);
          moveCard(g, id, ZONE.Discard);
          skills.push(id);
        }
      },
    });
    r = toTurn(play(r, "03273"), R);
    expect(skills.slice(0, 3).map((id) => zoneOf(r, id))).toEqual([
      ZONE.Hand,
      ZONE.Hand,
      ZONE.Hand,
    ]);
    // Perception is Practiced
    expect(zoneOf(r, skills[3])).toBe(ZONE.Discard);
  });
});

// ---------- Dim Carcosa ----------
describe('"Eat lead!" (03304)', () => {
  it("an attack with a Firearm: X more ammo spent, X more tokens revealed, one resolved", () => {
    let gun = "";
    let r = game({
      investigators: [R],
      bag: ["-1", "0", "+1"],
      prep: (g) => {
        hand(g, R, "03304");
        gun = inPlay(g, R, AUTOMATIC);
        enemyHere(g, R, RAVENOUS);
      },
    });
    r = until(use(r, AUTOMATIC), offered(/^"Eat lead!"/));
    r = pick(pick(r, /^"Eat lead!"/), "Spend 2 more ammo");
    r = until(r, offered(/^Resolve/));
    expect(options(r).filter((o) => o.startsWith("Resolve"))).toHaveLength(3);
    r = toTurn(pick(r, "Resolve +1"), R);
    expect(card(gOf(r), gun).uses).toBe(1);
    expect(lastTest(r)?.tokens).toEqual(["+1"]);
  });
});

describe("Armor of Ardennes (03305)", () => {
  it("exhausted as damage is assigned to it: 1 of that damage cancelled", () => {
    let armor = "";
    let r = game({ investigators: [R], prep: (g) => void (armor = inPlay(g, R, "03305")) });
    r = attack(r, R, 2);
    r = pick(pick(r, /to Armor of Ardennes/), /to Armor of Ardennes/);
    r = toTurn(pick(r, /^Armor of Ardennes/), R);
    expect(card(gOf(r), armor)).toMatchObject({ damage: 1, exhausted: true });
    expect(inv(gOf(r), R).damage).toBe(0);
  });
});

describe("Eidetic Memory (03306)", () => {
  it("played as a copy of an Insight event in a discard pile, its cost paid; both leave the game", () => {
    let hunch = "";
    let memory = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        memory = hand(g, R, "03306");
        hunch = createCard(g, HUNCH, ZONE.Limbo, D);
        moveCard(g, hunch, ZONE.Discard);
      },
    });
    const res = inv(gOf(r), R).resources;
    r = toTurn(play(r, "03306"), R);
    expect(inv(gOf(r), R)).toMatchObject({ clues: 1, resources: res - 2 });
    expect(card(gOf(r), hunch).zone).toBe(ZONE.Removed);
    expect(card(gOf(r), memory)).toMatchObject({ zone: ZONE.Removed, code: "03306" });
  });
});

describe("No Stone Unturned (03307)", () => {
  it("an investigator at your location searches their whole deck for a card and draws it", () => {
    let r = game({ investigators: [R, D], prep: (g) => void hand(g, R, "03307") });
    const last = inv(gOf(r), D).deck.at(-1)!;
    r = until(play(r, "03307"), offered("Daisy Walker"));
    r = toTurn(pick(pick(r, "Daisy Walker"), last), R);
    expect(inv(gOf(r), D).hand).toContain(last);
  });
});

describe("Lupara (03309)", () => {
  it("played with no attack of opportunity; +2 combat and damage the turn it entered play, +1 after", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03309");
        ghoul = enemyHere(g, R, MINION);
        setCounter(g, ghoul, "damage", -10);
      },
    });
    r = toTurn(play(r, "03309"), R);
    expect(inv(gOf(r), R).damage).toBe(0);
    r = toTurn(use(r, "03309", 1), R);
    expect(lastTest(r)?.total).toBe(6);
    expect(card(gOf(r), ghoul).damage).toBe(-7);
    r = toTurn(use(toTurn(pick(r, "End turn"), R), "03309", 1), R);
    expect(lastTest(r)?.total).toBe(5);
    expect(card(gOf(r), ghoul).damage).toBe(-5);
  });
});

describe("Cheat Death (03310)", () => {
  it("when you would be defeated: disengaged, threat area discarded, healed, moved away, removed", () => {
    let frozen = "";
    let cheat = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        cheat = hand(g, R, "03310");
        enemyHere(g, R, MINION);
        hallway(g);
        frozen = createCard(g, FROZEN, ZONE.Limbo);
        moveCard(g, frozen, ZONE.Threat, { inv: R });
        setCounter(g, R, "horror", 4);
      },
    });
    r = until(attack(r, R, 0, 1), offered(/^Cheat Death/));
    // its turn ended, the game goes on to the next choice
    r = pick(r, /^Cheat Death/);
    expect(inv(gOf(r), R).turnDone).toBe(true);
    expect(inv(gOf(r), R)).toMatchObject({ horror: 3, status: "playing" });
    expect(card(gOf(r), inv(gOf(r), R).location!).code).toBe(HALLWAY);
    expect(threatArea(gOf(r), R)).toEqual([]);
    expect(zoneOf(r, cheat)).toBe(ZONE.Removed);
  });
});

describe("Seal of the Elder Sign (03312)", () => {
  it("no token from the bag: an elder sign is revealed; the card leaves the game when the test ends", () => {
    let seal = "";
    let r = game({
      investigators: [R],
      bag: ["autoFail"],
      prep: (g) => void (seal = hand(g, R, "03312")),
    });
    r = toTurn(pick(commitWindow(test(r, R, "willpower", 4)), /Seal of the Elder Sign/), R);
    expect(lastTest(r)).toMatchObject({ tokens: ["elderSign"], success: true });
    expect(zoneOf(r, seal)).toBe(ZONE.Removed);
    expect(gOf(r).s.chaosBag).toEqual(["autoFail"]);
  });
});

describe("Newspaper (03313)", () => {
  it("+2 intellect investigating with no clues; discovering then, 1 clue more", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void inPlay(g, R, "03313") });
    r = until(investigate(r), offered(/^Newspaper/));
    r = toTurn(pick(r, /^Newspaper/), R);
    expect(lastTest(r)?.total).toBe(5);
    expect(inv(gOf(r), R).clues).toBe(2);
  });
});

describe("Infighting (03314)", () => {
  it("after the enemy phase begins: non-Elite enemies don't attack you this phase", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03314");
        enemyHere(g, R, MINION);
      },
    });
    r = until(pick(r, "End turn"), offered(/^Infighting/));
    r = toTurn(pick(r, /^Infighting/), R);
    expect(inv(gOf(r), R).damage).toBe(0);
  });
});

describe("Key of Ys (03315)", () => {
  it("1 of the horror placed on you goes on it, +1 to each skill per horror on it", () => {
    let key = "";
    let r = game({ investigators: [R], prep: (g) => void (key = inPlay(g, R, "03315")) });
    r = toTurn(attack(r, R, 0, 2), R);
    expect(card(gOf(r), key).horror).toBe(1);
    expect(inv(gOf(r), R).horror).toBe(1);
    expect(skillValue(gOf(r), R, "combat")).toBe(5);
  });

  it("leaving play, the top 10 cards of your deck are discarded", () => {
    let key = "";
    let r = game({ investigators: [R], prep: (g) => void (key = inPlay(g, R, "03315")) });
    const deck = inv(gOf(r), R).deck.length;
    r = toTurn(eff(r, R, { op: "discardAsset", filter: { code: "03315" } }), R);
    expect(zoneOf(r, key)).toBe(ZONE.Discard);
    expect(inv(gOf(r), R).deck.length).toBe(deck - 10);
  });
});

describe("Time Warp (03311)", () => {
  /** a game of `who` with a deck of Time Warps, its choices recorded as a save holds them */
  const warpGame = (who: string, bag: ChaosToken[], seed = 5) => {
    const setup: GameSetup = {
      campaignId: "night-of-the-zealot",
      scenarioId: "the-gathering",
      difficulty: "standard",
      seed,
      chaosBag: bag,
      investigators: [{ code: who, deck: Array<string>(30).fill("03311") }],
    };
    const actions: Action[] = [];
    let r = createGame(db, setup);
    const choose = (match: (o: ChoiceOption) => boolean) => {
      const p = r.state.pending!;
      const o = p.options.find(match);
      if (!o) throw new Error(`not offered in [${p.options.map((x) => x.label).join(" | ")}]`);
      const a: Action = { type: "choose", inv: p.inv, option: o.id };
      actions.push(a);
      r = dispatch(db, r.state, a);
      // what the store and a room do after a choice that sets a rewind
      if (r.state.rewind) r = replay(db, setup, actions);
    };
    const label = (s: string | RegExp) => (o: ChoiceOption) =>
      typeof s === "string" ? o.label === s : s.test(o.label);
    const investigateNow = () => {
      while (r.state.pending?.kind !== "turn")
        choose((o) => o.id === "done" || o.label === "Keep hand" || o.id === "continue");
      choose((o) => (o.value as { kind?: string }).kind === "investigate");
      // no commit window: a deck of Time Warps has no icons
      expect(r.state.pending?.kind).not.toBe("commit");
    };
    return {
      setup,
      actions,
      get r() {
        return r;
      },
      choose,
      label,
      investigateNow,
    };
  };

  it("after an investigate: the clue, the action and the horror are back; Time Warp is in the discard", () => {
    // Agnes Baker: 2 intellect, -1 against the Study's 2 shroud fails; the cultist's 1 horror
    const w = warpGame("01004", ["cultist"]);
    w.investigateNow();
    expect(windowOf(w.r)).toBe("actionPerformed");
    expect(inv(gOf(w.r), "01004")).toMatchObject({ horror: 1, actionsLeft: 2 });
    w.choose(w.label("Time Warp (play)"));
    const g = gOf(w.r);
    const me = inv(g, "01004");
    expect(me).toMatchObject({ horror: 0, actionsLeft: 3, clues: 0, resources: 4 });
    expect(me.discard.map((id) => card(g, id).code)).toEqual(["03311"]);
    expect(me.hand).toHaveLength(4);
    expect(w.r.state.pending?.kind).toBe("turn");
    expect(w.r.state.rewind).toBeUndefined();
  });

  it("the bot never plays it: autoPlay would not resolve the rewind", () => {
    const w = warpGame(R, ["0"]);
    w.investigateNow();
    expect(w.r.state.pending?.options.some((o) => o.label === "Time Warp (play)")).toBe(true);
    expect(botChoice(db, w.r)).toBe("pass");
  });

  it("a successful investigate taken back: the clue goes back to the location", () => {
    const w = warpGame(R, ["0"]);
    w.investigateNow();
    const study = inv(gOf(w.r), R).location!;
    expect(inv(gOf(w.r), R).clues).toBe(1);
    w.choose(w.label("Time Warp (play)"));
    expect(inv(gOf(w.r), R)).toMatchObject({ clues: 0, actionsLeft: 3 });
    expect(card(gOf(w.r), study).clues).toBe(2);
  });

  it("the action redone draws its chaos token anew, from where the generator was after the undone one", () => {
    const bag: ChaosToken[] = ["+1", "0", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8"];
    const w = warpGame(R, bag);
    w.investigateNow();
    const first = lastTest(w.r)!.tokens;
    w.choose(w.label("Time Warp (play)"));
    expect(w.r.state.chaosBag).toHaveLength(bag.length);
    w.investigateNow();
    const second = lastTest(w.r)!.tokens;
    expect(second).not.toEqual(first);
    // the same choices replay to the same game, the redone token included
    const again = replay(db, w.setup, w.actions);
    expect(again.state).toEqual(w.r.state);
  });

  it("not offered after an action of an investigator elsewhere", () => {
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        hand(g, D, "03311");
        hallway(g);
      },
    });
    r = until(move(r, HALLWAY), (x) => x.state.pending?.kind === "turn");
    expect(windowOf(r)).toBeNull();
    expect(options(r).some((o) => /Time Warp/.test(o))).toBe(false);
  });
});

// ---------- the campaign ----------
/** a Night of the Zealot campaign of one investigator, `extra` cards in place of class cards of their deck */
const campaignWith = (who: string, deckId: string, extra: string[]) => {
  const c = startCampaign(db, {
    campaignId: "night-of-the-zealot",
    difficulty: "standard",
    seed: 3,
    investigators: [{ code: who, deckId }],
  });
  const deck = c.investigators[0].deck;
  for (const code of extra) {
    // a card any deck of theirs may lose: not a signature card or a weakness
    const k = deck.findIndex((x) => !db.cards[x].subtype && db.cards[x].faction !== "neutral");
    deck.splice(k, 1, code);
  }
  return c;
};
/** The Gathering of that campaign, ended at once with R1, `prep` applied first */
const ended = (c: CampaignState, prep: (game: GameContext) => void = () => {}) =>
  mutate(createGame(db, scenarioSetup(db, c, 1)), (g) => {
    prep(g);
    g.s.phase = PHASE.Ended;
    g.s.resolution = "R1";
    g.s.pending = null;
  }).state;

describe("Charon's Obol (03308)", () => {
  it("starts in play; not defeated: 2 more experience; defeated: killed, whatever the resolution", () => {
    const plain = campaignWith(R, "roland-starter", []);
    const obol = campaignWith(R, "roland-starter", ["03308"]);
    const s = ended(obol);
    expect(cardsOf(s).find((x) => x.code === "03308")?.zone).toBe(ZONE.Play);
    const xp = applyScenarioEnd(db, plain, ended(plain)).investigators[0].xp;
    expect(applyScenarioEnd(db, obol, s).investigators[0].xp).toBe(xp + 2);
    const defeated = applyScenarioEnd(
      db,
      obol,
      ended(obol, (g) => setStatus(g, R, "defeated", "horror")),
    );
    expect(defeated.investigators[0].status).toBe("killed");
  });
});

describe("Archaic Glyphs Researched (03025 → 03192, 03193)", () => {
  it("the translated glyphs reach the campaign log; only then may an upgrade take 03192 in place of 03025", () => {
    const c = campaignWith(D, "daisy-starter", ["03025"]);
    c.investigators[0].xp = 10;
    const cards = (deck: string[]) => {
      const out: Record<string, number> = {};
      for (const code of deck) out[code] = (out[code] ?? 0) + 1;
      return out;
    };
    const upgraded = (camp: CampaignState) => {
      const next = cards(camp.investigators[0].deck);
      delete next["03025"];
      next["03192"] = 1;
      return upgradeDeck(db, camp, D, next);
    };
    expect(upgraded(c)).toMatchObject({ ok: false });
    const after = applyScenarioEnd(
      db,
      c,
      ended(c, (g) => logEntry.set(g, ["", "translatedTheGlyphs"], true)),
    );
    expect(flatLog(after.log).translatedTheGlyphs).toBe(true);
    expect(after.investigators[0].deck).toContain("01117"); // R1's Lita Chantler, a story asset
    after.investigators[0].xp = 10;
    expect(upgraded(after)).toMatchObject({ ok: true, cost: 3 });
  });
});
