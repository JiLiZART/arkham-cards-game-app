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
import { gOf, putEnemy, skipMulligans, start } from "../kits/testkit";
import { cardRecIn, invStateIn, pileRecIn } from "../world/store";
import { ZONE, PILE } from "../world/constants";

const R = "01001";
const D = "01002";
const fresh = (): GameContext => gOf(skipMulligans(start("the-gathering", [R, D], 1)));

describe("what scripts read about the scenario", () => {
  it("the act, agenda, lead, order, phase, round, difficulty, campaign log and test", () => {
    const game = fresh();
    expect(currentAct(game)).toBe(game.s.act);
    expect(currentAgenda(game)).toBe(game.s.agenda);
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
