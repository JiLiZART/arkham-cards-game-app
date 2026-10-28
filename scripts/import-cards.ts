/**
 * Import card stats/text from ArkhamDB into content/packs/<pack>/cards.generated.json.
 * Hand-written behavior lives in content/packs/<pack>/cards.json and is never touched.
 *
 *   npm run import:cards -- --pack core [--source arkhamdb|arkham.build] [--file cached.json]
 *   npm run import:cards -- --source arkhamdb-json-data (--all | --cycle dwl) [--root inspired/arkhamdb-json-data]
 *     reads the local ArkhamDB snapshot: one pack per folder under pack/, the core folder's reprints (rcore, core_2026)
 *     and the investigator folder's starter deck boxes (nat, har, …) as packs of their own
 *
 * With --locale <code>, it imports that language's card text from ArkhamDB's localized site instead and writes
 * content/i18n/<code>/cards.generated.json (hand-written content/i18n/<code>/cards.json wins over it field by field).
 * On a network error nothing is written and the old file is kept.
 *
 *   npm run import:cards -- --pack core --locale ru
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CardDef, I18nCards, type CardDefInput } from "../src/content/schema";

const ARKHAMDB_URL = "https://arkhamdb.com/api/public/cards/?encounter=1";

type Raw = Record<string, any>;

const KEYWORDS: [RegExp, CardDefInput["keywords"] extends (infer K)[] | undefined ? K : never][] = [
  [/\bHunter\b/, "hunter"],
  [/\bRetaliate\b/, "retaliate"],
  [/\bAloof\b/, "aloof"],
  [/\bAlert\b/, "alert"],
  [/\bMassive\b/, "massive"],
  [/\bSurge\b/, "surge"],
  [/\bPeril\b/, "peril"],
];

const strip = (s: string) => s.replace(/<\/?[a-z]+>/g, "");

/** keywords appear at line start in ArkhamDB text: "Hunter. Retaliate." / "Fast. ..." */
export function parseKeywords(text: string, type: string): CardDefInput["keywords"] {
  const out = new Set<NonNullable<CardDefInput["keywords"]>[number]>();
  for (const line of strip(text).split("\n")) {
    const kwLine = line.replace(/^[^.]*?Prey[^.]*\.\s*/, "");
    // keyword lines are short sentences made only of keywords
    const parts = kwLine
      .split(".")
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of parts)
      for (const [re, kw] of KEYWORDS) if (re.test(p) && p.split(" ").length <= 2) out.add(kw);
    if (line.trim().startsWith("Fast.") && (type === "event" || type === "asset")) out.add("fast");
  }
  return [...out];
}

export function parseUses(text: string) {
  const m = strip(text).match(/Uses \((\d+) (\w+)\)/);
  return m ? { type: m[2], count: Number(m[1]) } : undefined;
}

export function parseSlots(slot?: string): CardDefInput["slots"] {
  if (!slot) return [];
  const out: NonNullable<CardDefInput["slots"]> = [];
  for (const part of slot
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const m = part.match(/^(\w+)(?: x(\d))?$/);
    if (!m) continue;
    const name = m[1].toLowerCase() as NonNullable<CardDefInput["slots"]>[number];
    for (let i = 0; i < Number(m[2] ?? 1); i++) out.push(name);
  }
  return out;
}

/** ArkhamDB prints X as -2, * as -3, ? as -4 and – as null: none of them is a number */
const num = (v: unknown): number | null => (typeof v === "number" && v >= 0 ? v : null);

