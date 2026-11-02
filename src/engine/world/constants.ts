/**
 * The engine's closed sets of strings (ADR-0026): each is written once, here, and its type derived from it. The values
 * are the strings the state, saves and recordings already hold; a key is its value with the first letter capitalised.
 * This module imports nothing, so the state's types can import it.
 */

/** Where a card is: a pile, the play area, a threat area, a location or limbo. */
export const ZONE = {
  Deck: "deck",
  Hand: "hand",
  Discard: "discard",
  Play: "play",
  Threat: "threat",
  Commit: "commit",
  EncounterDeck: "encounterDeck",
  EncounterDiscard: "encounterDiscard",
  SideDeck: "sideDeck",
  Location: "location",
  Enemy: "enemy",
  Attached: "attached",
  Act: "act",
  Agenda: "agenda",
  ActDeck: "actDeck",
  AgendaDeck: "agendaDeck",
  Victory: "victory",
  SetAside: "setAside",
  Removed: "removed",
  Investigator: "investigator",
  Resolving: "resolving",
  Limbo: "limbo",
} as const;
export type Zone = (typeof ZONE)[keyof typeof ZONE];

/** The scenario's phase: the setup, the four phases of a round, and the end. */
export const PHASE = {
  Setup: "setup",
  Mythos: "mythos",
  Investigation: "investigation",
  Enemy: "enemy",
  Upkeep: "upkeep",
  Ended: "ended",
} as const;
export type Phase = (typeof PHASE)[keyof typeof PHASE];

/** What a pending choice is asking for. */
export const CHOICE = {
  Turn: "turn",
  Target: "target",
  Commit: "commit",
  Reaction: "reaction",
  Generic: "generic",
  Mulligan: "mulligan",
  Assign: "assign",
  Order: "order",
  Phase: "phase",
  Draw: "draw",
} as const;
export type ChoiceKind = (typeof CHOICE)[keyof typeof CHOICE];

/** Where a skill test has got to. */
export const TEST_STAGE = {
  Commit: "commit",
  Reveal: "reveal",
  AfterReveal: "afterReveal",
  ResolveTokens: "resolveTokens",
  Result: "result",
  Apply: "apply",
  KindResult: "kindResult",
  End: "end",
} as const;
export type TestStage = (typeof TEST_STAGE)[keyof typeof TEST_STAGE];

/** Whether an investigator is still in the scenario. */
export const INV_STATUS = {
  Playing: "playing",
  Resigned: "resigned",
  Defeated: "defeated",
} as const;
export type InvStatus = (typeof INV_STATUS)[keyof typeof INV_STATUS];

/** The piles that have one fixed name (an investigator's and a side deck's are named for their owner or deck). */
export const PILE = {
  EncounterDeck: "encounterDeck",
  EncounterDiscard: "encounterDiscard",
  ActDeck: "actDeck",
  AgendaDeck: "agendaDeck",
} as const;
export type FixedPile = (typeof PILE)[keyof typeof PILE];

/** whether a value is one of the options: `isOneOf(card.zone, ZONE.Play, ZONE.Threat)`, for any of the sets above */
export const isOneOf = <T extends string>(value: T, ...options: readonly T[]): boolean =>
  options.includes(value);
