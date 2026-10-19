## Context

`InvestigatorDef` is `code, signatures, weaknesses, deckSize, deckOptions [{faction, level}]`; the investigator's stats come from its card in the core pack. Other investigators' cards live in lazy packs. The snapshot's `deck_requirements` is a string (`size:30, card:02006:90060, card:02007, random:subtype:basicweakness`), its `deck_options` a list using 18 keys; about 10 investigators need special ones (`faction_select`, `option_select`, `deck_size_select`, `id`). ArkhamCards' `src/data/deck/starterDecks.ts` maps 49 investigator codes to slot lists.

## Goals / Non-Goals

**Goals:** every regular investigator pickable when a deck exists; filters; their packs loaded with the campaign.

**Non-Goals:** parallel investigators; investigator abilities in the engine (they stay text, marked); the deck builder (`deck-builder`).

## Decisions

1. **Generated files** in `content/investigators-generated/<code>.json` and `content/decks-generated/<code>-starter.json`, eager (about 100 small files, roughly 60 KB): the picker needs them before packs load. A file in `content/investigators/` replaces the generated one with the same code.
2. **Schema:** `InvestigatorDef` gains `name`, `subname`, `faction`, `pack`, `generated`, and `deckOptions` widens to the snapshot grammar (all keys, typed; unknown keys kept under `raw` for the deck builder to refuse in plain words). Requirements: `card:A:B` means A or its alternative B; the first is the signature.
3. **Starter decks:** parsed from the TypeScript file with a small regex reader (object of code → slots), `01000` (the random basic weakness placeholder) becomes `randomBasicWeakness: true`.
4. **Picker:** filters are view state (ADR-0004): class chips, a cycle select, a search box; the list is the existing avatar grid. "Partly implemented" when the investigator card has no abilities in content; "needs a deck" when no deck (starter or custom) exists.
5. **Loading:** the store's prepare step takes the campaign and the chosen investigators: it loads the packs of the investigators' cards and of every card in their decks.

## Risks / Trade-offs

- [An investigator without written abilities plays as a body with stats] → marked in the picker.
- [Avatars for 93 investigators need portraits] → the avatar crops the investigator card image (as for the core five); hotlinked for packs the game doesn't host (see `card-catalog`).

## Migration Plan

Additive. Saved games keep working; their investigators are core.

## Open Questions

None.