export function mapCard(c: Raw): CardDefInput {
  const type = c.type_code as CardDefInput["type"];
  const text: string = c.text ?? "";
  const traits = (c.traits ?? "")
    .split(".")
    .map((t: string) => t.trim())
    .filter(Boolean);
  const card: CardDefInput = {
    code: c.code,
    name: c.name,
    type,
    faction: c.faction_code,
    pack: c.pack_code,
    quantity: c.quantity ?? 1,
    traits,
    text,
    unique: !!c.is_unique,
    doubleSided: !!c.double_sided,
    keywords: parseKeywords(text, type),
    slots: parseSlots(c.real_slot || c.slot),
    icons: {},
  };
  const opt = <K extends keyof CardDefInput>(k: K, v: CardDefInput[K] | null | undefined) => {
    if (v !== undefined && v !== null && v !== "") card[k] = v as CardDefInput[K];
  };
  opt("subname", c.subname);
  opt("backName", c.back_name);
  opt("backText", c.back_text);
  opt("flavor", c.flavor);
  opt("encounterSet", c.encounter_code);
  opt("subtype", c.subtype_code);
  opt("deckLimit", c.deck_limit);
  if (typeof c.tags === "string" && c.tags) card.tags = c.tags.split(".").filter(Boolean);
  opt("xp", c.xp);
  if ("cost" in c) card.cost = c.cost === -2 ? "X" : num(c.cost);
  if (c.faction2_code)
    card.factions = [c.faction_code, c.faction2_code, c.faction3_code].filter(Boolean);
  opt("victory", c.victory);
  for (const s of ["willpower", "intellect", "combat", "agility", "wild"] as const) {
    if (c[`skill_${s}`] && type !== "investigator") card.icons![s] = c[`skill_${s}`];
  }
  if (type === "investigator") {
    const skills = {
      willpower: num(c.skill_willpower),
      intellect: num(c.skill_intellect),
      combat: num(c.skill_combat),
      agility: num(c.skill_agility),
    };
    if (Object.values(skills).every((n) => n !== null))
      card.skills = skills as CardDefInput["skills"];
  }
  if (type === "asset" || type === "investigator") {
    opt("health", c.health);
    opt("sanity", c.sanity);
  }
  opt("uses", parseUses(text));
  if (type === "enemy" || type === "enemy_location") {
    card.enemy = {
      fight: num(c.enemy_fight),
      health: num(c.health),
      healthPerInvestigator: !!c.health_per_investigator,
      evade: num(c.enemy_evade),
      damage: c.enemy_damage ?? 0,
      horror: c.enemy_horror ?? 0,
    };
    const spawn = strip(text).match(/Spawn - ([^.]+)\./);
    if (spawn)
      card.spawn =
        spawn[1] === "Any empty location"
          ? "emptyLocation"
          : /^engaged with prey$/i.test(spawn[1])
            ? "Engaged with Prey"
            : spawn[1];
  }
  if (type === "location" || type === "enemy_location") {
    if (typeof c.shroud === "number") card.shroud = num(c.shroud);
    card.clues = c.clues ?? 0;
    card.cluesPerInvestigator = !c.clues_fixed && (c.clues ?? 0) > 0;
  }
  if (type === "act") {
    opt("stage", c.stage);
    // a * threshold (-3) is in the text, not a number
    if (c.clues > 0) {
      card.actClues = c.clues;
      card.actCluesPerInvestigator = !c.clues_fixed;
    }
  }
  if (type === "agenda") {
    opt("stage", c.stage);
    opt("doom", num(c.doom));
  }
  if (type === "treachery" && card.keywords!.length === 0)
    card.keywords = parseKeywords(text, type);
  return card;
}

export async function fetchCards(source: string, file?: string, locale?: string): Promise<Raw[]> {
  if (file) return JSON.parse(readFileSync(file, "utf8"));
  if (source === "arkham.build")
    throw new Error("arkham.build source: pass --file with a downloaded cache (format differs)");
  const res = await fetch(
    locale ? ARKHAMDB_URL.replace("://arkhamdb.com", `://${locale}.arkhamdb.com`) : ARKHAMDB_URL,
  );
  if (!res.ok) throw new Error(`ArkhamDB ${res.status}`);
  return res.json();
}

// ---------- the local ArkhamDB snapshot (inspired/arkhamdb-json-data) ----------
export const SNAPSHOT = "inspired/arkhamdb-json-data";

/** the snapshot folders split into a pack per ArkhamDB pack code */
const SPLIT = new Set(["core", "investigator"]);

/**
 * The pack a snapshot record goes to: its folder under `pack/`, except in two folders split by pack code: the core
 * folder, whose reprints (the revised core and the 2026 core) are packs of their own, so the core pack stays the
 * original set the scenarios are written for, and the investigator folder, one pack per starter deck box (`nat`, `har`…).
 */
export function snapshotTarget(folder: string, packCode: string): string {
  return SPLIT.has(folder) ? packCode : folder;
}

/**
 * Every pack of the snapshot (one folder = one pack; `cycle` limits it to one), records sorted by code. Left out: the
 * bare reprint stubs (a code pointing at the original, no name or type) and ArkhamDB's "Random Basic Weakness" placeholder.
 */
export function readSnapshot(root: string, cycle?: string): Map<string, Raw[]> {
  const dir = join(root, "pack");
  const folders = readdirSync(dir).sort();
  if (cycle && !folders.includes(cycle))
    throw new Error(`no cycle ${cycle} in ${dir}; there are: ${folders.join(", ")}`);
  const packs = new Map<string, Raw[]>();
  for (const folder of cycle ? [cycle] : folders) {
    for (const file of readdirSync(join(dir, folder))
      .filter((f) => f.endsWith(".json"))
      .sort()) {
      for (const c of JSON.parse(readFileSync(join(dir, folder, file), "utf8")) as Raw[]) {
        if (!c.type_code || c.code === "01000") continue;
        const target = snapshotTarget(folder, c.pack_code);
        if (!packs.has(target)) packs.set(target, []);
        packs.get(target)!.push(c);
      }
    }
  }
  for (const list of packs.values()) list.sort((a, b) => a.code.localeCompare(b.code));
  return packs;
}

