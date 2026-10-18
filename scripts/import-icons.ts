/**
 * Build the icon sprite from the vector icon sources (run once per new pack; outputs are committed):
 * public/icons/sprite.svg (one <symbol> per icon) and content/icons/icons.json (each symbol's source).
 * The sprite holds every glyph of ArkhamCards' five IcoMoon fonts, the names the code draws (icons.ts, the chaos token
 * layers, rules-text markup), every encounter set and scenario in content, and the manifest's `extra` aliases
 * (alias → icon file, for codes the icon set spells differently). Fails naming any icon with no source.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadContentFromDisk } from "../src/content/node";
import type { ContentError } from "../src/content/loader";
import type { ContentDb } from "../src/engine/types";
import { CHAOS_TOKENS, layersFor } from "../src/ui/ChaosToken";
import { ICON_SOURCES, MARKUP_ICONS, scenarioIcon, type IconSource } from "../src/ui/icons";

const SVG_DIR = "inspired/svg-icons";
const AC = "inspired/ArkhamCards/assets";
export const SPRITE = "public/icons/sprite.svg";
/** the generated campaigns' icons (ADR-0007), loaded with those campaigns */
export const SPRITE_CAMPAIGNS = "public/icons/sprite-campaigns.svg";
export const MANIFEST = "content/icons/icons.json";
/** the IcoMoon fonts the sprite replaces: name → glyph config */
const FONTS: Record<string, string> = { arkhamicons: "arkhamicons-config.json", arkhamslim: "arkhamslim.json", tokens: "tokens.json", blood: "blood.json", standalone: "standalone.json" };
const SOURCE = "ArkhamCards icon set (github.com/zzorba/ArkhamCards: its IcoMoon fonts and their SVG sources). Fan-drawn Fantasy Flight Games symbols, not CC0.";

export interface Manifest {
  source: string;
  extra: Record<string, string>;
  symbols: Record<string, { file: string; set: string }>;
}
export interface IconSymbol {
  id: string;
  viewBox: string;
  body: string;
}

/**
 * Coordinates rounded to a unit of a large box (1/1024 of the icon) or a tenth of a small one: invisible at icon size,
 * about half the bytes. A space keeps "1" and ".3" from merging into one number.
 */
const round = (d: string, scale: number) =>
  d
    .replace(/-?\d*\.\d+/g, (n) => " " + String(Math.round(+n * scale) / scale).replace(/^(-?)0\./, "$1."))
    .replace(/(^|[A-Za-z,]) +/g, "$1")
    .replace(/ +-/g, "-");

/** an icon file reduced to its viewBox and its paths' data (no size, fill, ids or editor metadata) */
export function stripSvg(svg: string): { viewBox: string; body: string } {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  if (!viewBox) throw new Error("no viewBox");
  if (/<(circle|rect|ellipse|line|polyline|polygon|use|image|text)\b|transform=/.test(svg)) throw new Error("only plain <path>s are supported");
  const scale = Math.max(...viewBox.split(/[\s,]+/).slice(2).map(Number)) >= 500 ? 1 : 10;
  const body = [...svg.matchAll(/<path\b[^>]*?\sd="([^"]+)"/g)].map((m) => `<path d="${round(m[1], scale)}"/>`).join("");
  return { viewBox, body };
}

/** every symbol name the code draws: icon layers, chaos token layers, rules-text markup */
export function codeIconNames(): string[] {
  const layers = (Object.values(ICON_SOURCES) as IconSource[]).flatMap((s) => ("glyph" in s ? [s.glyph, ...(s.under ? [s.under.glyph] : [])] : []));
  const tokens = CHAOS_TOKENS.flatMap((t) => layersFor(t)?.map(([g]) => g) ?? []);
  return [...new Set([...layers, ...tokens, ...Object.values(MARKUP_ICONS)])];
}

