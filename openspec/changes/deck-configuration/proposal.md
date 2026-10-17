## Why

Each investigator comes with one starter deck and nothing to do about it. A player who has learned the game wants to swap a few cards and stop drawing a random weakness; full deck building is a project of its own, but a bounded editor over the starter deck is a screen and a validation call.

## What Changes

- **A deck editor in the new-game wizard's deck step.** "Edit" on a chosen deck opens it as a card list grouped by type (assets, events, skills), each card with its glance chips, cost and copies; the signature cards and the weakness slot shown apart. The player may remove up to 5 cards and add as many from a pool: the level-0 cards of the investigator's classes (and neutral) that exist in the loaded packs, excluding cards the deck rules forbid. The deck size must stay the investigator's; the existing validation reports what's wrong, in plain words, and the editor won't save an invalid deck.
- **Choose the basic weakness** from the loaded basic weaknesses, or leave it random.
- **Custom decks are saved** in local storage under a name (default "<investigator> · <date>") and offered next to the starter decks in later new games; they can be renamed and deleted from the deck step. A starter deck is never changed; editing one creates a custom deck.

Out of scope: XP, upgrades, higher-level cards, deck import from ArkhamDB (its requirement exists and stays as it is), pools beyond the loaded packs (today the core set).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `investigator-decks`: deck configuration (swap within limits, weakness choice) and saved custom decks.

## Impact

- New `src/ui/menu/DeckEditor.tsx`, `src/ui/decks.ts` (pure: pool for an investigator, swap limits, custom-deck storage under `ah:decks`, `customDecks()` which new-game-flow already calls), `decks.test.ts`; `validateDeck` reused and its messages translated (`deck.*` strings in en and ru); the wizard's deck step shows custom decks with rename and delete; `scenarioSetup` takes the chosen weakness when one is set.
- Depends on `new-game-flow` (the deck step hosts the editor) and uses `hand-cards-glance`'s chips if present.
