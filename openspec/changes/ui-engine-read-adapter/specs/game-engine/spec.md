## ADDED Requirements

### Requirement: The UI reads a game through one entry point

The engine SHALL offer the UI one entry point for reading a game, `src/engine/read.ts`, beside `index.ts` (creating, dispatching and replaying) and `api.ts` (scripts). It SHALL give the lookups over a state (cards, investigators, piles) and a reader over a state and the content that answers the engine's queries the UI needs (a card's definition, maximum health and sanity, skill values, hand limit, enemy stats, investigators at a location, connections, a card's play block, doom in play, the act's clue cost, a skill test's parts and token total) and an investigator summary. The reader SHALL build the engine's context itself; UI code MUST NOT build one. Reading SHALL NOT change the state. A test SHALL fail when a UI file other than a test imports an engine module outside `index.ts`, `read.ts`, `bot.ts`, the state types, the closed sets of strings and the event catalogue, the game store alone also reaching the campaign modules it runs.

#### Scenario: Health from the reader

- **GIVEN** Roland Banks with 2 damage and 1 horror
- **WHEN** the UI asks the reader for his summary
- **THEN** it gets health 7 of 9, sanity 4 of 5, his resources, clues, hand size, hand limit 8 and his four skills, and the state is unchanged

#### Scenario: A UI file reaching into the rules

- **WHEN** a HUD component imports `handLimit` from `src/engine/rules/investigators`
- **THEN** the UI's import test fails and names the file, and the component reads the hand limit through the reader instead

#### Scenario: A hand-built context

- **WHEN** a UI module builds `{ s: game, db, events: [] }` to call an engine query
- **THEN** the UI's import test fails on the engine module the query was imported from, since neither the query nor the context type is exported by `read.ts`
