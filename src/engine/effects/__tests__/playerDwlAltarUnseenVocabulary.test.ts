/**
 * The vocabulary the Blood on the Altar and Undimensioned and Unseen player cards added (player-cards-dwl, tasks 4.1 and
 * 5.1): one test per entry.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Result } from "../../index";
import { addTempMod, checkCondition, enemies, enemyStat } from "../../queries";
import { card, inv, setCounter } from "../../context";
import {
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  lastTest,
  toTurn,
  until,
  windowOf,
} from "../../kits/driver";
import { commitDone, gOf, options, pick } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { canPlay } from "../../rules/cards";
import type { Effect } from "../../../content/schema";

beforeAll(() => loadPack("dwl"));

const R = "01001"; // Roland: intellect 3, combat 4
const D = "01002"; // Daisy
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, horror 1
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3

const eff = (r: Result, e: Effect, you = R, source: string | null = null) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source } });

describe("conditions: cardsInHand, enemyNotEngagedWithYou", () => {
  it("count the cards in your hand", () => {
    const r = game({ investigators: [R] });
    const n = inv(gOf(r), R).hand.length;
    expect(checkCondition(gOf(r), { cardsInHand: { min: n } }, { you: R })).toBe(true);
    expect(checkCondition(gOf(r), { cardsInHand: { min: n + 1 } }, { you: R })).toBe(false);
    expect(checkCondition(gOf(r), { cardsInHand: { max: n - 1 } }, { you: R })).toBe(false);
  });

  it("see an enemy at your location engaged with someone else, or no one", () => {
    let r = game({ investigators: [R, D], prep: (g) => void enemyHere(g, R, MINION) });
    expect(checkCondition(gOf(r), { enemyNotEngagedWithYou: true }, { you: R })).toBe(false);
    expect(checkCondition(gOf(r), { enemyNotEngagedWithYou: true }, { you: D })).toBe(true);
    r = inject(r, (g) => void enemyHere(g, R, RAVENOUS, false));
    expect(checkCondition(gOf(r), { enemyNotEngagedWithYou: true }, { you: R })).toBe(true);
  });
});

describe("fight: notEngagedWithYou", () => {
  it("attacks only an enemy not engaged with you", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        enemyHere(g, R, MINION);
        enemyHere(g, R, RAVENOUS, false);
      },
    });
    r = toTurn(commitDone(eff(r, { op: "fight", notEngagedWithYou: true })), R);
    expect(lastTest(r)?.difficulty).toBe(3);
  });
});

describe("heal: an amount", () => {
  it("heals the horror value of the context's enemy", () => {
    let minion = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        minion = enemyHere(g, R, MINION);
        setCounter(g, R, "horror", 3);
      },
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "heal", horror: { eventEnemyStat: "horror" } },
        ctx: { you: R, source: null, enemy: minion },
      }),
      R,
    );
    expect(inv(gOf(r), R).horror).toBe(2);
  });
});

describe("the enemyDefeated window", () => {
  it("names the enemy defeated as the context's enemy, not as its subject", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        const m = enemyHere(g, R, MINION);
        setCounter(g, m, "damage", 1);
        hand(g, R, "02225");
      },
    });
    r = until(commitDone(pick(r, "Fight Ghoul Minion")), (x) => windowOf(x) === "enemyDefeated");
    const step = r.state.pending!.step;
    expect(step.t === "Window" && step.data.defeated).toBeTruthy();
    expect(step.t === "Window" && step.data.enemy).toBeFalsy();
  });
});

describe("Cost.doomOnSelf", () => {
  it("places the doom on the card", () => {
    let pact = "";
    let r = game({ investigators: [R], prep: (g) => (pact = inPlay(g, R, "02191")) });
    r = eff(r, { op: "skillTest", skill: "combat", difficulty: 1 });
    r = toTurn(commitDone(pick(r, /\+3 combat/)), R);
    expect(card(gOf(r), pact).doom).toBe(1);
  });
});

describe("commitIf, commitDifficultyOverBase", () => {
  it("are read by the commit window", () => {
    // Inquiring Mind (a clue at your location), Rise to the Occasion (2 over your base)
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "02227");
        hand(g, R, "02192");
        setCounter(g, inv(g, R).location!, "clues", 0);
      },
    });
    r = eff(r, { op: "skillTest", skill: "intellect", difficulty: 5 });
    const commits = options(r).filter((o) => /Rise|Inquiring/.test(o));
    expect(commits).toEqual(["Commit Rise to the Occasion (+3)"]);
  });
});

describe("Limit 1 per investigator", () => {
  it("keeps a second copy of the asset out of your play area", () => {
    let copy = "";
    const r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "02234");
        copy = hand(g, R, "02234");
        setCounter(g, R, "resources", 9);
      },
    });
    expect(canPlay(gOf(r), R, copy, false)).toBe(false);
  });
});

describe("mayDeclineUpkeepResources", () => {
  it("asks before the upkeep income, Jenny's extra included", () => {
    let r = game({ investigators: [R], prep: (g) => void inPlay(g, R, "02234") });
    const before = inv(gOf(r), R).resources;
    r = inject(r, () => {}, { t: STEP.GainResource, inv: R });
    r = toTurn(pick(r, "Gain 1 resources"), R);
    expect(inv(gOf(r), R).resources).toBe(before + 1);
  });
});

describe("a temporary modifier until the next attack", () => {
  it("ends with the next attack against its enemy", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["-8"],
      prep: (g) => {
        ghoul = enemyHere(g, R, RAVENOUS);
        addTempMod(g, { stat: "fight", value: -1 }, ghoul, "phase", null, true);
      },
    });
    expect(enemyStat(gOf(r), ghoul, "fight")).toBe(2);
    r = toTurn(commitDone(pick(r, "Fight Ravenous Ghoul")), R);
    expect(lastTest(r)?.difficulty).toBe(2);
    expect(enemyStat(gOf(r), enemies(gOf(r))[0].id, "fight")).toBe(3);
  });
});

describe("the bonus action", () => {
  it("may be declined, and spends none of the investigator's actions when taken", () => {
    let r = game({ investigators: [R] });
    const actions = inv(gOf(r), R).actionsLeft;
    r = inject(r, () => {}, { t: STEP.BonusAction, inv: R });
    expect(options(r)).toContain("No action");
    expect(options(r)).not.toContain("End turn");
    r = toTurn(pick(r, "Gain 1 resource"), R);
    expect(inv(gOf(r), R).actionsLeft).toBe(actions);
  });
});
