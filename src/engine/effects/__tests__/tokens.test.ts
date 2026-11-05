/**
 * The chaos token vocabulary The Path to Carcosa's reference cards need (campaign-the-path-to-carcosa, task 1.2): the X
 * sources, the results, and the printed lines `tokensReal` accounts for. One test per entry.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import { tokensReal } from "../../../content/implemented";
import type { Effect, TokenEffect } from "../../../content/schema";
import type { Result } from "../../index";
import {
  addCounter,
  card,
  currentAgenda,
  exhaust,
  inv,
  setCounter,
  type GameContext,
} from "../../context";
import { addTempMod, checkCondition } from "../../queries";
import { tokenX } from "../../rules/tokens";
import {
  addLocation,
  enemyHere,
  game,
  inject,
  fight,
  investigate,
  lastTest,
  move,
  toTurn,
} from "../../kits/driver";
import { db, gOf, locId, mutate, putEnemy } from "../../kits/testkit";
import { createCard, moveCard } from "../../movement";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";
import { startLocation } from "../../world/flags";
import type { ContentDb } from "../../world/types";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001";
const STUDY = "01111";
const start = (prep: (game: GameContext) => void = () => {}) =>
  game({ investigators: [R], bag: ["0"], prep });
const effect = (r: Result, e: Effect) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source: null } }),
    R,
  );
const here = (game: GameContext) => inv(game, R).location!;
/** Study – Hallway – Attic, every one revealed */
const corridor = (game: GameContext) => {
  addLocation(game, "01112", [[STUDY, "01112"]]);
  addLocation(game, "01113", [["01112", "01113"]]);
};
/** a second agenda deck, its agenda in play (Black Stars Rise) */
const secondAgenda = (game: GameContext) => {
  const b = createCard(game, "01106", ZONE.Limbo);
  moveCard(game, b, ZONE.Agenda, { deck: "b" });
  return b;
};

describe("X sources", () => {
  it("horrorOnYou: the horror on you", () => {
    const g = gOf(start((x) => setCounter(x, R, "horror", 3)));
    expect(tokenX(g, "horrorOnYou", R)).toBe(3);
  });

  it("baseShroudOfYourLocation: the printed shroud, not what modifiers make it", () => {
    const g = gOf(start((x) => addTempMod(x, { stat: "shroud", value: 2 }, here(x), "round")));
    expect(tokenX(g, "yourLocationShroud", R)).toBe(4); // the shroudOfYourLocation of the task: the Study's 2 + 2
    expect(tokenX(g, "baseShroudOfYourLocation", R)).toBe(2);
  });

  it("highestDoomOnEnemy and doomOnEnemies count enemies only, not the agenda", () => {
    const g = gOf(
      start((x) => {
        setCounter(x, enemyHere(x, R, "01160", false), "doom", 2);
        setCounter(x, enemyHere(x, R, "01161", false), "doom", 1);
        setCounter(x, currentAgenda(x)!, "doom", 5);
      }),
    );
    expect(tokenX(g, "highestDoomOnEnemy", R)).toBe(2);
    expect(tokenX(g, "doomOnEnemies", R)).toBe(3);
  });

  it("highestDoomOnAgenda and doomOnAgendas over every agenda deck", () => {
    const g = gOf(
      start((x) => {
        setCounter(x, currentAgenda(x)!, "doom", 2);
        setCounter(x, secondAgenda(x), "doom", 3);
        setCounter(x, enemyHere(x, R, "01160", false), "doom", 4);
      }),
    );
    expect(tokenX(g, "highestDoomOnAgenda", R)).toBe(3);
    expect(tokenX(g, "doomOnAgendas", R)).toBe(5);
  });

  it("distanceFromStart: locations away from where the scenario started (none recorded: 0)", () => {
    let r = start(corridor);
    expect(tokenX(gOf(r), "distanceFromStart", R)).toBe(0);
    r = mutate(r, (g) => startLocation.set(g, locId(g, STUDY)));
    r = toTurn(move(toTurn(move(r, "01112"), R), "01113"), R);
    expect(tokenX(gOf(r), "distanceFromStart", R)).toBe(2);
  });
});