/** every encounter set and scenario icon content needs */
/** the scenarios of generated campaigns (ADR-0007): their icons are wanted, not required */
const generatedScenarios = (db: ContentDb) => new Set(Object.values(db.campaigns ?? {}).filter((c) => c.generated).flatMap((c) => c.scenarios));
const scenarioNames = (db: ContentDb, ids: string[]) =>
  ids.flatMap((id) => {
    const s = db.scenarios[id];
    return [...s.encounterSets, ...(s.randomEncounterSet ?? []), ...Object.values(s.sideDecks).flat(), scenarioIcon(id)];
  });

export function contentIconNames(db: ContentDb): string[] {
  const generated = generatedScenarios(db);
  // the core pack's sets too (their cards are drawn and shown); the other cycles' sets get an icon when a scenario uses them
  const core = Object.entries(db.encounterSets).filter(([, codes]) => codes.some((c) => db.cards[c]?.pack === "core")).map(([name]) => name);
  return [...new Set([...core, ...scenarioNames(db, Object.keys(db.scenarios).filter((id) => !generated.has(id)))])];
}

/** icons the generated campaigns would like: their scenarios and sets, the ones no hand-written scenario requires */
export function generatedIconNames(db: ContentDb): string[] {
  const required = new Set(contentIconNames(db));
  return [...new Set(scenarioNames(db, [...generatedScenarios(db)]))].filter((n) => !required.has(n));
}

/** a name without a glyph of its own borrows its base name's: Return-to boxes and the parts of a scenario */
export function iconAlias(name: string, has: (n: string) => boolean): string | null {
  const base = name.replace(/^return_to_/, "");
  for (const n of [base, base.replace(/_part_\d+$/, ""), base.replace(/_\d+$/, "")]) if (n !== name && has(n)) return n;
  return null;
}

/** encounter sets of cards in the content that the sprite has no icon for (not an error: only the sets scenarios use need one) */
export function setsWithoutIcon(db: ContentDb, sprite: string[]): string[] {
  const ids = new Set(sprite);
  return Object.keys(db.encounterSets).filter((n) => !ids.has(n)).sort();
}

/** symbol id → source file name (no extension) and the set it comes from: a font's name, or "extra" */
export function symbolSet({ fonts, referenced, extra }: { fonts: Record<string, string[]>; referenced: string[]; extra: Record<string, string> }) {
  const out = new Map<string, { file: string; set: string }>();
  for (const [set, names] of Object.entries(fonts)) for (const n of names) if (!out.has(n)) out.set(n, { file: n, set });
  for (const n of referenced) if (!out.has(n)) out.set(n, { file: n, set: "extra" });
  for (const [alias, file] of Object.entries(extra)) out.set(alias, { file, set: "extra" });
  return out;
}

/** read and strip each symbol's source (`read` gives the SVG text, or null when there is none), sorted by id */
export function buildSymbols(set: Map<string, { file: string }>, read: (file: string) => string | null): IconSymbol[] {
  const missing: string[] = [];
  const out: IconSymbol[] = [];
  for (const [id, { file }] of set) {
    const svg = read(file);
    if (svg === null) missing.push(id);
    else {
      try {
        out.push({ id, ...stripSvg(svg) });
      } catch (e) {
        throw new Error(`${file}: ${(e as Error).message}`);
      }
    }
  }
  if (missing.length) throw new Error(`no icon file for: ${missing.join(", ")}`);
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}

export const spriteSvg = (symbols: IconSymbol[]) =>
  `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.map((s) => `<symbol id="${s.id}" viewBox="${s.viewBox}">${s.body}</symbol>`).join("\n")}\n</svg>\n`;

export const spriteIds = (svg: string) => [...svg.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);

