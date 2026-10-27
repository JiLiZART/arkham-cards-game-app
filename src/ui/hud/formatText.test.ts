import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { spriteIds } from "../../../scripts/import-icons";
import { db } from "../../engine/testkit";
import { registerSymbols } from "../assets/icons";
import { formatText } from "./Hud";

registerSymbols(spriteIds(readFileSync("public/icons/sprite.svg", "utf8")));

describe("rules text icons", () => {
  it("renders Roland's text with sprite icons, no raw brackets and no icon font", () => {
    const html = formatText(db.cards["01001"].text);
    expect(html).toMatch(
      /<svg class="svg-icon gl"[^>]*aria-label="elder sign"><title>elder sign<\/title><use href="#elder_sign" fill="currentColor"\/><\/svg>/,
    );
    expect(html).toContain('<use href="#reaction"');
    expect(html).not.toMatch(/\[\w+\]/);
    expect(html).not.toContain("font-family");
  });

  it("renders a per-investigator symbol after the number", () => {
    const html = formatText("2[per_investigator] clues");
    expect(html).toMatch(
      /^2<svg class="svg-icon gl"[^>]*><title>per investigator<\/title><use href="#per_investigator"/,
    );
    expect(html).not.toContain("[");
  });

  it("renders skills in their printed colour, chaos tokens inline, and escapes everything else", () => {
    const html = formatText("You get +1 [intellect]. If a [skull] is revealed <script>x</script>");
    expect(html).toContain('<use href="#intellect" fill="#9a4a8a"/>');
    expect(html).toContain('<use href="#skull" fill="currentColor"/>');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("draws unique, weakness, action, reaction, free, bless, curse and frost from the sprite; [fast] is the free symbol", () => {
    for (const k of ["unique", "weakness", "action", "reaction", "free", "bless", "curse", "frost"])
      expect(formatText(`[${k}]`), k).toContain(`<use href="#${k}"`);
    expect(formatText("[fast]")).toContain('<use href="#free"');
  });

  it("markup the sprite doesn't know shows as text", () => {
    expect(formatText("[made_up]")).toBe(
      '<span class="icon icon-made_up" title="made up">made up</span>',
    );
  });
});
