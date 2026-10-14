/**
 * Import card stats/text from ArkhamDB into content/packs/<pack>/cards.generated.json.
 * Hand-written behavior lives in content/packs/<pack>/cards.json and is never touched.
 *
 *   npm run import:cards -- --pack core [--source arkhamdb|arkham.build] [--file cached.json]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CardDef, type CardDefInput } from "../src/content/schema";

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
    const parts = kwLine.split(".").map((p) => p.trim()).filter(Boolean);
    for (const p of parts) for (const [re, kw] of KEYWORDS) if (re.test(p) && p.split(" ").length <= 2) out.add(kw);
    if (/^Fast\./.test(line.trim()) && (type === "event" || type === "asset")) out.add("fast");
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
  for (const part of slot.split(".").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\w+)(?: x(\d))?$/);
    if (!m) continue;
    const name = m[1].toLowerCase() as NonNullable<CardDefInput["slots"]>[number];
    for (let i = 0; i < Number(m[2] ?? 1); i++) out.push(name);
  }
  return out;
}

export function mapCard(c: Raw): CardDefInput {
  const type = c.type_code as CardDefInput["type"];
  const text: string = c.text ?? "";
  const traits = (c.traits ?? "").split(".").map((t: string) => t.trim()).filter(Boolean);
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
  opt("xp", c.xp);
  if ("cost" in c) card.cost = c.cost;
  opt("victory", c.victory);
  for (const s of ["willpower", "intellect", "combat", "agility", "wild"] as const) {
    if (c[`skill_${s}`] && type !== "investigator") card.icons![s] = c[`skill_${s}`];
  }
  if (type === "investigator") {
    card.skills = { willpower: c.skill_willpower, intellect: c.skill_intellect, combat: c.skill_combat, agility: c.skill_agility };
  }
  if (type === "asset" || type === "investigator") {
    opt("health", c.health);
    opt("sanity", c.sanity);
  }
  opt("uses", parseUses(text));
  if (type === "enemy") {
    card.enemy = {
      fight: c.enemy_fight ?? 0,
      health: c.health ?? 0,
      healthPerInvestigator: !!c.health_per_investigator,
      evade: c.enemy_evade ?? 0,
      damage: c.enemy_damage ?? 0,
      horror: c.enemy_horror ?? 0,
    };
    const spawn = strip(text).match(/Spawn - ([^.]+)\./);
    if (spawn) card.spawn = spawn[1] === "Any empty location" ? "emptyLocation" : spawn[1];
  }
  if (type === "location") {
    opt("shroud", c.shroud);
    card.clues = c.clues ?? 0;
    card.cluesPerInvestigator = !c.clues_fixed && (c.clues ?? 0) > 0;
  }
  if (type === "act") {
    opt("stage", c.stage);
    if (c.clues) {
      card.actClues = c.clues;
      card.actCluesPerInvestigator = !c.clues_fixed;
    }
  }
  if (type === "agenda") {
    opt("stage", c.stage);
    opt("doom", c.doom);
  }
  if (type === "treachery" && card.keywords!.length === 0) card.keywords = parseKeywords(text, type);
  return card;
}

export async function fetchCards(source: string, file?: string): Promise<Raw[]> {
  if (file) return JSON.parse(readFileSync(file, "utf8"));
  if (source === "arkham.build") throw new Error("arkham.build source: pass --file with a downloaded cache (format differs)");
  const res = await fetch(ARKHAMDB_URL);
  if (!res.ok) throw new Error(`ArkhamDB ${res.status}`);
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (n: string, d?: string) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : d;
  };
  const pack = arg("pack", "core")!;
  const raw = await fetchCards(arg("source", "arkhamdb")!, arg("file"));
  // only the pack's own printing (ArkhamDB lists reprints like 98004 under core)
  const prefix = { core: "01" }[pack as "core"];
  const cards = raw
    .filter((c) => c.pack_code === pack && (!prefix || c.code.startsWith(prefix)) && c.code !== "01000")
    .map(mapCard)
    .sort((a, b) => a.code.localeCompare(b.code));
  for (const c of cards) CardDef.parse(c); // fail loudly on mapping bugs
  const dir = join("content", "packs", pack);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cards.generated.json"), JSON.stringify(cards, null, 1) + "\n");
  const overrides = join(dir, "cards.json");
  if (!existsSync(overrides)) writeFileSync(overrides, "{}\n");
  console.log(`wrote ${cards.length} cards to ${dir}/cards.generated.json (overrides untouched)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => {
  console.error(e);
  process.exit(1);
});
