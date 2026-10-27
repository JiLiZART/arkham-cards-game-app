import { describe, expect, it, vi } from "vitest";
import { packLoaded } from "../../content/loader";
import { gameStore, db } from "./context";

describe("starting a campaign with an investigator whose pack is not loaded", () => {
  it("Zoey Samaras: the Dunwich pack loads first, then she is on the table with her deck", async () => {
    expect(packLoaded(db, "dwl")).toBe(false);
    gameStore.getState().newCampaign({
      campaignId: "the-dunwich-legacy",
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: "02001", deckId: "02001-starter" }],
    });
    expect(gameStore.getState().loading).toBe(true);
    await vi.waitFor(() => expect(gameStore.getState().campaign).not.toBeNull(), { timeout: 5000 });
    expect(packLoaded(db, "dwl")).toBe(true);
    // the campaign opens with its prologue, then the choice of the first scenario (Extracurricular Activity), then Begin
    const waits = () => gameStore.getState().campaign!.flow.waiting?.step.kind;
    expect(gameStore.getState().screen).toBe("log");
    expect(waits()).toBe("continue");
    gameStore.getState().answerFlow("continue");
    expect(waits()).toBe("chooseOne");
    gameStore.getState().answerFlow("1a");
    expect(waits()).toBe("play");
    gameStore.getState().startScenario(1);
    const game = gameStore.getState().game!;
    expect(Object.values(game.cards).some((c) => c.code === "02001")).toBe(true);
    expect(game.order).toEqual(["02001"]);
    // her deck: the 30 cards less the opening hand are still to draw
    expect(
      Object.values(game.cards).filter(
        (c) => c.owner === "02001" && (c.zone === "deck" || c.zone === "hand"),
      ).length,
    ).toBeGreaterThan(25);
  });

  it("and the bot plays her through the first rounds without an error", () => {
    const s = gameStore.getState();
    s.setLocale("ru");
    for (let k = 0; k < 40 && (gameStore.getState().game?.round ?? 9) < 3; k++) {
      gameStore.getState().skipEvents();
      gameStore.getState().autoStep(25);
    }
    expect(gameStore.getState().error).toBeNull();
    expect(gameStore.getState().game!.round).toBeGreaterThanOrEqual(2);
  });
});
