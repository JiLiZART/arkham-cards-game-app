import type { CardScript, ContentDb } from "../engine/types";
import { addCardText, addPack, buildContent, TEXT_FILE, textLayer, type ContentError } from "./loader";

/**
 * Content bundled by Vite: every JSON and script under /content is picked up automatically, except the card packs other
 * than the core one: those are named at build time and fetched when something asks for them (`loadPack`), so the first
 * load doesn't grow with the number of cycles. A scenario of another cycle needs its pack eager: add it to the two
 * patterns below (Vite wants them literal).
 */
const PACK_FILE = /^\/content\/packs\/([^/]+)\/cards(\.generated)?\.json$/;
// the Russian image import's manifest and review overrides and the icon manifest are tooling data, not game content
const files = import.meta.glob(["/content/**/*.json", "!/content/i18n/*/images*.json", "!/content/icons/*.json", "!/content/packs/*/cards*.json", "!/content/i18n/*/packs/*.json"], { eager: true, import: "default" }) as Record<string, unknown>;
const eagerPacks = import.meta.glob("/content/packs/core/cards*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const lazyPacks = import.meta.glob(["/content/packs/*/cards*.json", "!/content/packs/core/cards*.json"], { import: "default" }) as Record<string, () => Promise<unknown>>;
// the other packs' card text in each locale: loaded with the pack
const lazyText = import.meta.glob("/content/i18n/*/packs/*.json", { import: "default" }) as Record<string, () => Promise<unknown>>;
const scripts = import.meta.glob("/content/**/scripts/*.ts", { eager: true, import: "default" }) as Record<string, CardScript>;

const lazyNames = [...new Set(Object.keys(lazyPacks).map((f) => f.match(PACK_FILE)![1]))].sort();
const built = buildContent({ ...files, ...eagerPacks }, scripts, lazyNames);

export const content: ContentDb = built.db;
export const contentErrors: ContentError[] = built.errors;

const loading = new Map<string, Promise<ContentError[]>>();
/** bring a pack of cards into the content (deck editing, card lookup); loading it twice does nothing. Resolves with its content errors. */
export function loadPack(pack: string): Promise<ContentError[]> {
  const info = content.packs[pack];
  if (!info) return Promise.reject(new Error(`unknown pack ${pack}`));
  if (info.loaded) return Promise.resolve([]);
  let p = loading.get(pack);
  if (!p) {
    p = (async () => {
      const [generated, overrides] = await Promise.all([lazyPacks[`/content/packs/${pack}/cards.generated.json`]?.(), lazyPacks[`/content/packs/${pack}/cards.json`]?.()]);
      const errors = addPack(content, pack, generated ?? [], overrides ?? {});
      // its card text in every locale that has some, imported then print-matched, under whatever a higher layer already holds
      const text = Object.entries(lazyText).map(([file, load]) => ({ file, load, m: file.match(TEXT_FILE)! })).filter((t) => t.m[3] === pack).sort((a, b) => textLayer(a.m[4]) - textLayer(b.m[4]));
      for (const t of text) errors.push(...addCardText(content, t.m[1], t.file, await t.load(), textLayer(t.m[4]), true));
      return errors;
    })().finally(() => loading.delete(pack));
    loading.set(pack, p);
  }
  return p;
}
