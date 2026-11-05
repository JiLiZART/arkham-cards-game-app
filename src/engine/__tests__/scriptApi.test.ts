import { describe, expect, it } from "vitest";
import {
  addChaosTokens,
  allCards,
  campaignLogOf,
  cancelEvent,
  cardIf,
  currentAct,
  currentAgenda,
  currentPhase,
  currentRound,
  currentTest,
  difficultyOf,
  invIf,
  leadInvestigator,
  pile,
  placeInvestigator,
  setEngaged,
  sideDeck,
  turnOrder,
  type GameContext,
} from "../context";
import { findByCode } from "../queries";
import { db, gOf, putEnemy, skipMulligans, start } from "../kits/testkit";
import * as api from "../api";
import { queue } from "../api";
import { run } from "../steps/dispatch";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";
import { cardRecIn, invStateIn, pileRecIn } from "../world/store";
import { ZONE, PILE } from "../world/constants";

const R = "01001";
const D = "01002";
const fresh = (): GameContext => gOf(skipMulligans(start("the-gathering", [R, D], 1)));

describe("what scripts read about the scenario", () => {
  it("the act, agenda, lead, order, phase, round, difficulty, campaign log and test", () => {
    const game = fresh();
    expect(currentAct(game)).toBe(game.s.acts.a);
    expect(currentAgenda(game)).toBe(game.s.agendas.a);
    expect(leadInvestigator(game)).toBe(R);
    expect(turnOrder(game)).toEqual([R, D]);
    expect(currentPhase(game)).toBe(game.s.phase);
    expect(currentRound(game)).toBe(game.s.round);
    expect(difficultyOf(game)).toBe("standard");
    expect(campaignLogOf(game)).toBe(game.s.campaignLog);
    expect(currentTest(game)).toBeNull();
  });

  it("cards and investigators, an absent id giving undefined; every card; the piles", () => {
    const game = fresh();
    const study = findByCode(game, "01111", [ZONE.Location])!;
    expect(cardIf(game, study.id)).toBe(study);
    expect(cardIf(game, null)).toBeUndefined();
    expect(cardIf(game, "c99999")).toBeUndefined();
    expect(invIf(game, R)?.name).toBe("Roland Banks");
    expect(invIf(game, null)).toBeUndefined();
    expect(allCards(game)).toHaveLength(game.s.world.entities.length);
    expect(pile(game, ZONE.EncounterDeck)).toBe(pileRecIn(game.s, PILE.EncounterDeck));
    expect(sideDeck(game, "nowhere")).toEqual([]);
  });
});

describe("what scripts change outside the accessors for cards, counters and flags", () => {
  it("cancel an event, add chaos tokens, place an investigator, engage an enemy", () => {
    const game = fresh();
    cancelEvent(game, "atk1");
    expect(game.s.cancelled).toContain("atk1");
    const n = game.s.chaosBag.length;
    addChaosTokens(game, ["-1", "skull"]);
    expect(game.s.chaosBag.slice(n)).toEqual(["-1", "skull"]);
    const hallway =
      findByCode(game, "01112", [ZONE.Location]) ?? findByCode(game, "01111", [ZONE.Location])!;
    placeInvestigator(game, D, hallway.id);
    expect(invStateIn(game.s, D).location).toBe(hallway.id);
    const ghoul = putEnemy(game, "01160", findByCode(game, "01111", [ZONE.Location])!.id);
    setEngaged(game, ghoul, R);
    expect(cardRecIn(game.s, ghoul).engagedWith).toBe(R);
  });
});

