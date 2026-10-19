/** the new-game wizard's state: pure, so the order and back rules are tested without React */
import { campaignName, cardText, t } from "../../content/i18n";
import type { CampaignDef, DeckDef, Difficulty } from "../../content/schema";
import { packsOf } from "../../content";
import { packLoaded } from "../../content/loader";
import type { ContentDb } from "../../engine/types";
import { customDecks, deckTabs, type SavedDeck } from "../decks";
import type { Storage } from "../store";

export const STEPS = ["campaign", "investigators", "decks", "difficulty", "ready"] as const;
export type Step = (typeof STEPS)[number];
/** most investigators in a game */
export const MAX_INVESTIGATORS = 4;

export interface WizardState {
  step: Step;
  campaignId: string;
  /** investigator codes in the order tapped: P1 first, which is the turn order and the lead */
  picks: string[];
  /** the chosen deck of each picked investigator */
  decks: Record<string, string>;
  difficulty: Difficulty;
}

/** the decks an investigator can bring: the starter decks, then the saved custom ones that still validate */
export const decksFor = (db: ContentDb, code: string, storage?: Storage): DeckDef[] => [
  ...Object.values(db.decks).filter((d) => d.investigator === code),
  ...customDecks(db, code, storage).filter((d) => d.problems.length === 0).map((d) => d.deck),
];

/** saved decks that no longer validate (a pack is gone): shown with the reason, not selectable */
export const invalidDecksFor = (db: ContentDb, code: string, storage?: Storage): SavedDeck[] => customDecks(db, code, storage).filter((d) => d.problems.length > 0);

/**
 * The campaigns as the new-game screen lists them: the hand-written ones first (fully implemented), then the
 * generated ones (ADR-0007) by cycle, read from their first scenario's reference card, then the Return-to boxes in the
 * same order, and the side scenarios last.
 */
export function campaignOrder(db: ContentDb): CampaignDef[] {
  const group = (c: CampaignDef) => (!c.generated ? 0 : c.id.startsWith("side-") ? 3 : c.id.startsWith("return-to-") ? 2 : 1);
  const card = (c: CampaignDef) => db.scenarios[c.scenarios[0]]?.card ?? c.card ?? "";
  return Object.values(db.campaigns).sort((a, b) => group(a) - group(b) || (card(a) < card(b) ? -1 : card(a) > card(b) ? 1 : a.id < b.id ? -1 : 1));
}

export function initialWizard(db: ContentDb): WizardState {
  return { step: "campaign", campaignId: campaignOrder(db)[0]?.id ?? "", picks: [], decks: {}, difficulty: "standard" };
}

export function setCampaign(s: WizardState, id: string, db?: ContentDb): WizardState {
  return db && !db.campaigns[id] ? s : { ...s, campaignId: id };
}

/** what the picker shows of an investigator: from the card when its pack is loaded, from the definition (with the other languages' names) until then */
export function investigatorInfo(db: ContentDb, code: string, locale: string): { name: string; subname?: string; faction: string; pack: string } {
  const def = db.investigators[code];
  const card = db.cards[code];
  if (card) {
    const text = cardText(db, code, locale);
    return { name: text.name, subname: text.subname, faction: card.faction, pack: def?.pack ?? card.pack };
  }
  const tr = def?.names?.[locale];
  return { name: tr?.name ?? def?.name ?? code, subname: tr ? tr.subname : def?.subname, faction: def?.faction ?? "neutral", pack: def?.pack ?? "" };
}

export interface PickerFilter {
  faction: string | null;
  cycle: string | null;
  query: string;
}

