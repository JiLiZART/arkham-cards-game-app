import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../engine/kits/testkit";
import { createGameStore } from "../state/store";
import { useView } from "../state/view";
import { INTRO_STEPS, introHides, trackIntro } from "./intro";

const mem = (): Storage =>
  ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  }) as unknown as Storage;
afterEach(() => useView.setState({ intro: null, reader: null }));

describe("the scenario introduction on the table (campaign-story-reader 4.1)", () => {
  it("has no story step: that is read in the story reader before the scenario is set up", () => {
    expect(INTRO_STEPS).toEqual(["agenda", "act", "deal"]);
  });

  it("begins with the agenda once the last mulligan is confirmed", () => {
    const s = createGameStore(db, mem());
    trackIntro(s);
    s.getState().newCampaign({
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 9,
      investigators: [{ code: "01001", deckId: "roland-starter" }],
    });
    s.getState().startScenario(9);
    expect(useView.getState().intro).toBeNull();
    while (s.getState().game!.pending?.kind === "mulligan") s.getState().choose("done");
    expect(useView.getState().intro?.step).toBe("agenda");
  });

  it("keeps the agenda, act and map off the table until their turn", () => {
    const game = { phase: "investigation", pending: null } as never;
    expect(introHides(game, "agenda")).toEqual({ agenda: true, act: true, map: true });
    expect(introHides(game, "act")).toEqual({ agenda: false, act: true, map: true });
    expect(introHides(game, "deal")).toEqual({ agenda: false, act: false, map: false });
  });
});
