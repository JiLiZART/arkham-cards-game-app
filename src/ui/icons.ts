import { asset } from "./images";

/**
 * The one place that maps game concepts to icon sources. Sprite symbols come first (public/icons/sprite.svg, from
 * scripts/import-icons.ts: sharp at any size, coloured like the printed icons); PNG art (public/icons, from
 * scripts/extract-assets.sh) only for what the icon set doesn't draw: the damage, horror and doom tokens, the lead
 * token and the connector plaques.
 */

/** a sprite symbol drawn in a colour, optionally over a silhouette layer (printed skill boxes, health and sanity) */
export interface GlyphSource {
  glyph: string;
  color: string;
  under?: { glyph: string; color: string };
  /** width / height of the icon box when the symbol isn't square (the sanity brain is wide) */
  aspect?: number;
}
export type IconSource = { png: string } | GlyphSource | { token: string };

/** printed colours (ArkhamCards' palette), brightened a little for the dark HUD */
export const SKILL_COLORS = { willpower: "#2C7FC0", intellect: "#9a4a8a", combat: "#c0392b", agility: "#1f9d3a", wild: "#8a7a3a" } as const;
export const CLASS_COLORS = { guardian: "#2b80c5", seeker: "#ec8426", rogue: "#1b9a2a", mystic: "#6f5ce0", survivor: "#cc3038", neutral: "#9a9a9a" } as const;

const skill = (s: keyof typeof SKILL_COLORS): GlyphSource => ({ glyph: `skill_${s}_inverted`, color: "#fff", under: { glyph: `skill_${s}`, color: SKILL_COLORS[s] } });
const klass = (c: keyof typeof CLASS_COLORS): GlyphSource => ({ glyph: c, color: CLASS_COLORS[c] });
const ink = (glyph: string): GlyphSource => ({ glyph, color: "#e6dcc3" });

export const ICON_SOURCES = {
  willpower: skill("willpower"), intellect: skill("intellect"), combat: skill("combat"), agility: skill("agility"), wild: skill("wild"),
  guardian: klass("guardian"), seeker: klass("seeker"), rogue: klass("rogue"), mystic: klass("mystic"), survivor: klass("survivor"), neutral: klass("neutral"),
  health: { glyph: "health", color: "#ffe9e2", under: { glyph: "health_inverted", color: "#b3261e" } },
  sanity: { glyph: "sanity", color: "#e6eeff", under: { glyph: "sanity_inverted", color: "#2f5fb3" }, aspect: 1.35 },
  hand: ink("hand"), hands: ink("hand_x2"), arcane: ink("arcane"), arcane2: ink("arcane_x2"), accessory: ink("accessory"), body: ink("body"), ally: ink("ally"),
  skull: { token: "skull" }, cultist: { token: "cultist" }, tablet: { token: "tablet" }, elderThing: { token: "elderThing" }, elderSign: { token: "elderSign" }, autoFail: { token: "autoFail" },
  "+1": { token: "+1" }, "-1": { token: "-1" },
  resource: { glyph: "resource", color: "#d99a3a" }, clue: { glyph: "clue", color: "#3aa39b" }, chaosBag: { glyph: "chaos_bag", color: "#7a5230" },
  damage: { png: "damage" }, horror: { png: "horror" }, doom: { png: "doom" },
  lead: { png: "lead" }, connectorBoth: { png: "connector-both" }, connectorOneWay: { png: "connector-one-way" },
} satisfies Record<string, IconSource>;
export type IconName = keyof typeof ICON_SOURCES;

/** readable text used when an icon can't be drawn */
export const ICON_LABELS: Record<IconName, string> = {
  willpower: "Will", intellect: "Int", combat: "Com", agility: "Agi", wild: "?",
  guardian: "Gua", seeker: "See", rogue: "Rog", mystic: "Mys", survivor: "Sur", neutral: "Neu",
  health: "HP", sanity: "San", hand: "Hand", hands: "Hands", arcane: "Arc", arcane2: "Arc×2", accessory: "Acc", body: "Body", ally: "Ally",
  skull: "Skull", cultist: "Cult", tablet: "Tab", elderThing: "ElTh", elderSign: "ElSi", autoFail: "Fail", "+1": "+1", "-1": "−1",
  damage: "Dmg", horror: "Hor", clue: "Clue", doom: "Doom", resource: "Res",
  lead: "Lead", chaosBag: "Bag", connectorBoth: "↔", connectorOneWay: "→",
};

export const isIcon = (name: string): name is IconName => name in ICON_SOURCES;
export const iconSource = (name: IconName): IconSource => ICON_SOURCES[name];
/** URL of a PNG icon (only for the art the sprite doesn't have) */
export const iconUrl = (name: IconName) => {
  const s = ICON_SOURCES[name] as IconSource;
  if (!("png" in s)) throw new Error(`${name} is drawn from the sprite, not a PNG`);
  return asset(`icons/${s.png}.png`);
};

/** ArkhamDB rules-text markup key → sprite symbol; markup not listed here shows as text */
export const MARKUP_ICONS: Record<string, string> = {
  ...Object.fromEntries(
    ["willpower", "intellect", "combat", "agility", "wild", "skull", "cultist", "tablet", "elder_thing", "elder_sign", "auto_fail", "bless", "curse", "frost",
      "guardian", "seeker", "rogue", "mystic", "survivor", "action", "reaction", "free", "per_investigator", "unique", "weakness"].map((k) => [k, k]),
  ),
  fast: "free",
};
/** the printed colour of a markup icon (skills and classes), else none: it takes the text colour */
export const markupColor = (key: string): string | undefined => (SKILL_COLORS as Record<string, string>)[key] ?? (CLASS_COLORS as Record<string, string>)[key];

/** a scenario's icon: the scenario id spelled like the icon set ("the-gathering" → "the_gathering") */
export const scenarioIcon = (scenarioId: string) => scenarioId.replace(/-/g, "_");

/** ids of the sprite's symbols, known once the sprite is loaded */
const symbols = new Set<string>();
export const hasSymbol = (id: string) => symbols.has(id);
export const registerSymbols = (ids: Iterable<string>) => {
  for (const id of ids) symbols.add(id);
};

/**
 * Fetch the icon sprite (the browser caches it) and inject it as a hidden <svg>, so every `<use href="#id">` is
 * same-document. main.tsx waits for it before the first screen renders: no icon is ever drawn blank.
 */
export async function loadSprite() {
  const res = await fetch(asset("icons/sprite.svg"));
  if (!res.ok) throw new Error(`icon sprite: HTTP ${res.status}`);
  const host = document.createElement("div");
  host.innerHTML = await res.text();
  const svg = host.querySelector("svg");
  if (!svg) throw new Error("icon sprite: no <svg>");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  document.body.prepend(svg);
  registerSymbols([...svg.querySelectorAll("symbol")].map((s) => s.id));
}
