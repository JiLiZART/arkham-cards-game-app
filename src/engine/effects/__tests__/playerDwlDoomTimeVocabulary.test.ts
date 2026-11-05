/**
 * The vocabulary the Where Doom Awaits, Lost in Time and Space and Return to The Dunwich Legacy player cards added
 * (player-cards-dwl, tasks 6.1, 7.1 and 8.1): one test per entry.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Result } from "../../index";
import { baseSkill, checkCondition } from "../../queries";
import { addCounter, card, currentRound, inv, setCounter } from "../../context";
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
import { createCard, moveCard } from "../../movement";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";
import { baseRaised, discardAtRoundEnd } from "../../world/flags";
import { repeatPhase, skipPhase } from "../../rules/round";
import type { Effect } from "../../../content/schema";

beforeAll(() => loadPack("dwl"));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, damage 1
const PRIEST = "01116"; // Ghoul Priest: Elite

const eff = (r: Result, e: Effect, you = R, source: string | null = null) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source } });
const dealt = (r: Result, damage: number, horror: number) =>
  inject(r, () => {}, {
    t: STEP.AssignDamage,
    inv: R,
    damage,
    horror,
    direct: false,
    source: null,
  });

describe("preventDamage: both, gain", () => {
  /** the damageDealt window, a prevention of up to 5 among both pending in it */
  const prevent = (damage: number, horror: number) => {
    let r = game({ investigators: [R], prep: (g) => hand(g, R, "02261") });
    r = until(dealt(r, damage, horror), (x) => windowOf(x) === "damageDealt");
    return pick(r, /I've had worse/);
  };

  it("cancels all of it when it fits, and gains as many resources", () => {
    const r0 = game({ investigators: [R] });
    const before = inv(gOf(r0), R).resources;
    const r = toTurn(prevent(2, 2), R);
    expect(inv(gOf(r), R).damage).toBe(0);
    expect(inv(gOf(r), R).horror).toBe(0);
    expect(inv(gOf(r), R).resources).toBe(before + 4);
  });

  it("splits the amount as the player chooses when more was dealt", () => {
    let r = prevent(4, 3);
    expect(options(r)).toEqual([
      "Cancel 4 damage and 1 horror",
      "Cancel 3 damage and 2 horror",
      "Cancel 2 damage and 3 horror",
    ]);
    r = toTurn(pick(r, "Cancel 2 damage and 3 horror"), R);
    expect(inv(gOf(r), R).damage).toBe(2);
    expect(inv(gOf(r), R).horror).toBe(0);
  });
});

describe("removeDoom: chooseYours", () => {
  it("takes the doom off a card you control that you choose", () => {
    let pact = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        pact = inPlay(g, R, "01006"); // Roland's .38 Special
        setCounter(g, pact, "doom", 2);
      },
    });
    r = toTurn(eff(r, { op: "removeDoom", amount: "all", on: "chooseYours" }), R);
    expect(card(gOf(r), pact).doom).toBe(0);
  });
});

describe("defeatEnemy", () => {
  it("defeats the context's enemy; with nonElite, not an Elite one", () => {
    let minion = "";
    let priest = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        minion = enemyHere(g, R, MINION);
        priest = enemyHere(g, R, PRIEST);
      },
    });
    const defeat = (x: Result, enemy: string) =>
      toTurn(
        inject(x, () => {}, {
          t: STEP.Eff,
          effect: { op: "defeatEnemy", nonElite: true },
          ctx: { you: R, enemy },
        }),
        R,
      );
    r = defeat(r, priest);
    expect(card(gOf(r), priest).zone).toBe(ZONE.Enemy);
    r = defeat(r, minion);
    expect(card(gOf(r), minion).zone).not.toBe(ZONE.Enemy);
  });
});

describe("committedSkillYouOwn, returnCommittedSkill", () => {
  it("a skill card you own committed to the test goes back to your hand", () => {
    let skill = "";
    let r = game({
      investigators: [R],
      bag: ["autoFail"],
      prep: (g) => {
        skill = hand(g, R, "01089"); // Guts
        inPlay(g, R, "02309"); // Try and Try Again: the skillTestFailed window opens
      },
    });
    r = eff(r, { op: "skillTest", skill: "willpower", difficulty: 2 });
    r = pick(r, /^Commit Guts/);
    expect(checkCondition(gOf(r), { committedSkillYouOwn: true }, { you: R })).toBe(true);
    expect(checkCondition(gOf(r), { committedSkillYouOwn: true }, { you: D })).toBe(false);
    r = until(commitDone(r), (x) => windowOf(x) === "skillTestFailed");
    r = toTurn(eff(r, { op: "returnCommittedSkill" }), R);
    expect(card(gOf(r), skill).zone).toBe(ZONE.Hand);
  });
});

