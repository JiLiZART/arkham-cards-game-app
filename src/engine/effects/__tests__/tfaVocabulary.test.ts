/**
 * The token and location vocabulary The Forgotten Age needs (engine-tfa-supplies-vengeance-exploration, group 5): the
 * X sources and their clamp, the auto-fail while poisoned, a clue turned to doom, a named scenario counter.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Effect, TokenEffect } from "../../../content/schema";
import type { Result } from "../../index";
import { card, inv, setCounter, setController, type GameContext } from "../../context";
import { checkCondition, locations, POISONED } from "../../queries";
import { tokenX } from "../../rules/tokens";
import { amt } from "../targets";
import { addLocation, game, inject, investigate, lastTest, toTurn } from "../../kits/driver";
import { db, gOf } from "../../kits/testkit";
import { createCard } from "../../movement";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";
import { scenarioCounter } from "../../world/flags";

beforeAll(async () => {
  await loadPack("tfa");
});

const R = "01001";
const STUDY = "01111";
const TEST = "tfa-token-test";
afterEach(() => {
  delete db.scenarios[TEST];
});
const start = (prep: (game: GameContext) => void = () => {}) =>
  game({ investigators: [R], bag: ["0"], prep });
const effect = (r: Result, e: Effect, source: string | null = null) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source } }),
    R,
  );
const here = (game: GameContext) => inv(game, R).location!;
/** the Study with 2 doom, the Hallway with 1, the Attic with none */
const doomed = (game: GameContext) => {
  addLocation(game, "01112", [[STUDY, "01112"]]);
  addLocation(game, "01113", [["01112", "01113"]]);
  setCounter(game, here(game), "doom", 2);
  setCounter(game, locations(game).find((l) => l.code === "01112")!.id, "doom", 1);
};

describe("X sources (5.1)", () => {
  it("locationsInPlay, locationsWithDoom, doomOnLocations, scenarioCounter", () => {
    const g = gOf(start(doomed));
    expect(tokenX(g, "locationsInPlay", R)).toBe(3);
    expect(tokenX(g, "locationsWithDoom", R)).toBe(2);
    expect(tokenX(g, "doomOnLocations", R)).toBe(3);
    expect(amt(g, "locationsWithDoom", { you: R })).toBe(2);
    expect(amt(g, "doomOnLocations", { you: R })).toBe(3);
    scenarioCounter.set(g, "depth", 4);
    expect(tokenX(g, "scenarioCounter", R, "depth")).toBe(4);
  });

  const withSkull = (skull: TokenEffect) => {
    db.scenarios[TEST] = {
      ...db.scenarios["the-gathering"],
      id: TEST,
      tokens: { ...db.scenarios["the-gathering"].tokens, standard: { skull } },
    };
  };
  const skullTest = (prep: (game: GameContext) => void = () => {}) =>
    lastTest(investigate(game({ scenario: TEST, investigators: [R], bag: ["skull"], prep })))!;

  it("xMax clamps the new sources (The Untamed Wilds' tablet: X is the locations in play, max 5)", () => {
    // a max of 2 here, so the clamp shows against Roland's 3 intellect
    withSkull({ modifier: "X", x: "locationsInPlay", xMax: 2 });
    const many = (game: GameContext) => {
      let prev = STUDY;
      for (const code of ["01112", "01113", "01114", "01115", "01116", "01117"]) {
        addLocation(game, code, [[prev, code]]);
        prev = code;
      }
    };
    // 7 locations in play, X counts 2
    expect(skullTest(many).total).toBe(1);
  });

  it("the test automatically fails while you are poisoned (the elder thing)", () => {
    withSkull({ modifier: 0, instead: { when: { poisoned: true }, autoFail: true } });
    const poison = (game: GameContext) => {
      const id = createCard(game, POISONED, ZONE.Threat);
      setController(game, id, R);
    };
    // Roland's 3 intellect against the Study's 2 shroud
    expect(skullTest().success).toBe(true);
    expect(skullTest(poison).success).toBe(false);
  });
});

describe("clues to doom and scenario counters (5.2)", () => {
  it("flipClueToDoom turns one clue on the location to doom", () => {
    let r = start();
    const before = card(gOf(r), here(gOf(r))).clues;
    r = effect(r, { op: "flipClueToDoom", at: "yourLocation" });
    const loc = card(gOf(r), here(gOf(r)));
    expect(loc.clues).toBe(before - 1);
    expect(loc.doom).toBe(1);
  });

  it("setCounter and addCounter keep a named counter the condition reads", () => {
    let r = effect(start(), { op: "setCounter", name: "depth", amount: 2 });
    r = effect(r, { op: "addCounter", name: "depth", amount: 1 });
    const g = gOf(r);
    expect(scenarioCounter.get(g, "depth")).toBe(3);
    expect(checkCondition(g, { counter: { name: "depth", min: 3 } }, { you: R })).toBe(true);
    expect(checkCondition(g, { counter: { name: "depth", max: 2 } }, { you: R })).toBe(false);
  });
});
