import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentDb } from "../src/engine/types";
import { readSnapshot, SNAPSHOT } from "./import-cards";

type Raw = Record<string, any>;

/**
 * One card's translation from the ArkhamDB snapshot, in our i18n shape: name, subname, back name, text, back text, and
 * traits as a list. Flavour text is left out (the game never shows it), and so is anything empty or equal to English,
 * so that English stays the fallback.
 */
export function mapSnapshotTranslation(tr: Raw, en: Raw): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const put = (to: string, from: string) => {
    if (tr[from] && tr[from] !== en[from]) out[to] = tr[from];
  };
  put("name", "name");
  put("subname", "subname");
  put("backName", "back_name");
  put("text", "text");
  put("backText", "back_text");
  if (tr.traits && tr.traits !== en.traits) out.traits = (tr.traits as string).split(".").map((t) => t.trim()).filter(Boolean);
  return out;
}

/**
 * A locale's card translations from `translations/<locale>/pack/<folder>/*.json`, grouped by the pack the English card
 * goes to (the same grouping as import:cards). Translations of codes the English data lacks are dropped.
 */
export function translationsByPack(root: string, locale: string): Map<string, Record<string, Record<string, unknown>>> {
  const english = new Map<string, { pack: string; card: Raw }>();
  for (const [pack, cards] of readSnapshot(root)) for (const card of cards) english.set(card.code, { pack, card });
  const dir = join(root, "translations", locale, "pack");
  if (!existsSync(dir)) throw new Error(`no translations for ${locale} in ${dir}; there are: ${readdirSync(join(root, "translations")).join(", ")}`);
  const out = new Map<string, Record<string, Record<string, unknown>>>();
  for (const folder of readdirSync(dir).sort()) {
    for (const file of readdirSync(join(dir, folder)).filter((f) => f.endsWith(".json")).sort()) {
      for (const tr of JSON.parse(readFileSync(join(dir, folder, file), "utf8")) as Raw[]) {
        const en = english.get(tr.code);
        if (!en) continue;
        const mapped = mapSnapshotTranslation(tr, en.card);
        if (!Object.keys(mapped).length) continue;
        if (!out.has(en.pack)) out.set(en.pack, {});
        out.get(en.pack)![tr.code] = mapped;
      }
    }
  }
  for (const [pack, cards] of out) out.set(pack, Object.fromEntries(Object.entries(cards).sort(([a], [b]) => a.localeCompare(b))));
  return out;
}

/** per pack: how many cards there are and how many have a translated name in the locale */
export function cycleCoverage(db: ContentDb, locale: string): { pack: string; cards: number; translated: number }[] {
  const text = db.i18n[locale]?.cards ?? {};
  return Object.entries(db.packs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pack, p]) => ({ pack, cards: p.cards.length, translated: p.cards.filter((c) => text[c]?.name).length }));
}

export { SNAPSHOT };
