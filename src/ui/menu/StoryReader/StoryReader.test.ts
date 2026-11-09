import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadAllPacks } from "../../../content";
import { gameStore } from "../../state/context";
import { useView } from "../../state/view";
import { ReaderBody } from "./StoryReader";

beforeAll(async () => {
  await loadAllPacks();
});
afterEach(() => useView.setState({ reader: null }));

const html = () => {
  // server rendering reads the store's initial state: make it the state as it is now
  gameStore.getInitialState = gameStore.getState;
  return renderToStaticMarkup(createElement(ReaderBody, { reader: useView.getState().reader! }));
};

describe("the story reader's screen (3.2)", () => {
  it("opens on the campaign's name and its first paragraph, with no Begin yet", () => {
    gameStore.getState().setLocale("en");
    gameStore.getState().newCampaign({
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 3,
      investigators: [{ code: "01001", deckId: "roland-starter" }],
    });
    const out = html();
    expect(out).toContain('data-testid="story-reader"');
    expect(out).toContain("Night of the Zealot");
    expect(out).toContain("Friday, September 18, 1925");
    expect(out).not.toContain('data-testid="reader-begin"');
    expect(out).toContain('data-testid="reader-skip"');
  });

  it("the scenario's page, all shown, ends in Begin", () => {
    gameStore.getState().openReader();
    const r = useView.getState().reader!;
    const at = r.pages.findIndex((p) => p.kind === "scenario");
    useView.setState({ reader: { ...r, at, revealed: r.pages[at].paragraphs.length } });
    const out = html();
    expect(out).toContain("Scenario I");
    expect(out).toContain("The Gathering");
    expect(out).toContain('data-testid="reader-begin"');
  });
});