describe("the verbs scripts queue engine steps with", () => {
  const CODE = "zz-api-order";
  it("queue resolves its steps in the order given, as push does", () => {
    const order: string[] = [];
    db.scripts[CODE] = { fns: { a: () => void order.push("a"), b: () => void order.push("b") } };
    try {
      const game = fresh();
      game.s = structuredClone(game.s);
      game.s.pending = null;
      queue(
        game,
        api.runScript({ code: CODE, fn: "a", ctx: {} }),
        api.runScript({ code: CODE, fn: "b", ctx: {} }),
      );
      run(game);
      expect(order).toEqual(["a", "b"]);
    } finally {
      delete db.scripts[CODE];
    }
  });

  // each verb queues exactly the step a script spelled out before (one example per kind, from a script)
  const same = (q: unknown, step: Step) => expect(q).toEqual(step);
  it("each verb builds the step its kind names", () => {
    same(api.runScript({ code: "12153", fn: "share", ctx: { you: R }, args: 2 }), {
      t: STEP.Script,
      code: "12153",
      fn: "share",
      ctx: { you: R },
      args: 2,
    });
    same(api.spawn({ enemy: "e1", inv: null, at: "l1" }), {
      t: STEP.Spawn,
      enemy: "e1",
      inv: null,
      at: "l1",
    });
    same(api.dealDamage({ inv: R, damage: 1, horror: 0, direct: true, source: "a1" }), {
      t: STEP.AssignDamage,
      inv: R,
      damage: 1,
      horror: 0,
      direct: true,
      source: "a1",
    });
    same(api.resolveEffects({ effects: [{ op: "gainResources", amount: 1 }], ctx: { you: R } }), {
      t: STEP.Effects,
      effects: [{ op: "gainResources", amount: 1 }],
      ctx: { you: R },
    });
    same(api.resolveEffect({ effect: { op: "gainResources", amount: 1 }, ctx: { you: R } }), {
      t: STEP.Eff,
      effect: { op: "gainResources", amount: 1 },
      ctx: { you: R },
    });
    same(api.advanceAct(), { t: STEP.AdvanceAct });
    same(api.flip("c1"), { t: STEP.Flip, card: "c1" });
    same(api.removeLocation({ location: "c1" }), { t: STEP.RemoveLocation, location: "c1" });
    same(api.toVoid("c1"), { t: STEP.Eff, effect: { op: "toVoid" }, ctx: { source: "c1" } });
    same(api.drawBeneath("scenario", { you: R }, true), {
      t: STEP.Eff,
      effect: { op: "drawBeneath", from: "scenario", random: true },
      ctx: { you: R },
    });
    same(api.resolveStory({ card: "c1", you: R }), { t: STEP.ResolveStory, card: "c1", you: R });
    same(api.placeDoom({ card: "c1", n: 1 }), { t: STEP.PlaceDoom, card: "c1", n: 1 });
    same(api.endScenario({ id: "R1" }), { t: STEP.Resolution, id: "R1" });
    same(api.drawCards({ inv: R, n: 1, tapped: true }), {
      t: STEP.Draw,
      inv: R,
      n: 1,
      tapped: true,
    });
    same(api.checkDoom(), { t: STEP.CheckDoom });
    same(api.resolveRevelation({ inv: R, card: "c1" }), { t: STEP.Revelation, inv: R, card: "c1" });
    same(api.enemyAttacks({ enemy: "e1", inv: R, aoo: false, key: "k1" }), {
      t: STEP.EnemyAttack,
      enemy: "e1",
      inv: R,
      aoo: false,
      key: "k1",
    });
    same(api.discoverClues({ inv: R, location: "l1", n: 1 }), {
      t: STEP.DiscoverClues,
      inv: R,
      location: "l1",
      n: 1,
    });
    same(api.damageEnemy({ enemy: "e1", amount: 3, by: R }), {
      t: STEP.DamageEnemy,
      enemy: "e1",
      amount: 3,
      by: R,
    });
    same(api.defeatInvestigator({ inv: R, by: "resign" }), {
      t: STEP.Defeated,
      inv: R,
      by: "resign",
    });
    same(api.playCard({ inv: R, card: "c1", free: true }), {
      t: STEP.PlayCard,
      inv: R,
      card: "c1",
      free: true,
    });
    same(api.useAbility({ inv: R, card: "c1", index: 0 }), {
      t: STEP.UseAbility,
      inv: R,
      card: "c1",
      index: 0,
    });
    same(api.moveInvestigator({ inv: R, to: "l1" }), { t: STEP.Move, inv: R, to: "l1" });
    same(api.defeatEnemy({ enemy: "e1", by: R }), { t: STEP.DefeatEnemy, enemy: "e1", by: R });
    same(api.checkObjectives(), { t: STEP.CheckObjectives });
    same(api.openWindow("enemyEngages", { inv: R, enemy: "e1" }), {
      t: STEP.Window,
      trigger: "enemyEngages",
      data: { inv: R, enemy: "e1" },
    });
    same(api.revealLocation("l1"), { t: STEP.RevealLocation, location: "l1" });
    same(api.checkAssetDefeat(R), { t: STEP.AssetDefeatCheck, inv: R });
    same(api.basicFight({ you: R, enemy: "e1" }), {
      t: STEP.BasicFight,
      ctx: { you: R, enemy: "e1" },
    });
  });
});