/** map a pack's records; the ones that fail the schema are reported with their codes instead of stopping the import */
export function mapSnapshotPack(raw: Raw[]): {
  cards: CardDefInput[];
  problems: { code: string; message: string }[];
} {
  const cards: CardDefInput[] = [];
  const problems: { code: string; message: string }[] = [];
  for (const r of raw) {
    const card = mapCard(r);
    const parsed = CardDef.safeParse(card);
    if (parsed.success) cards.push(card);
    else
      problems.push({
        code: r.code,
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
  }
  return { cards, problems };
}

function writePack(pack: string, cards: CardDefInput[]) {
  const dir = join("content", "packs", pack);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cards.generated.json"), JSON.stringify(cards, null, 1) + "\n");
  const overrides = join(dir, "cards.json");
  if (!existsSync(overrides)) writeFileSync(overrides, "{}\n");
  return dir;
}

function importSnapshot(root: string, cycle: string | undefined) {
  const packs = readSnapshot(root, cycle);
  let failed = 0;
  for (const [pack, raw] of packs) {
    const { cards, problems } = mapSnapshotPack(raw);
    writePack(pack, cards);
    console.log(
      `${pack}: ${cards.length} cards${problems.length ? `, ${problems.length} failed the schema` : ""}`,
    );
    for (const p of problems) console.error(`  ${pack} ${p.code}: ${p.message}`);
    failed += problems.length;
  }
  console.log(
    `${packs.size} packs, ${[...packs.values()].reduce((n, l) => n + l.length, 0)} records from ${root} (overrides untouched)`,
  );
  if (failed) process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (n: string, d?: string) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : d;
  };
  // the local snapshot: --source arkhamdb-json-data with --all or --cycle <folder>
  if (arg("source") === "arkhamdb-json-data")
    return importSnapshot(
      arg("root", SNAPSHOT)!,
      args.includes("--all") ? undefined : arg("cycle"),
    );
  const pack = arg("pack", "core")!;
  const locale = arg("locale");
  const raw = await fetchCards(arg("source", "arkhamdb")!, arg("file"), locale);
  // only the pack's own printing (ArkhamDB lists reprints like 98004 under core)
  const prefix = { core: "01" }[pack as "core"];
  const own = raw.filter(
    (c) => c.pack_code === pack && (!prefix || c.code.startsWith(prefix)) && c.code !== "01000",
  );
  if (locale) return writeTranslations(locale, own);
  const cards = own.map(mapCard).sort((a, b) => a.code.localeCompare(b.code));
  for (const c of cards) CardDef.parse(c); // fail loudly on mapping bugs
  const dir = join("content", "packs", pack);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cards.generated.json"), JSON.stringify(cards, null, 1) + "\n");
  const overrides = join(dir, "cards.json");
  if (!existsSync(overrides)) writeFileSync(overrides, "{}\n");
  console.log(`wrote ${cards.length} cards to ${dir}/cards.generated.json (overrides untouched)`);
}

/** translated name/subname/traits/text per card; fields equal to English are left out so English stays the fallback */
export function mapTranslation(c: Raw): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const put = (k: string, v: unknown, en: unknown) => {
    if (v !== undefined && v !== null && v !== "" && v !== en) out[k] = v;
  };
  put("name", c.name, c.real_name);
  put("subname", c.subname, c.real_subname);
  put("backName", c.back_name, c.real_back_name);
  put("text", c.text, c.real_text);
  put("backText", c.back_text, c.real_back_text);
  if (c.traits && c.traits !== c.real_traits)
    out.traits = (c.traits as string)
      .split(".")
      .map((t) => t.trim())
      .filter(Boolean);
  return out;
}

function writeTranslations(locale: string, cards: Raw[]) {
  const dir = join("content", "i18n", locale);
  if (!existsSync(dir)) throw new Error(`${dir} does not exist`);
  const out: Record<string, unknown> = {};
  for (const c of [...cards].sort((a, b) => a.code.localeCompare(b.code))) {
    const tr = mapTranslation(c);
    if (Object.keys(tr).length) out[c.code] = tr;
  }
  I18nCards.parse(out);
  writeFileSync(join(dir, "cards.generated.json"), JSON.stringify(out, null, 1) + "\n");
  console.log(
    `wrote ${Object.keys(out).length} ${locale} card translations to ${dir}/cards.generated.json (cards.json untouched)`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
