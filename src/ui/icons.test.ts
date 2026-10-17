import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasTokenArt } from "./ChaosToken";
import { findGlyph, glyphChar, setIcon } from "./glyphs";
import { spriteIds } from "../../scripts/import-icons";
import { ICON_SOURCES, MARKUP_ICONS, type IconSource } from "./icons";

/** PNG colour type (IHDR byte 25): 4 = grey + alpha, 6 = RGBA */
const hasAlpha = (file: string) => [4, 6].includes(readFileSync(file)[25]);

describe("icons", () => {
  it("every icon resolves to an existing glyph, chaos token art or PNG", () => {
    for (const [name, src] of Object.entries(ICON_SOURCES) as [string, IconSource][]) {
      if ("png" in src) expect(existsSync(`public/icons/${src.png}.png`), name).toBe(true);
      else if ("token" in src) expect(hasTokenArt(src.token), name).toBe(true);
      else {
        expect(findGlyph(src.glyph), name).not.toBeNull();
        if (src.under) expect(findGlyph(src.under.glyph), name).not.toBeNull();
      }
    }
  });

  it("no PNG is used for something the icon fonts have", () => {
    const fontConcepts = ["willpower", "intellect", "combat", "agility", "wild", "guardian", "seeker", "rogue", "mystic", "survivor", "health", "sanity", "hand", "arcane", "accessory", "body", "ally", "skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail", "+1", "-1"];
    for (const n of fontConcepts) expect("png" in (ICON_SOURCES as Record<string, IconSource>)[n], n).toBe(false);
  });

  it("every remaining PNG icon has a transparent background", () => {
    for (const src of Object.values(ICON_SOURCES) as IconSource[]) if ("png" in src) expect(hasAlpha(`public/icons/${src.png}.png`), src.png).toBe(true);
  });

  it("every rules-text markup key names a symbol in the sprite", () => {
    const ids = new Set(spriteIds(readFileSync("public/icons/sprite.svg", "utf8")));
    for (const [k, id] of Object.entries(MARKUP_ICONS)) expect(ids.has(id), k).toBe(true);
  });

  it("lookups fall through the fonts: shared glyphs from arkhamicons, set icons from blood / standalone", () => {
    expect(findGlyph("skull")?.font).toBe("arkhamicons");
    expect(findGlyph("skull", "arkhamslim")?.font).toBe("arkhamslim");
    // arkhamslim has no slots: falls back to arkhamicons
    expect(findGlyph("hand", "arkhamslim")?.font).toBe("arkhamicons");
    expect(setIcon("curse_of_the_rougarou")?.font).toBe("standalone");
    expect(setIcon("bloodthirst")?.font).toBe("blood");
    expect(glyphChar("token_-3_highlight", "tokens")).not.toBeNull();
  });

  it("the table art, card backs and fonts exist", () => {
    for (const f of ["table/table-bg.jpg", "table/back-player.png", "table/back-encounter.png", "fonts/arkhamicons.ttf", "fonts/arkhamslim.ttf", "fonts/tokens.ttf", "fonts/blood.ttf", "fonts/standalone.ttf", "fonts/Teutonic.ttf", "fonts/Teutonic-RU.ttf", "fonts/Alegreya-Regular.ttf"]) {
      expect(existsSync(`public/${f}`), f).toBe(true);
    }
    expect(hasAlpha("public/table/back-player.png")).toBe(true);
  });
});