describe("testEnemyEngagedWithOther", () => {
  it("the enemy of the test under way is engaged with another investigator", () => {
    let r = game({
      investigators: [R, D],
      prep: (g) => void enemyHere(g, D, MINION),
    });
    r = eff(r, { op: "fight" });
    expect(checkCondition(gOf(r), { testEnemyEngagedWithOther: true }, { you: R })).toBe(true);
    expect(checkCondition(gOf(r), { testEnemyEngagedWithOther: true }, { you: D })).toBe(false);
  });
});

describe("modifier: difficulty while parleying", () => {
  it("changes the difficulty of a parley action's test, not of another test", () => {
    const run = (parley: boolean) => {
      let r = game({ investigators: [R], bag: ["0"], prep: (g) => void inPlay(g, R, "02272") });
      r = inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "skillTest", skill: "willpower", difficulty: 4 },
        ctx: { you: R, ...(parley ? { parley: true as const } : {}) },
      });
      return toTurn(commitDone(r), R);
    };
    expect(lastTest(run(true))?.difficulty).toBe(2);
    expect(lastTest(run(false))?.difficulty).toBe(4);
  });
});

describe("iconsOnOthersTest", () => {
  it("counts only when the card is committed to another investigator's test", () => {
    let r = game({
      investigators: [R, D],
      bag: ["0"],
      prep: (g) => {
        hand(g, D, "02260"); // Leadership: [wild], [willpower][wild] on another's test
        hand(g, R, "02260");
      },
    });
    r = eff(r, { op: "skillTest", skill: "willpower", difficulty: 9 });
    expect(options(r).some((o) => o === "Commit Leadership (+1)")).toBe(true);
    r = until(
      commitDone(r),
      (x) => x.state.pending?.inv === D && x.state.pending?.kind === "commit",
    );
    // its printed [wild], and [willpower][wild] more on another's willpower test
    expect(options(r).some((o) => o === "Commit Leadership (+3)")).toBe(true);
  });
});

describe("triggers: encounterDrawn, attackFailed", () => {
  it("encounterDrawn: a draw from the encounter deck can be cancelled; the card is discarded", () => {
    let top = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        top = createCard(g, "01163", ZONE.Limbo); // Rotting Remains
        moveCard(g, top, ZONE.EncounterDeck, { top: true });
        hand(g, R, "02307"); // Ward of Protection 5
        addCounter(g, R, "resources", 5);
      },
    });
    r = until(
      inject(r, () => {}, { t: STEP.DrawEncounter, inv: R }),
      (x) => windowOf(x) === "encounterDrawn",
    );
    r = toTurn(pick(r, /Ward of Protection/), R);
    expect(card(gOf(r), top).zone).toBe(ZONE.EncounterDiscard);
    expect(inv(gOf(r), R).horror).toBe(1);
  });

  it("attackFailed: opened before the failed attack's damage goes to the engaged investigator", () => {
    let r = game({
      investigators: [R, D],
      bag: ["autoFail"],
      prep: (g) => void enemyHere(g, D, MINION),
    });
    // no reaction to it: the window passes without a prompt, and the attack's damage goes to Daisy as before
    r = toTurn(eff(r, { op: "fight" }), R);
    expect(inv(gOf(r), D).damage).toBe(1);
  });
});

describe("flags: baseRaised, discardAtRoundEnd", () => {
  it("baseRaised: a card in play raises its controller's base skill while it stays", () => {
    let man = "";
    const r = game({
      investigators: [R],
      prep: (g) => {
        man = inPlay(g, R, "02310");
        baseRaised.set(g, { [man]: { skills: ["agility"], to: 6 } });
      },
    });
    expect(baseSkill(gOf(r), R, "agility")).toBe(6);
    expect(baseSkill(gOf(r), R, "combat")).toBe(4);
    const gone = inject(r, (g) => moveCard(g, man, ZONE.Discard));
    expect(baseSkill(gOf(gone), R, "agility")).toBe(2);
  });

  it("discardAtRoundEnd: the card is discarded as the round ends, if still in play", () => {
    let ally = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        ally = inPlay(g, R, "01117"); // Lita Chantler
        discardAtRoundEnd.set(g, [ally]);
      },
    });
    r = toTurn(pick(r, "End turn"), R);
    expect(card(gOf(r), ally).zone).toBe(ZONE.Discard);
  });
});

describe("skipPhase, repeatPhase", () => {
  const nextTurn = (r: Result) =>
    until(pick(r, "End turn"), (x) => x.state.pending?.kind === "turn");

  it("skipPhase: the rest of the phase under way does not happen", () => {
    const r = game({ investigators: [R, D] });
    expect(currentRound(gOf(nextTurn(r)))).toBe(1);
    // the investigation phase skipped: no other turn this round
    expect(currentRound(gOf(nextTurn(inject(r, (g) => skipPhase(g)))))).toBe(2);
  });

  it("repeatPhase: the phase happens once more", () => {
    const r = game({ investigators: [R] });
    expect(currentRound(gOf(nextTurn(r)))).toBe(2);
    // the investigation phase again: another turn this round
    expect(currentRound(gOf(nextTurn(inject(r, (g) => repeatPhase(g, "investigation")))))).toBe(1);
  });
});
