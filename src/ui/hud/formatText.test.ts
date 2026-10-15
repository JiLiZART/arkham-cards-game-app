import { describe, expect, it } from "vitest";
import { db } from "../../engine/testkit";
import { formatText } from "./Hud";

describe("rules text icons", () => {
  it("renders Roland's text with icons and glyphs, no raw brackets", () => {
    const html = formatText(db.cards["01001"].text);
    expect(html).toContain('src="/icons/elderSign.png"');
    // the reaction glyph from the icon font, with its fallback symbol
    expect(html).toMatch(/class="gl" title="reaction"/);
    expect(html).toContain(`<span class="gl-i" aria-hidden="true">${String.fromCodePoint(0x75)}</span><span class="gl-fb" aria-hidden="true">↺</span>`);
    expect(html).not.toMatch(/\[\w+\]/);
  });

  it("renders a per-investigator glyph after the number", () => {
    const html = formatText("2[per_investigator] clues");
    expect(html).toMatch(/^2<span class="gl" title="per investigator"/);
    expect(html).not.toContain("[");
  });

  it("renders skill and chaos icons inline and escapes everything else", () => {
    const html = formatText("You get +1 [intellect]. If a [skull] is revealed <script>x</script>");
    expect(html).toContain('src="/icons/intellect.png"');
    expect(html).toContain('src="/icons/skull.png"');
    expect(html).toContain("&lt;script&gt;");
  });
});
