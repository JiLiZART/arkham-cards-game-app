import { describe, expect, it } from "vitest";
import { db } from "../../engine/testkit";
import { back, canContinue, initialWizard, next, setCampaign, setDeck, setDifficulty, STEPS, toggleInvestigator, toSetup, type WizardState } from "./wizard";

const ROLAND = "01001";
const DAISY = "01002";
const SKIDS = "01003";
const AGNES = "01004";
const WENDY = "01005";

const tap = (s: WizardState, ...codes: string[]) => codes.reduce((w, c) => toggleInvestigator(db, w, c), s);

describe("wizard picks", () => {
  it("starts on the campaign step with the first campaign and the standard bag", () => {
    const s = initialWizard(db);
    expect(s).toMatchObject({ step: "campaign", campaignId: "night-of-the-zealot", difficulty: "standard", picks: [] });
  });

  it("the order tapped is the turn order: Daisy then Roland is P1, P2", () => {
    expect(tap(initialWizard(db), DAISY, ROLAND).picks).toEqual([DAISY, ROLAND]);
  });

  it("a fifth tap is ignored", () => {
    const s = tap(initialWizard(db), ROLAND, DAISY, SKIDS, AGNES, WENDY);
    expect(s.picks).toEqual([ROLAND, DAISY, SKIDS, AGNES]);
  });

  it("tapping a chosen investigator again removes them and the rest close up", () => {
    const s = tap(initialWizard(db), ROLAND, DAISY, SKIDS, DAISY);
    expect(s.picks).toEqual([ROLAND, SKIDS]);
    expect(s.decks[DAISY]).toBeUndefined();
  });

  it("a picked investigator gets their first starter deck; another can be chosen", () => {
    let s = tap(initialWizard(db), ROLAND);
    expect(s.decks[ROLAND]).toBe("roland-starter");
    s = setDeck(s, ROLAND, "some-other-deck");
    expect(s.decks[ROLAND]).toBe("some-other-deck");
  });
});

describe("wizard steps", () => {
  it("Continue needs an investigator before the decks step, and every step walks forward and back", () => {
    let s = initialWizard(db);
    expect(canContinue(db, s)).toBe(true); // campaign
    s = next(db, s);
    expect(s.step).toBe("investigators");
    expect(canContinue(db, s)).toBe(false);
    expect(next(db, s).step).toBe("investigators");
    s = next(db, tap(s, ROLAND));
    expect(s.step).toBe("decks");
    s = next(db, s);
    expect(s.step).toBe("difficulty");
    s = next(db, s);
    expect(s.step).toBe("ready");
    expect(next(db, s).step).toBe("ready");
    expect(STEPS.map((x) => x)).toEqual(["campaign", "investigators", "decks", "difficulty", "ready"]);
  });

  it("going back keeps the picks, the deck and the difficulty", () => {
    let s = tap(initialWizard(db), DAISY, ROLAND);
    s = { ...s, step: "decks" };
    s = setDifficulty(s, "expert");
    const b = back(s);
    expect(b.step).toBe("investigators");
    expect(b.picks).toEqual([DAISY, ROLAND]);
    expect(b.difficulty).toBe("expert");
    expect(back({ ...s, step: "campaign" }).step).toBe("campaign");
  });

  it("the decks step blocks Continue while a chosen deck is invalid or missing", () => {
    const s = { ...tap(initialWizard(db), ROLAND), step: "decks" as const };
    expect(canContinue(db, s)).toBe(true);
    expect(canContinue(db, setDeck(s, ROLAND, "no-such-deck"))).toBe(false);
  });

  it("a difficulty the campaign doesn't define can't be chosen", () => {
    expect(setDifficulty(initialWizard(db), "nightmare" as never, db).difficulty).toBe("standard");
  });

  it("changing the campaign resets nothing else it doesn't have to", () => {
    const s = setCampaign(tap(initialWizard(db), ROLAND), "night-of-the-zealot");
    expect(s.picks).toEqual([ROLAND]);
    expect(setCampaign(s, "made-up", db).campaignId).toBe("night-of-the-zealot");
  });
});

describe("toSetup", () => {
  it("is what newCampaign takes: campaign, difficulty, a seed and the investigators with their decks in order", () => {
    let s = tap(initialWizard(db), DAISY, ROLAND);
    s = setDifficulty(s, "expert");
    expect(toSetup(s, 42)).toEqual({
      campaignId: "night-of-the-zealot",
      difficulty: "expert",
      seed: 42,
      investigators: [{ code: DAISY, deckId: "daisy-starter" }, { code: ROLAND, deckId: "roland-starter" }],
    });
  });
});
