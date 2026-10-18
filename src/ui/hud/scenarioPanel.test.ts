import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { gameStore } from "../context";
import { ScenarioPanel } from "./Panels";

describe("the scenario panel", () => {
  it("the act and the agenda do not enlarge on hover (a tap opens the viewer); the reference card is a plain button", () => {
    gameStore.getState().newCampaign({ campaignId: "night-of-the-zealot", difficulty: "standard", seed: 3, investigators: [{ code: "01001", deckId: "roland-starter" }] });
    // server rendering reads the initial state: make that the game just started
    gameStore.getInitialState = gameStore.getState;
    const html = renderToStaticMarkup(createElement(ScenarioPanel));
    const minis = html.match(/<button[^>]*class="mini-card[^"]*"[^>]*>/g) ?? [];
    // the agenda, the act and the reference card
    expect(minis.length).toBe(3);
    const cards = minis.filter((b) => /data-card=/.test(b));
    expect(cards.length).toBe(2);
    for (const b of cards) expect(b).toContain('data-hover="off"');
  });
});