describe("a token resolved in a skill test", () => {
  const TEST = "ptc-token-test";
  /** The Gathering with its skull replaced */
  const withSkull = (skull: TokenEffect) => {
    db.scenarios[TEST] = {
      ...db.scenarios["the-gathering"],
      id: TEST,
      tokens: { ...db.scenarios["the-gathering"].tokens, standard: { skull } },
    };
  };
  const skullTest = (prep: (game: GameContext) => void = () => {}) =>
    investigate(game({ scenario: TEST, investigators: [R], bag: ["skull"], prep }));

  it("xMin: X is at least it (Curtain Call: if you have no horror on you, X is 1)", () => {
    withSkull({ modifier: "X", x: "horrorOnYou", xMin: 1 });
    // Roland's 3 intellect, the Study's shroud 2
    expect(lastTest(skullTest())!.total).toBe(2);
    expect(lastTest(skullTest((g) => setCounter(g, R, "horror", 2)))!.total).toBe(1);
  });

  it("xMax caps X (A Phantom of Truth: the doom in play, max 5)", () => {
    withSkull({ modifier: "X", x: "totalDoomInPlay", xMax: 1 });
    expect(lastTest(skullTest((g) => setCounter(g, currentAgenda(g)!, "doom", 3)))!.total).toBe(2);
  });

  it("loseResources by the amount failed (A Phantom of Truth's elder thing)", () => {
    withSkull({ modifier: -3, onFail: [{ op: "loseResources", amount: "failBy" }] });
    const r = skullTest();
    expect(lastTest(r)!.success).toBe(false); // 3 - 3 = 0 against 2
    expect(inv(gOf(r), R).resources).toBe(5 - 2);
  });

  it("automatically fails instead against an enemy with doom (Black Stars Rise's cultist)", () => {
    withSkull({
      modifier: 0,
      instead: { when: { enemyWithDoom: "testEnemy" }, autoFail: true },
    });
    const fightIt = (doom: number) =>
      lastTest(
        fight(
          game({
            scenario: TEST,
            investigators: [R],
            bag: ["skull"],
            prep: (g) => setCounter(g, enemyHere(g, R, "01159"), "doom", doom),
          }),
          "01159",
        ),
      )!;
    // Roland's 4 combat against the Swarm of Rats' 1 fight
    expect(fightIt(0).success).toBe(true);
    expect(fightIt(1).success).toBe(false);
  });
});

