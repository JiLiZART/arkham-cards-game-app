import GLYPH_MAP from "./glyphs.generated.json";

/** icon-font glyphs (ArkhamCards' IcoMoon fonts, see scripts/extract-assets.sh) */
export type GlyphFont = keyof typeof GLYPH_MAP;

export function glyphChar(name: string, font: GlyphFont = "arkhamicons"): string | null {
  const code = (GLYPH_MAP[font] as Record<string, number>)[name];
  return code === undefined ? null : String.fromCodePoint(code);
}

/** our markup / concept names → arkhamicons glyph names */
export const GLYPH_NAMES: Record<string, string> = {
  action: "action", actions: "action", reaction: "reaction", fast: "free", free: "free", per_investigator: "per_investigator",
  bless: "bless", curse: "curse", health: "health", sanity: "sanity", weakness: "weakness", uses: "bullet",
};

/** readable symbols used when the icon font can't load */
export const GLYPH_FALLBACK: Record<string, string> = {
  action: "➤", actions: "➤", reaction: "↺", fast: "⚡", free: "⚡", per_investigator: "/inv", bless: "✚", curse: "✖",
  health: "♥", sanity: "✺", weakness: "!", uses: "◆",
};

/**
 * HTML for an icon-font glyph with its fallback symbol next to it; CSS shows one of the two
 * (`html.no-icon-font` switches to the fallback when the font fails to load).
 */
export function glyphHtml(key: string, title = key.replace(/_/g, " ")): string | null {
  const ch = glyphChar(GLYPH_NAMES[key] ?? key);
  if (!ch) return null;
  const fb = GLYPH_FALLBACK[key] ?? key;
  return `<span class="gl" title="${title}" role="img" aria-label="${title}"><span class="gl-i" aria-hidden="true">${ch}</span><span class="gl-fb" aria-hidden="true">${fb}</span></span>`;
}

/** load the icon fonts once; if they fail, switch every glyph to its fallback symbol */
export function watchIconFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  Promise.all([document.fonts.load("16px arkhamicons"), document.fonts.load("16px arkhamtokens")])
    .then((faces) => {
      if (faces.some((f) => f.length === 0)) document.documentElement.classList.add("no-icon-font");
    })
    .catch(() => document.documentElement.classList.add("no-icon-font"));
}
