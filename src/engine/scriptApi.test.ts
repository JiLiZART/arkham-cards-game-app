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
  findByCode,
  invIf,
  leadInvestigator,
  pile,
  placeInvestigator,
  setEngaged,
  sideDeck,
  turnOrder,
  type G,
} from "./core";
import { gOf, putEnemy, skipMulligans, start } from "./testkit";
import { cardRecIn, invStateIn, pileRecIn } from "./records";

const R = "01001";
const D = "01002";
const fresh = (): G => gOf(skipMulligans(start("the-gathering", [R, D], 1)));

describe("what scripts read about the scenario", () => {
  it("the act, agenda, lead, order, phase, round, difficulty, campaign log and test", () => {
    const g = fresh();
    expect(currentAct(g)).toBe(g.s.act);
    expect(currentAgenda(g)).toBe(g.s.agenda);
    expect(leadInvestigator(g)).toBe(R);
    expect(turnOrder(g)).toEqual([R, D]);
    expect(currentPhase(g)).toBe(g.s.phase);
    expect(currentRound(g)).toBe(g.s.round);
    expect(difficultyOf(g)).toBe("standard");
    expect(campaignLogOf(g)).toBe(g.s.campaignLog);
    expect(currentTest(g)).toBeNull();
  });

  it("cards and investigators, an absent id giving undefined; every card; the piles", () => {
    const g = fresh();
    const study = findByCode(g, "01111", ["location"])!;
    expect(cardIf(g, study.id)).toBe(study);
    expect(cardIf(g, null)).toBeUndefined();
    expect(cardIf(g, "c99999")).toBeUndefined();
    expect(invIf(g, R)?.name).toBe("Roland Banks");
    expect(invIf(g, null)).toBeUndefined();
    expect(allCards(g)).toHaveLength(g.s.world.entities.length);
    expect(pile(g, "encounterDeck")).toBe(pileRecIn(g.s, "encounterDeck"));
    expect(sideDeck(g, "nowhere")).toEqual([]);
  });
});

describe("what scripts change outside the accessors for cards, counters and flags", () => {
  it("cancel an event, add chaos tokens, place an investigator, engage an enemy", () => {
    const g = fresh();
    cancelEvent(g, "atk1");
    expect(g.s.cancelled).toContain("atk1");
    const n = g.s.chaosBag.length;
    addChaosTokens(g, ["-1", "skull"]);
    expect(g.s.chaosBag.slice(n)).toEqual(["-1", "skull"]);
    const hallway = findByCode(g, "01112", ["location"]) ?? findByCode(g, "01111", ["location"])!;
    placeInvestigator(g, D, hallway.id);
    expect(invStateIn(g.s, D).location).toBe(hallway.id);
    const ghoul = putEnemy(g, "01160", findByCode(g, "01111", ["location"])!.id);
    setEngaged(g, ghoul, R);
    expect(cardRecIn(g.s, ghoul).engagedWith).toBe(R);
  });
});
