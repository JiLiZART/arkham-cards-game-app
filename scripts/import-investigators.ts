/**
 * Generate an investigator definition for every regular investigator of the ArkhamDB snapshot into
 * content/investigators-generated/<code>.json, and the official starter decks (ArkhamCards' starterDecks.ts)
 * into content/decks-generated/<code>-starter.json. Hand-written files in content/investigators and content/decks win.
 *
 *   npm run import:investigators [-- --root inspired/arkhamdb-json-data] [--starters inspired/ArkhamCards/src/data/deck/starterDecks.ts]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DeckDef, DeckOption, InvestigatorDef } from "../src/content/schema";
import { SNAPSHOT, snapshotTarget } from "./import-cards";

type Raw = Record<string, any>;

export const STARTERS = "inspired/ArkhamCards/src/data/deck/starterDecks.ts";

/** `size:30, card:02006:90060, random:subtype:basicweakness`: card A may be replaced by its alternatives B... */
export function parseRequirements(req: string) {
  const out = { size: undefined as number | undefined, cards: [] as { code: string; alternatives: string[] }[], randomWeakness: false };
  for (const part of req.split(",").map((p) => p.trim())) {
    const [kind, ...rest] = part.split(":");
    if (kind === "size") out.size = Number(rest[0]);
    else if (kind === "card") out.cards.push({ code: rest[0], alternatives: rest.slice(1) });
    else if (kind === "random" && rest.join(":") === "subtype:basicweakness") out.randomWeakness = true;
  }
  return out;
}

const OPTION_KEYS = Object.keys(DeckOption.shape).filter((k) => k !== "raw");

export function mapOption(o: Raw): DeckOption {
  const out: Raw = {};
  const raw: Raw = {};
  for (const [k, v] of Object.entries(o)) (OPTION_KEYS.includes(k) ? out : raw)[k] = v;
  if (Object.keys(raw).length) out.raw = raw;
  return out as DeckOption;
}

/** `subtypeOf` tells weaknesses (fixed ones are in the requirements) from signature cards */
export function mapInvestigator(c: Raw, subtypeOf: (code: string) => string | undefined, names?: NonNullable<InvestigatorDef["names"]>): InvestigatorDef {
  const req = parseRequirements(c.deck_requirements);
  const signatures: string[] = [];
  const weaknesses: string[] = [];
  const alternatives: Record<string, string[]> = {};
  for (const card of req.cards) {
    (subtypeOf(card.code) === "weakness" ? weaknesses : signatures).push(card.code);
    if (card.alternatives.length) alternatives[card.code] = card.alternatives;
  }
  const def: InvestigatorDef = {
    code: c.code,
    name: c.name,
    ...(c.subname ? { subname: c.subname } : {}),
    faction: c.faction_code,
    pack: c._pack ?? c.pack_code, // the content pack (the snapshot's folder), which loadPack takes
    generated: true,
    ...(names && Object.keys(names).length ? { names } : {}),
    signatures,
    weaknesses,
    ...(Object.keys(alternatives).length ? { alternatives } : {}),
    deckSize: req.size ?? 30,
    deckOptions: (c.deck_options ?? []).map(mapOption),
  };
  return InvestigatorDef.parse(def);
}

export function readRecords(root: string): Raw[] {
  const dir = join(root, "pack");
  const records: Raw[] = [];
  for (const folder of readdirSync(dir).sort())
    for (const file of readdirSync(join(dir, folder)).filter((f) => f.endsWith(".json")).sort()) records.push(...(JSON.parse(readFileSync(join(dir, folder, file), "utf8")) as Raw[]).map((r) => ({ ...r, _pack: snapshotTarget(folder, r.pack_code) })));
  return records;
}

/** the regular investigators of the snapshot: not parallel fronts, not hidden, with deckbuilding requirements; `skip` are hand-written codes */
export function readInvestigators(root: string, skip: Set<string> = new Set(), names: Record<string, InvestigatorDef["names"]> = {}): InvestigatorDef[] {
  const records = readRecords(root);
  const subtype = new Map(records.map((r) => [r.code as string, r.subtype_code as string | undefined]));
  return records
    .filter((r) => r.type_code === "investigator" && !r.alternate_of && !r.hidden && r.deck_requirements && !skip.has(r.code))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((r) => mapInvestigator(r, (code) => subtype.get(code), names[r.code]));
}

