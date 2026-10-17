/** the new-game wizard's state: pure, so the order and back rules are tested without React */
import type { DeckDef, Difficulty } from "../../content/schema";
import { validateDeck } from "../../engine/decks";
import type { ContentDb } from "../../engine/types";
import { customDecks, type SavedDeck } from "../decks";
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

export function initialWizard(db: ContentDb): WizardState {
  return { step: "campaign", campaignId: Object.keys(db.campaigns)[0] ?? "", picks: [], decks: {}, difficulty: "standard" };
}

export function setCampaign(s: WizardState, id: string, db?: ContentDb): WizardState {
  return db && !db.campaigns[id] ? s : { ...s, campaignId: id };
}

/** tap an investigator: added at the end (up to four, a fifth is ignored) with their first deck, or removed and the rest close up */
export function toggleInvestigator(db: ContentDb, s: WizardState, code: string): WizardState {
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

/** problems with a picked investigator's deck (an empty list is fine) */
export function deckProblems(db: ContentDb, s: WizardState, code: string): string[] {
  const deck = decksFor(db, code).find((d) => d.id === s.decks[code]);
  return deck ? validateDeck(db, deck).map((p) => p.message) : ["no deck chosen"];
}

/** can the player move on from this step */
export function canContinue(db: ContentDb, s: WizardState): boolean {
  switch (s.step) {
    case "campaign":
      return !!db.campaigns[s.campaignId];
    case "investigators":
      return s.picks.length >= 1;
    case "decks":
      return s.picks.length >= 1 && s.picks.every((c) => deckProblems(db, s, c).length === 0);
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
