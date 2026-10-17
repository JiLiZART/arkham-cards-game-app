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
export function contentIconNames(db: ContentDb): string[] {
  const sets = Object.values(db.scenarios).flatMap((s) => [...s.encounterSets, ...(s.randomEncounterSet ?? []), ...Object.values(s.sideDecks).flat()]);
  return [...new Set([...Object.keys(db.encounterSets), ...sets, ...Object.keys(db.scenarios).map(scenarioIcon)])];
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
export function checkIcons(db: ContentDb, manifest: Manifest | null, sprite: string[] | null): ContentError[] {
  if (!manifest || !sprite) return [{ file: MANIFEST, path: "", message: "icon sprite or manifest missing (npm run import:icons)" }];
  const ids = new Set(sprite);
  const errors: ContentError[] = contentIconNames(db)
    .filter((n) => !ids.has(n))
    .map((n) => ({ file: SPRITE, path: n, message: `no icon for encounter set or scenario ${n}` }));
  for (const id of sprite) if (!manifest.symbols[id]) errors.push({ file: MANIFEST, path: id, message: "symbol in the sprite but not in the manifest" });
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
  const set = symbolSet({ fonts, referenced: [...codeIconNames(), ...contentIconNames(db)], extra });
  const svgFile = (file: string) => `${SVG_DIR}/${file}.svg`;
  const symbols = buildSymbols(set, (file) => (existsSync(svgFile(file)) ? readFileSync(svgFile(file), "utf8") : fontSvg[file]?.svg ?? null));
  const sprite = spriteSvg(symbols);
  mkdirSync("content/icons", { recursive: true });
  writeFileSync(SPRITE, sprite);
  const manifest: Manifest = {
    source: SOURCE,
    extra,
    symbols: Object.fromEntries(
      symbols.map(({ id }) => {
        const { file, set: from } = set.get(id)!;
        return [id, existsSync(svgFile(file)) ? { file: `${file}.svg`, set: from } : { file: `${FONTS[fontSvg[file].set]}#${file}`, set: from }];
      }),
    ),
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
  console.log(`${symbols.length} symbols, ${(sprite.length / 1024).toFixed(0)} KB → ${SPRITE}; manifest → ${MANIFEST}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
