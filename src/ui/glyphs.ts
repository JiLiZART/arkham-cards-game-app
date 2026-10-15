import GLYPH_MAP from "./glyphs.generated.json";

/** ArkhamCards' IcoMoon icon fonts (see scripts/extract-assets.sh) */
export type GlyphFont = keyof typeof GLYPH_MAP;

/** CSS font-family of each icon font (see styles.css) */
export const FONT_FAMILY: Record<GlyphFont, string> = {
  arkhamicons: "arkhamicons",
  arkhamslim: "arkhamslim",
  tokens: "arkhamtokens",
  blood: "arkhamblood",
  standalone: "arkhamstandalone",
};

/** lookup order after the preferred font: the shared icon sets first, then the fonts that add their own glyphs */
const ORDER: GlyphFont[] = ["arkhamicons", "arkhamslim", "tokens", "blood", "standalone"];
const map = GLYPH_MAP as Record<GlyphFont, Record<string, number>>;

/** a glyph by name: from the preferred font if it has it, otherwise the first font that does */
export function findGlyph(name: string, prefer: GlyphFont = "arkhamicons"): { ch: string; font: GlyphFont } | null {
  for (const font of [prefer, ...ORDER.filter((f) => f !== prefer)]) {
    const code = map[font][name];
    if (code !== undefined) return { ch: String.fromCodePoint(code), font };
  }
  return null;
}

/** a glyph's character in one font (no fallback) */
export function glyphChar(name: string, font: GlyphFont = "arkhamicons"): string | null {
  const code = map[font][name];
  return code === undefined ? null : String.fromCodePoint(code);
}

/** small icons (text size, small badges) use the slim font, larger ones the full one */
export const fontFor = (size: number): GlyphFont => (size <= 24 ? "arkhamslim" : "arkhamicons");

/** encounter-set / scenario icon by code, from whichever font has it (e.g. "curse_of_the_rougarou" → standalone) */
export const setIcon = (code: string) => findGlyph(code);

/** our markup / concept names → icon-font glyph names */
export const GLYPH_NAMES: Record<string, string> = {
  action: "action", actions: "action", reaction: "reaction", fast: "free", free: "free", per_investigator: "per_investigator",
  bless: "bless", curse: "curse", health: "health", sanity: "sanity", weakness: "weakness", uses: "bullet",
  elderThing: "elder_thing", elderSign: "elder_sign", autoFail: "auto_fail",
};

/** readable symbols used when the icon font can't load */
export const GLYPH_FALLBACK: Record<string, string> = {
  action: "➤", actions: "➤", reaction: "↺", fast: "⚡", free: "⚡", per_investigator: "/inv", bless: "✚", curse: "✖",
  health: "♥", sanity: "✺", weakness: "!", uses: "◆", willpower: "Will", intellect: "Int", combat: "Com", agility: "Agi", wild: "?",
  guardian: "Gua", seeker: "See", rogue: "Rog", mystic: "Mys", survivor: "Sur", neutral: "Neu",
  skull: "☠", cultist: "Cult", tablet: "Tab", elder_thing: "ElTh", elder_sign: "✶", auto_fail: "✖",
};

/**
 * HTML for an inline glyph (rules text): the slim font at text size, with a fallback symbol next to it;
 * CSS shows one of the two (`html.no-icon-font` switches to the fallback when the fonts fail to load).
 */
export function glyphHtml(key: string, title = key.replace(/_/g, " "), color?: string): string | null {
  const g = findGlyph(GLYPH_NAMES[key] ?? key, "arkhamslim");
  if (!g) return null;
  const fb = GLYPH_FALLBACK[key] ?? GLYPH_FALLBACK[GLYPH_NAMES[key] ?? key] ?? key;
  const style = `font-family:${FONT_FAMILY[g.font]}${color ? `;color:${color}` : ""}`;
  return `<span class="gl" title="${title}" role="img" aria-label="${title}"><span class="gl-i" aria-hidden="true" style="${style}">${g.ch}</span><span class="gl-fb" aria-hidden="true">${fb}</span></span>`;
}

/** load the icon fonts once; if they fail, switch every glyph to its fallback symbol */
export function watchIconFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  Promise.all(["arkhamicons", "arkhamslim", "arkhamtokens"].map((f) => document.fonts.load(`16px ${f}`)))
    .then((faces) => {
      if (faces.some((f) => f.length === 0)) document.documentElement.classList.add("no-icon-font");
    })
    .catch(() => document.documentElement.classList.add("no-icon-font"));
}
