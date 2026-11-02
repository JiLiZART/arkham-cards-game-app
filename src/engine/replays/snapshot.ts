/**
 * What a recording keeps of a finished game: built only through the core's lookups, so it reads the same whatever the
 * state's storage is (ADR-0023). Cards in creation order with every field, investigators in turn order without their
 * piles, every non-empty pile by name, and the scenario's own scalars, flags and pending choice.
 */
import { cardCopyOf, cardsOf, invsOf, pileMap } from "../context";
import { flagsForSnapshot } from "../world/flags";
import type { GameState } from "../world/types";

export interface Snapshot {
  cards: (Record<string, unknown> & { id: string })[];
  investigators: (Record<string, unknown> & { id: string })[];
  piles: Record<string, string[]>;
  scenario: Record<string, unknown>;
}

/** the fields that are storage, not scenario state: the cards, the investigators, the piles, and the engine version */
const NOT_SCENARIO = new Set([
  "cards",
  "invs",
  "encounterDeck",
  "encounterDiscard",
  "sideDecks",
  "actDeck",
  "agendaDeck",
  "world",
  "version",
]);

export function snapshotOf(s: GameState): Snapshot {
  return {
    cards: cardsOf(s).map((c) => ({ ...cardCopyOf(s, c.id) })),
    investigators: invsOf(s).map((i) => {
      const { deck, hand, discard, ...fields } = { ...i };
      void [deck, hand, discard];
      return fields;
    }),
    piles: Object.fromEntries(
      Object.entries(pileMap(s))
        .filter(([, ids]) => ids?.length)
        .map(([name, ids]) => [name, [...(ids ?? [])]]),
    ),
    scenario: {
      ...Object.fromEntries(Object.entries(s).filter(([key]) => !NOT_SCENARIO.has(key))),
      flags: flagsForSnapshot(s),
    },
  };
}