describe("what api.ts exports", () => {
  it("exactly the names scripts use (a name added or dropped changes this list)", () => {
    expect(Object.keys(api).sort()).toEqual([
      "CHOICE",
      "EVENT",
      "PHASE",
      "ZONE",
      "abilitiesOf",
      "activeInvs",
      "addChaosTokens",
      "addCounter",
      "addExtraReveal",
      "addSwarm",
      "addTempMod",
      "adjacent",
      "advanceAct",
      "advanceAgenda",
      "allCards",
      "argField",
      "asNumber",
      "asString",
      "asStrings",
      "ask",
      "attachTo",
      "attackKey",
      "basicFight",
      "bondedOf",
      "campaignLogOf",
      "canCommit",
      "canEnemyEnter",
      "canPay",
      "canPlay",
      "cancelEvent",
      "card",
      "cardIf",
      "cardsBeneath",
      "cardsIn",
      "cellOf",
      "chaosBag",
      "checkAssetDefeat",
      "checkCondition",
      "checkDoom",
      "checkObjectives",
      "compose",
      "connections",
      "controlled",
      "createCard",
      "currentAct",
      "currentActs",
      "currentAgenda",
      "currentAgendas",
      "currentPhase",
      "currentRound",
      "currentTest",
      "damageEnemy",
      "dealDamage",
      "deckCards",
      "def",
      "defeatEnemy",
      "defeatInvestigator",
      "difficultyOf",
      "discard",
      "discardTop",
      "discoverClues",
      "distances",
      "drawBeneath",
      "drawCards",
      "emit",
      "endScenario",
      "enemies",
      "enemiesAt",
      "enemyAttacks",
      "enemyStat",
      "enterVehicle",
      "exile",
      "findByCode",
      "flags",
      "flip",
      "flipNegativeTokens",
      "forceResult",
      "freeCellsAround",
      "fromVoid",
      "inColumn",
      "inRow",
      "inVehicle",
      "inv",
      "invIf",
      "invName",
      "invsAt",
      "isAloof",
      "isElite",
      "isHidden",
      "keywordArg",
      "leadInvestigator",
      "leaveVehicle",
      "link",
      "linkOneWay",
      "locationAt",
      "locationByName",
      "locations",
      "moveCard",
      "moveInvestigator",
      "moveVehicle",
      "openWindow",
      "pile",
      "placeDoom",
      "placeInvestigator",
      "placeLocation",
      "placeTokens",
      "playCard",
      "playCost",
      "playerCount",
      "putBeneath",
      "putOnTop",
      "queue",
      "randomInt",
      "randomLocation",
      "readInterlude",
      "ready",
      "remainingHealth",
      "remainingSanity",
      "removeLocation",
      "reshuffleDiscard",
      "resolveEffect",
      "resolveEffects",
      "resolveRevelation",
      "resolveStory",
      "resolveWeakness",
      "resolvesOnDraw",
      "revealBeneath",
      "revealLocation",
      "runScript",
      "setCardLocation",
      "setCell",
      "setCode",
      "setController",
      "setCounter",
      "setEngaged",
      "setOnChoose",
      "setOwner",
      "shroud",
      "shuffleDeck",
      "shuffleIntoDeck",
      "shuffleList",
      "sideDeck",
      "spawn",
      "spawnTargets",
      "spendableGroupClues",
      "startTest",
      "stepsToward",
      "swarmOf",
      "threatArea",
      "toVoid",
      "tokensOn",
      "treatTokenAs",
      "turnOrder",
      "uniqueInPlay",
      "unlink",
      "unreveal",
      "useAbility",
    ]);
  });

  it("a script can't queue a step it spelled out itself", () => {
    const game = fresh();
    game.s = structuredClone(game.s);
    // @ts-expect-error: steps are queued through the verbs, not as literals
    expect(() => queue(game, { t: "CheckDoom" })).not.toThrow();
  });
});