/** content ↔ sprite: every encounter set and scenario has a symbol; the manifest and the sprite list the same ids */
export function checkIcons(db: ContentDb, manifest: Manifest | null, sprite: string[] | null, campaignSprite: string[] = []): ContentError[] {
  if (!manifest || !sprite) return [{ file: MANIFEST, path: "", message: "icon sprite or manifest missing (npm run import:icons)" }];
  // the icons hand-written scenarios need are in the main sprite, drawn from the first screen on
  const main = new Set(sprite);
  const errors: ContentError[] = contentIconNames(db)
    .filter((n) => !main.has(n))
    .map((n) => ({ file: SPRITE, path: n, message: `no icon for encounter set or scenario ${n}` }));
  const ids = new Set([...sprite, ...campaignSprite]);
  for (const id of ids) if (!manifest.symbols[id]) errors.push({ file: MANIFEST, path: id, message: "symbol in the sprite but not in the manifest" });
  for (const id of Object.keys(manifest.symbols)) if (!ids.has(id)) errors.push({ file: SPRITE, path: id, message: "symbol in the manifest but not in the sprite" });
  return errors;
}

async function main() {
  const fonts: Record<string, string[]> = {};
  /** IcoMoon glyph paths (1024 box) for the few font glyphs with no SVG file */
  const fontSvg: Record<string, { svg: string; set: string }> = {};
  for (const [set, cfg] of Object.entries(FONTS)) {
    const icons = (JSON.parse(readFileSync(`${AC}/${cfg}`, "utf8")) as { icons: { icon: { paths: string[]; width?: number }; properties: { name: string } }[] }).icons;
    fonts[set] = icons.map((i) => i.properties.name);
    for (const i of icons) fontSvg[i.properties.name] ??= { svg: `<svg viewBox="0 0 ${i.icon.width ?? 1024} 1024">${i.icon.paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`, set };
  }
  const old: Partial<Manifest> = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
  const extra = old.extra ?? {};
  const { db } = await loadContentFromDisk();
  const svgFile = (file: string) => `${SVG_DIR}/${file}.svg`;
  const glyph = (n: string) => existsSync(svgFile(n)) || !!fontSvg[n];
  // generated campaigns: a glyph when one exists under the name or its base name, else none (check:content notes it)
  const wanted = generatedIconNames(db);
  const aliases: Record<string, string> = {};
  for (const n of wanted.filter((n) => !glyph(n))) {
    const a = iconAlias(n, glyph);
    if (a) aliases[n] = a;
  }
  const read = (file: string) => (existsSync(svgFile(file)) ? readFileSync(svgFile(file), "utf8") : fontSvg[file]?.svg ?? null);
  const set = symbolSet({ fonts, referenced: [...codeIconNames(), ...contentIconNames(db)], extra });
  const symbols = buildSymbols(set, read);
  // the generated campaigns' icons go in a second sprite, fetched when such a campaign is played: the first load stays as it was
  const moreSet = symbolSet({ fonts: {}, referenced: wanted.filter((n) => glyph(n) && !set.has(n)), extra: Object.fromEntries(Object.entries(aliases).filter(([n]) => !set.has(n))) });
  const more = buildSymbols(moreSet, read);
  const sprite = spriteSvg(symbols);
  mkdirSync("content/icons", { recursive: true });
  writeFileSync(SPRITE, sprite);
  writeFileSync(SPRITE_CAMPAIGNS, spriteSvg(more));
  const entry = (from: Map<string, { file: string; set: string }>, id: string) => {
    const { file, set: font } = from.get(id)!;
    return existsSync(svgFile(file)) ? { file: `${file}.svg`, set: font } : { file: `${FONTS[fontSvg[file].set]}#${file}`, set: font };
  };
  const manifest: Manifest = {
    source: SOURCE,
    extra,
    symbols: Object.fromEntries([...symbols.map(({ id }) => [id, entry(set, id)]), ...more.map(({ id }) => [id, entry(moreSet, id)])].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
  console.log(`${symbols.length} symbols, ${(sprite.length / 1024).toFixed(0)} KB → ${SPRITE}; ${more.length} for the generated campaigns → ${SPRITE_CAMPAIGNS}; manifest → ${MANIFEST}`);
  const none = wanted.filter((n) => !glyph(n) && !aliases[n]);
  if (none.length) console.log(`no glyph for ${none.length} names of the generated campaigns: ${none.join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
