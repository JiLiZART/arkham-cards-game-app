import type { CardScript, ContentDb } from "../engine/types";
import { addCampaignFiles, addCardText, addPack, buildContent, packOfCode, TEXT_FILE, textLayer, type ContentError } from "./loader";

/**
 * Content bundled by Vite: every JSON and script under /content is picked up automatically, except the card packs other
 * than the core one: those are named at build time and fetched when something asks for them (`loadPack`), so the first
 * load doesn't grow with the number of cycles. A scenario of another cycle needs its pack eager: add it to the two
 * patterns below (Vite wants them literal).
 */
const PACK_FILE = /^\/content\/packs\/([^/]+)\/cards(\.generated)?\.json$/;
// the Russian image import's manifest and review overrides and the icon manifest are tooling data, not game content
const files = import.meta.glob(
  ["/content/**/*.json", "!/content/i18n/*/images*.json", "!/content/icons/*.json", "!/content/packs/*/cards*.json", "!/content/i18n/*/packs/*.json", "!/content/campaigns-generated/*/scenarios/*.json", "!/content/i18n/*/campaign-texts/*.json"],
  { eager: true, import: "default" },
) as Record<string, unknown>;
const eagerPacks = import.meta.glob("/content/packs/core/cards*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const lazyPacks = import.meta.glob(["/content/packs/*/cards*.json", "!/content/packs/core/cards*.json"], { import: "default" }) as Record<string, () => Promise<unknown>>;
// the other packs' card text in each locale: loaded with the pack
const lazyText = import.meta.glob("/content/i18n/*/packs/*.json", { import: "default" }) as Record<string, () => Promise<unknown>>;
// the generated campaigns' scenarios and text (ADR-0007): loaded when one is chosen
const lazyCampaignFiles = import.meta.glob(["/content/campaigns-generated/*/scenarios/*.json", "/content/i18n/*/campaign-texts/*.json"], { import: "default" }) as Record<string, () => Promise<unknown>>;
const scripts = import.meta.glob("/content/**/scripts/*.ts", { eager: true, import: "default" }) as Record<string, CardScript>;

const lazyNames = [...new Set(Object.keys(lazyPacks).map((f) => f.match(PACK_FILE)![1]))].sort();
const lazyCampaigns = Object.keys(files).flatMap((f) => f.match(/^\/content\/campaigns-generated\/([^/]+)\/campaign\.json$/)?.[1] ?? []);
const built = buildContent({ ...files, ...eagerPacks }, scripts, lazyNames, lazyCampaigns);

export const content: ContentDb = built.db;
export const contentErrors: ContentError[] = built.errors;

// which pack a card comes from (generated with the investigators): how a deck's packs are found before any is loaded
const packIndex = (files["/content/pack-index.json"] ?? []) as [string, string, string][];
/** the packs some card codes come from, once each, in the order first met */
export const packsOf = (codes: string[]): string[] => [...new Set(codes.flatMap((c) => packOfCode(packIndex, c) ?? []))];

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

/** every pack, in parallel (the catalog); `onProgress` hears how many are in. Resolves with the content errors of all of them */
export async function loadAllPacks(onProgress?: (done: number, total: number) => void): Promise<ContentError[]> {
  const names = Object.keys(content.packs);
  let done = 0;
  onProgress?.(0, names.length);
  const errors = await Promise.all(names.map((p) => loadPack(p).then((e) => (onProgress?.(++done, names.length), e))));
  return errors.flat();
}

/** the packs some cards come from, those not loaded yet, loaded in parallel; resolves with their content errors */
export async function loadPacksFor(codes: string[]): Promise<ContentError[]> {
  const packs = packsOf(codes).filter((p) => content.packs[p] && !content.packs[p].loaded);
  return (await Promise.all(packs.map(loadPack))).flat();
}

const loadingCampaigns = new Map<string, Promise<ContentError[]>>();
/** bring a generated campaign's scenarios and text into the content; a hand-written or loaded campaign resolves at once */
export function loadCampaign(id: string): Promise<ContentError[]> {
  if (!content.campaigns[id]) return Promise.reject(new Error(`unknown campaign ${id}`));
  if (content.campaignsLoaded?.[id] !== false) return Promise.resolve([]);
  let p = loadingCampaigns.get(id);
  if (!p) {
    p = (async () => {
      const mine = Object.entries(lazyCampaignFiles).filter(([f]) => f.startsWith(`/content/campaigns-generated/${id}/`) || f.endsWith(`/campaign-texts/${id}.json`));
      const loaded = Object.fromEntries(await Promise.all(mine.map(async ([f, load]) => [f, await load()] as const)));
      const errors = addCampaignFiles(content, loaded);
      content.campaignsLoaded![id] = true;
      return errors;
    })().finally(() => loadingCampaigns.delete(id));
    loadingCampaigns.set(id, p);
  }
  return p;
}

/** whether a campaign's scenarios are in the content */
export const campaignLoaded = (id: string) => content.campaignsLoaded?.[id] !== false;