/** every investigator for the picker, filtered by class and cycle and by a search of the name (in the game's language and in English) */
export function pickerList(db: ContentDb, locale: string, f: PickerFilter) {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return Object.values(db.investigators)
    .map((def) => {
      const info = investigatorInfo(db, def.code, locale);
      const en = investigatorInfo(db, def.code, "en");
      return {
        code: def.code, ...info,
        // the ability is written behaviour only when the card is here and carries abilities; the others show their text and do nothing
        partlyImplemented: !db.cards[def.code]?.abilities.length,
        needsDeck: decksFor(db, def.code).length === 0,
        haystack: [info.name, info.subname, en.name, en.subname].join(" ").toLowerCase(),
      };
    })
    .filter((i) => (!f.faction || i.faction === f.faction) && (!f.cycle || i.pack === f.cycle) && words.every((w) => i.haystack.includes(w)))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export const SORTS = ["release", "name", "class", "health", "sanity", "willpower", "intellect", "combat", "agility"] as const;
export type SortBy = (typeof SORTS)[number];
const CLASS_ORDER = ["guardian", "seeker", "rogue", "mystic", "survivor", "neutral"];

/** the picker's order: release (code), name, class, or a stat highest first (investigators whose card isn't loaded last) */
export function sortPicker<T extends { code: string; name: string; faction: string }>(db: ContentDb, list: T[], by: SortBy): T[] {
  const stat = (i: T): number | null => {
    const c = db.cards[i.code];
    if (!c) return null;
    if (by === "health") return c.health ?? null;
    if (by === "sanity") return c.sanity ?? null;
    return c.skills?.[by as "willpower"] ?? null;
  };
  const byCode = (a: T, b: T) => a.code.localeCompare(b.code);
  return [...list].sort((a, b) => {
    if (by === "release") return byCode(a, b);
    if (by === "name") return a.name.localeCompare(b.name) || byCode(a, b);
    if (by === "class") return CLASS_ORDER.indexOf(a.faction) - CLASS_ORDER.indexOf(b.faction) || byCode(a, b);
    const x = stat(a);
    const y = stat(b);
    if (x === null || y === null) return x === y ? byCode(a, b) : x === null ? 1 : -1;
    return y - x || byCode(a, b);
  });
}

/** the packs the investigators come from, in code order: the cycle filter's choices */
export function cyclesOf(db: ContentDb): string[] {
  const first = new Map<string, string>();
  for (const i of Object.values(db.investigators)) {
    const pack = investigatorInfo(db, i.code, "en").pack;
    if (pack && (!first.has(pack) || i.code < first.get(pack)!)) first.set(pack, i.code);
  }
  return [...first.keys()].sort((a, b) => first.get(a)!.localeCompare(first.get(b)!));
}

/** a cycle's name: the packs without a campaign of their own have a string, the others take their campaign's name */
export function cycleName(db: ContentDb, locale: string, pack: string): string {
  const key = `cycle.${pack}`;
  if (db.i18n.en?.ui[key]) return t(db, locale, key);
  const own = Object.values(db.campaigns).find((c) => !/^(side|return-to)-/.test(c.id) && (pack === "core" ? c.id === "night-of-the-zealot" : c.packs.includes(pack)));
  return own ? campaignName(db, own.id, locale) : pack;
}

/** tap an investigator: added at the end (up to four, a fifth is ignored) with their first deck, or removed and the rest close up; one with no deck cannot be picked */
export function toggleInvestigator(db: ContentDb, s: WizardState, code: string): WizardState {
  if (!s.picks.includes(code) && !decksFor(db, code).length) return s;
  if (s.picks.includes(code)) {
    const decks = { ...s.decks };
    delete decks[code];
    return { ...s, picks: s.picks.filter((c) => c !== code), decks };
  }
  if (s.picks.length >= MAX_INVESTIGATORS) return s;
  return { ...s, picks: [...s.picks, code], decks: { ...s.decks, [code]: decksFor(db, code)[0]?.id ?? "" } };
}

export const setDeck = (s: WizardState, code: string, deckId: string): WizardState => (s.picks.includes(code) ? { ...s, decks: { ...s.decks, [code]: deckId } } : s);

/** a difficulty the campaign defines (the check is skipped without the content) */
export function setDifficulty(s: WizardState, d: Difficulty, db?: ContentDb): WizardState {
  const known = db ? d in (db.campaigns[s.campaignId]?.chaosBags ?? {}) : ["easy", "standard", "hard", "expert"].includes(d);
  return known ? { ...s, difficulty: d } : s;
}

/** every card the picked investigators may bring: their own cards and every card of the decks on offer to them */
export const cardsOfPicks = (db: ContentDb, s: WizardState): string[] => [...new Set(s.picks.flatMap((code) => [code, ...decksFor(db, code).flatMap((d) => Object.keys(d.cards))]))];

/** whether the packs of those cards are in the content: a deck of a later cycle can only be checked once they are */
export const picksReady = (db: ContentDb, s: WizardState) => packsOf(cardsOfPicks(db, s)).every((p) => !db.packs[p] || packLoaded(db, p));

/** problems with a picked investigator's deck (an empty list is fine; none are told while its cards are still loading) */
export function deckProblems(db: ContentDb, s: WizardState, code: string): string[] {
  if (!picksReady(db, s)) return [];
  // a saved deck may be unfinished (the deck step keeps drafts): its own problems
  const tab = deckTabs(db, code).find((d) => d.id === s.decks[code]);
  return tab ? tab.problems.map((p) => p.message) : ["no deck chosen"];
}

/** can the player move on from this step */
export function canContinue(db: ContentDb, s: WizardState): boolean {
  switch (s.step) {
    case "campaign":
      return !!db.campaigns[s.campaignId];
    case "investigators":
      return s.picks.length >= 1;
    case "decks":
      return s.picks.length >= 1 && picksReady(db, s) && s.picks.every((c) => deckProblems(db, s, c).length === 0);
    case "difficulty":
      return s.difficulty in (db.campaigns[s.campaignId]?.chaosBags ?? {});
    case "ready":
      return true;
  }
}

export function next(db: ContentDb, s: WizardState): WizardState {
  const at = STEPS.indexOf(s.step);
  return canContinue(db, s) && at < STEPS.length - 1 ? { ...s, step: STEPS[at + 1] } : s;
}

export function back(s: WizardState): WizardState {
  const at = STEPS.indexOf(s.step);
  return at > 0 ? { ...s, step: STEPS[at - 1] } : s;
}

/** what `newCampaign` takes */
export function toSetup(s: WizardState, seed: number, db?: ContentDb, storage?: Storage) {
  return {
    campaignId: s.campaignId, difficulty: s.difficulty, seed,
    // a custom deck goes along as the deck itself (the content knows only the starter decks)
    investigators: s.picks.map((code) => {
      const deckId = s.decks[code];
      const custom = db && !db.decks[deckId] ? decksFor(db, code, storage).find((d) => d.id === deckId) : undefined;
      return custom ? { code, deckId, deck: custom } : { code, deckId };
    }),
  };
}