describe("results", () => {
  it("moveEnemies: each unengaged enemy of the trait once toward the nearest investigator (A Phantom of Truth's cultist)", () => {
    let attic = "";
    let engaged = "";
    let other = "";
    let r = start((g) => {
      corridor(g);
      attic = putEnemy(g, "03086", locId(g, "01113"));
      engaged = putEnemy(g, "03222", here(g), R);
      other = putEnemy(g, "01160", locId(g, "01113"));
    });
    r = effect(r, {
      op: "moveEnemies",
      trait: "Byakhee",
      unengaged: true,
      toward: "nearestInvestigator",
    });
    const g = gOf(r);
    expect(card(g, attic).location).toBe(locId(g, "01112"));
    expect(card(g, engaged).location).toBe(here(g));
    expect(card(g, other).location).toBe(locId(g, "01113"));
    // once more: it enters Roland's location and engages him
    r = effect(r, {
      op: "moveEnemies",
      trait: "Byakhee",
      unengaged: true,
      toward: "nearestInvestigator",
    });
    expect(card(gOf(r), attic).location).toBe(here(gOf(r)));
    expect(card(gOf(r), attic).engagedWith).toBe(R);
  });

  it("enemyAttack with a filter: a ready Ghoul or Geist at your location attacks you; an exhausted one only once readied (The Pallid Mask's tablet)", () => {
    let ghoul = "";
    const attack = (prep: (game: GameContext) => void, ready: boolean) =>
      effect(
        start((g) => {
          ghoul = enemyHere(g, R, "01160", false);
          enemyHere(g, R, "01159", false); // a Creature: not the filter's
          prep(g);
        }),
        {
          op: "enemyAttack",
          enemy: "chooseAtLocation",
          filter: { trait: ["Ghoul", "Geist"] },
          ...(ready ? { ready: true } : { onlyReady: true }),
        },
      );
    // the Ghoul Minion deals 1 damage, 1 horror; the Swarm of Rats would deal 1 damage only
    expect(inv(gOf(attack(() => {}, false)), R)).toMatchObject({ damage: 1, horror: 1 });
    expect(inv(gOf(attack((g) => exhaust(g, ghoul), false)), R)).toMatchObject({
      damage: 0,
      horror: 0,
    });
    const readied = attack((g) => exhaust(g, ghoul), true);
    expect(inv(gOf(readied), R)).toMatchObject({ damage: 1, horror: 1 });
    expect(card(gOf(readied), ghoul).exhausted).toBe(false);
  });

  it("placeDoom on eachAgenda (Black Stars Rise's tablet)", () => {
    let b = "";
    const r = effect(
      start((g) => {
        b = secondAgenda(g);
      }),
      { op: "placeDoom", amount: 1, on: "eachAgenda" },
    );
    const g = gOf(r);
    expect(card(g, currentAgenda(g)!).doom).toBe(1);
    expect(card(g, b).doom).toBe(1);
  });

  it("the condition enemyWithDoom: the test's enemy, or one at your location", () => {
    let e = "";
    const g = gOf(
      start((x) => {
        e = enemyHere(x, R, "01160");
      }),
    );
    expect(checkCondition(g, { enemyWithDoom: "testEnemy" }, { you: R, enemy: e })).toBe(false);
    expect(checkCondition(g, { enemyWithDoom: "atYourLocation" }, { you: R })).toBe(false);
    addCounter(g, e, "doom", 1);
    expect(checkCondition(g, { enemyWithDoom: "testEnemy" }, { you: R, enemy: e })).toBe(true);
    expect(checkCondition(g, { enemyWithDoom: "atYourLocation" }, { you: R })).toBe(true);
  });
});

describe("tokensReal reads The Path to Carcosa's lines", () => {
  /** a reference card with these lines on both faces, and a scenario whose four difficulties hold `entry` for the skull */
  const real = (line: string, entry: TokenEffect) => {
    const fake = {
      cards: { "9": { code: "9", type: "scenario", text: line, backText: line } },
      scenarios: {
        s: {
          card: "9",
          tokens: {
            easy: { skull: entry },
            standard: { skull: entry },
            hard: { skull: entry },
            expert: { skull: entry },
          },
        },
      },
    } as unknown as ContentDb;
    return tokensReal(fake, "s");
  };

  it("-X, where X is … (If you have no horror on you, X is 1.): needs X", () => {
    const line =
      "[skull]: -X, where X is the amount of horror on you. (If you have no horror on you, X is 1.)";
    expect(real(line, { modifier: "X", x: "horrorOnYou", xMin: 1 })).toBe(true);
    expect(real(line, { modifier: -1 })).toBe(false);
  });

  it("(max 5) needs xMax", () => {
    const line = "[skull]: -X. X is the amount of doom in play (max 5).";
    expect(real(line, { modifier: "X", x: "totalDoomInPlay", xMax: 5 })).toBe(true);
    expect(real(line, { modifier: "X", x: "totalDoomInPlay" })).toBe(false);
  });

  it("Either …, or this test automatically fails instead: needs either", () => {
    const line =
      "[skull]: 0. Either randomly choose an enemy from among the set-aside [[Monster]] enemies and place it beneath the act deck without looking at it, or this test automatically fails instead.";
    const either = { do: [], label: "x", key: "x", autoFail: true } as const;
    expect(real(line, { modifier: 0, either: { ...either, do: [] } })).toBe(true);
    expect(real(line, { modifier: 0, onReveal: [{ op: "surge" }] })).toBe(false);
  });
});
