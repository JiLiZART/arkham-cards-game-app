import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHAOS_TOKENS, hasTokenArt, layersFor } from "../components/ChaosToken";
import { spriteIds } from "../../../scripts/import-icons";
import { hasSymbol, ICON_SOURCES, MARKUP_ICONS, registerSymbols, type IconSource } from "./icons";

/** WebP alpha flag: VP8X flags byte bit 4, or VP8L header bit 28 (byte 24, 0x10) */
const hasAlpha = (file: string) => {
  const b = readFileSync(file);
  const chunk = b.toString("ascii", 12, 16);
  return (chunk === "VP8X" && (b[20] & 0x10) !== 0) || (chunk === "VP8L" && (b[24] & 0x10) !== 0);
};

const SPRITE_IDS = spriteIds(readFileSync("public/icons/sprite.svg", "utf8"));
registerSymbols(SPRITE_IDS);

describe("icons", () => {
  it("every icon layer is a sprite symbol, a chaos token or an existing WebP", () => {
    for (const [name, src] of Object.entries(ICON_SOURCES) as [string, IconSource][]) {
      if ("webp" in src) expect(existsSync(`public/icons/${src.webp}.webp`), name).toBe(true);
      else if ("token" in src) expect(hasTokenArt(src.token), name).toBe(true);
      else {
        expect(hasSymbol(src.glyph), name).toBe(true);
        if (src.under) expect(hasSymbol(src.under.glyph), name).toBe(true);
      }
    }
  });

  it("every chaos token is drawn from sprite layers", () => {
    for (const t of CHAOS_TOKENS) {
      expect(layersFor(t), t).not.toBeNull();
      for (const [id] of layersFor(t)!) expect(SPRITE_IDS, `${t}: ${id}`).toContain(id);
    }
  });

  it("an unknown symbol is not in the sprite", () => {
    expect(hasSymbol("made_up_icon")).toBe(false);
  });

  it("WebP art only for the cardboard tokens the sprite doesn't draw and the painted chaos bag; no stacked token art", () => {
    const webps = Object.entries(ICON_SOURCES as Record<string, IconSource>)
      .filter(([, src]) => "webp" in src)
      .map(([n]) => n);
    // cardboard tokens are WebP art, clue and resource stacks included; everything drawn comes from the sprite
    expect(webps.sort()).toEqual([
      "chaosBag",
      "clue",
      "clue-3",
      "connectorBoth",
      "connectorOneWay",
      "damage",
      "doom",
      "horror",
      "lead",
      "resource",
      "resource-3",
      "resource-5",
    ]);
    for (const n of ["health", "sanity"])
      expect("glyph" in (ICON_SOURCES as Record<string, IconSource>)[n], n).toBe(true);
    expect(
      readdirSync("public/icons")
        .filter((f) => f.endsWith(".webp"))
        .sort(),
    ).toEqual([
      "chaos-bag.webp",
      "clue-3.webp",
      "clue.webp",
      "connector-both.webp",
      "connector-one-way.webp",
      "damage.webp",
      "doom.webp",
      "horror.webp",
      "lead.webp",
      "resource-3.webp",
      "resource-5.webp",
      "resource.webp",
    ]);
  });

  it("every remaining WebP icon has a transparent background", () => {
    for (const src of Object.values(ICON_SOURCES) as IconSource[])
      if ("webp" in src) expect(hasAlpha(`public/icons/${src.webp}.webp`), src.webp).toBe(true);
  });

  it("every rules-text markup key names a symbol in the sprite", () => {
    const ids = new Set(spriteIds(readFileSync("public/icons/sprite.svg", "utf8")));
    for (const [k, id] of Object.entries(MARKUP_ICONS)) expect(ids.has(id), k).toBe(true);
  });

  it("the sprite, table art, card backs and card fonts exist", () => {
    for (const f of [
      "table/table-bg.jpg",
      "table/back-player.png",
      "table/back-encounter.png",
      "icons/sprite.svg",
      "fonts/Teutonic.ttf",
      "fonts/Teutonic-RU.ttf",
      "fonts/Alegreya-Regular.ttf",
    ]) {
      expect(existsSync(`public/${f}`), f).toBe(true);
    }
  });
});
