import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HandCount } from "./Stats";

const render = (value: number) =>
  renderToStaticMarkup(createElement(HandCount, { value, limit: 8 }));

describe("HandCount", () => {
  it("is the player card back and the number, never a text label, even with no sprite loaded", () => {
    // no symbols are registered in this test: a sprite-drawn icon would fall back to its name as text
    const html = render(5);
    expect(html).toMatch(/<img[^>]+back-player\.png/);
    expect(html).toContain("<b>5</b>");
    expect(html).not.toMatch(/gl-fb|>card</);
  });

  it("turns red over the hand limit", () => {
    expect(render(9)).toMatch(/class="[^"]*\bover\b/);
  });
});