/** the imported name and subname of each investigator in every language that has pack text: i18n/<locale>/packs/<pack>.generated.json */
export function readNames(i18nRoot: string, codes: Set<string>): Record<string, NonNullable<InvestigatorDef["names"]>> {
  const out: Record<string, NonNullable<InvestigatorDef["names"]>> = {};
  if (!existsSync(i18nRoot)) return out;
  for (const locale of readdirSync(i18nRoot).sort()) {
    const dir = join(i18nRoot, locale, "packs");
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".generated.json")).sort()) {
      const text = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, { name?: string; subname?: string }>;
      for (const [code, tr] of Object.entries(text))
        if (codes.has(code) && tr.name) (out[code] ??= {})[locale] = { name: tr.name, ...(tr.subname ? { subname: tr.subname } : {}) };
    }
  }
  return out;
}

/** the object of investigator code -> slots in ArkhamCards' file (the `meta` entries have no numeric slots and are skipped) */
export function parseStarterDecks(source: string): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [, code, body] of source.matchAll(/'(\d+)':\s*\{([^}]*)\}/g)) {
    const slots = Object.fromEntries([...body.matchAll(/'(\d+)':\s*(\d+)/g)].map(([, c, n]) => [c, Number(n)]));
    if (Object.keys(slots).length) out[code] = slots;
  }
  return out;
}

/** [first code, last code, pack] runs in code order: which pack a card comes from, without loading any (a few hundred bytes for all of them) */
export function buildPackIndex(records: Raw[]): [string, string, string][] {
  const runs: [string, string, string][] = [];
  for (const r of records.filter((r) => r.type_code).sort((a, b) => a.code.localeCompare(b.code))) {
    const last = runs[runs.length - 1];
    if (last && last[2] === r._pack) last[1] = r.code;
    else runs.push([r.code, r.code, r._pack]);
  }
  return runs;
}

/** `01000` is ArkhamDB's "random basic weakness" placeholder */
export function mapStarterDeck(investigator: string, name: string, slots: Record<string, number>, duplicateOf: Record<string, string> = {}): DeckDef {
  const { "01000": placeholder, ...listed } = slots;
  // the 2026 core's lists name its reprint stubs: the content has the original card
  const cards: Record<string, number> = {};
  for (const [code, n] of Object.entries(listed)) cards[duplicateOf[code] ?? code] = (cards[duplicateOf[code] ?? code] ?? 0) + n;
  return DeckDef.parse({ id: `${investigator}-starter`, name: `${name} — Starter`, investigator, cards, randomBasicWeakness: !!placeholder });
}

/** the snapshot can be older than the starter lists: a deck with a card it does not have would not load */
export const completeDecks = (decks: DeckDef[], known: Set<string>) => decks.filter((d) => Object.keys(d.cards).every((c) => known.has(c)));

const handWritten = (dir: string, pick: (j: Raw) => string) =>
  new Set(existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => pick(JSON.parse(readFileSync(join(dir, f), "utf8")))) : []);

function writeAll(dir: string, files: Record<string, unknown>) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, v] of Object.entries(files)) writeFileSync(join(dir, `${name}.json`), JSON.stringify(v, null, 1) + "\n");
}

function main() {
  const args = process.argv.slice(2);
  const arg = (n: string, d: string) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
  const mine = handWritten("content/investigators", (j) => j.code);
  // the translations come from `import:cards -- --locale` / `import:ru-cards`: run those first to have the names
  const wanted = new Set(readInvestigators(arg("root", SNAPSHOT), mine).map((i) => i.code));
  const investigators = readInvestigators(arg("root", SNAPSHOT), mine, readNames("content/i18n", wanted));
  writeAll("content/investigators-generated", Object.fromEntries(investigators.map((i) => [i.code, i])));
  const hasDeck = handWritten("content/decks", (j) => j.investigator);
  const names = new Map(investigators.map((i) => [i.code, i.name!]));
  const starters = parseStarterDecks(readFileSync(arg("starters", STARTERS), "utf8"));
  const records = readRecords(arg("root", SNAPSHOT));
  const known = new Set(records.map((r) => r.code as string));
  const duplicateOf = Object.fromEntries(records.filter((r) => !r.type_code && r.duplicate_of).map((r) => [r.code, r.duplicate_of]));
  const all = Object.entries(starters)
    .filter(([code]) => names.has(code) && !hasDeck.has(code))
    .map(([code, slots]) => mapStarterDeck(code, names.get(code)!, slots, duplicateOf));
  const decks = completeDecks(all, known);
  if (decks.length < all.length) console.log(`left out ${all.length - decks.length} starter decks with cards the snapshot does not have: ${all.filter((d) => !decks.includes(d)).map((d) => d.investigator).join(", ")}`);
  writeAll("content/decks-generated", Object.fromEntries(decks.map((d) => [d.id, d])));
  writeFileSync("content/pack-index.json", JSON.stringify(buildPackIndex(records)) + "\n");
  console.log(`${investigators.length} investigators, ${decks.length} starter decks (hand-written ones untouched)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
