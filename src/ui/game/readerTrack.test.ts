import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../engine/kits/testkit";
import { createGameStore } from "../state/store";
import { useView } from "../state/view";
import { trackReader } from "./readerTrack";

const mem = (): Storage => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as Storage;
};
afterEach(() => useView.setState({ reader: null }));

const roland = {
  campaignId: "night-of-the-zealot",
  difficulty: "standard" as const,
  seed: 9,
  investigators: [{ code: "01001", deckId: "roland-starter" }],
};

describe("trackReader (campaign-story-reader 2.3, 3.1)", () => {
  it("keeps the reader's pages in step with the campaign: an answer adds, never removes", () => {
    const s = createGameStore(db, mem());
    trackReader(s, db);
    s.getState().newCampaign(roland);
    const before = useView.getState().reader!.pages.map((p) => p.id);
    // the campaign state moves (an answer here or on another screen): the pages stay
    s.setState({
      campaign: { ...s.getState().campaign!, flow: { ...s.getState().campaign!.flow } },
    });
    expect(useView.getState().reader!.pages.map((p) => p.id)).toEqual(before);
  });

  it("clears the reader once the game begins", () => {
    const s = createGameStore(db, mem());
    trackReader(s, db);
    s.getState().newCampaign(roland);
    expect(useView.getState().reader).not.toBeNull();
    s.getState().startScenario(9);
    expect(useView.getState().reader).toBeNull();
  });
});
