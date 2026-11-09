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
  /** the exploration deck, top first: single-sided locations and encounter cards an Explore ability draws from */
  Exploration: "exploration",
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
  /** the scenario reference card, an instance so cards can lie beneath it */
  Scenario: "scenario",
  /** facedown beneath another card, out of play: its `location` is the card it lies beneath */
  Beneath: "beneath",
  /** out of play, keeping its attachments and tokens (the Hunting Horror) */
  Void: "void",
  Resolving: "resolving",
  Limbo: "limbo",
} as const;
export type Zone = (typeof ZONE)[keyof typeof ZONE];

/** the scenario reference card's instance id: fixed, outside the card sequence */
export const SCENARIO_CARD = "scenario";

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
  Exploration: "exploration",
} as const;
export type FixedPile = (typeof PILE)[keyof typeof PILE];

/**
 * The connection symbols printed on locations (The Forgotten Age): a location's own symbol, and the symbols of the
 * locations it connects to. The five the Return-to box names, and the base cycle's glyphs; `campaign-the-forgotten-age`
 * extends the set as it transcribes the scans.
 */
export const CONNECTION_SYMBOLS = [
  "purpleMoon",
  "blueTriangle",
  "redSquare",
  "orangeHeart",
  "greenDiamond",
  "circle",
  "square",
  "triangle",
  "diamond",
  "cross",
  "moon",
  "heart",
  "star",
  "hourglass",
  "t",
  "equals",
  "slash",
  "spade",
  "clover",
] as const;
export type ConnectionSymbol = (typeof CONNECTION_SYMBOLS)[number];

/**
 * The supplies a campaign's investigators can carry (The Forgotten Age's Supply Points, its Return-to box, Relics of the
 * Past), by the campaign guide's ids: a campaign-log section keeps each investigator's count (ADR-0053)
 */
export const SUPPLIES = [
  "provisions",
  "medicine",
  "rope",
  "blanket",
  "canteen",
  "torches",
  "compass",
  "map",
  "binoculars",
  "chalk",
  "pendant",
  "gasoline",
  "pocketknife",
  "pickaxe",
  "journal",
  "satchel",
  "key_of_eztli",
  "sticky_goop",
  "mysterious_scepter",
] as const;
export type Supply = (typeof SUPPLIES)[number];

/** whether a value is one of the options: `isOneOf(card.zone, ZONE.Play, ZONE.Threat)`, for any of the sets above */
export const isOneOf = <T extends string>(value: T, ...options: readonly T[]): boolean =>
  options.includes(value);
