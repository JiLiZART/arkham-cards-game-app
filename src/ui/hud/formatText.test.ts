import { describe, expect, it } from "vitest";
import { db } from "../../engine/testkit";
import { formatText } from "./Hud";

describe("rules text icons", () => {
  it("renders Roland's text with icons and glyphs, no raw brackets", () => {
    const html = formatText(db.cards["01001"].text);
    expect(html).toContain('src="/icons/elderSign.png"');
    expect(html).toMatch(/class="icon icon-reaction"[^>]*>↺</);
    expect(html).not.toMatch(/\[\w+\]/);
  });

  it("renders skill and chaos icons inline and escapes everything else", () => {
    const html = formatText("You get +1 [intellect]. If a [skull] is revealed <script>x</script>");
    expect(html).toContain('src="/icons/intellect.png"');
    expect(html).toContain('src="/icons/skull.png"');
    expect(html).toContain("&lt;script&gt;");
  });
});
