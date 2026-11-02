## MODIFIED Requirements

### Requirement: Scripts use the engine API

Card and scenario scripts under `content/**/scripts` SHALL read and change the game only through `src/engine/api.ts`: its accessors for cards, investigators, piles, counters, flags and the skill test. A script MUST NOT read or write the state object directly, and the linter SHALL refuse a script that does. Moving a card between piles SHALL keep its zone and the pile it sits in consistent in every case. The same SHALL hold for every engine module but the core (`core.ts`, `flags.ts`, `engine.ts`, `rules/skillTest.ts`), and the UI and online-play code SHALL read cards and investigators through the core's lookups over a state, not through its `cards` and `invs` records.

#### Scenario: A script reaching into the state

- **WHEN** a card script reads `g.s.cards` directly
- **THEN** `pnpm lint` reports it and fails

#### Scenario: A card put on top of a deck

- **WHEN** a script puts a card from the discard pile on top of its owner's deck
- **THEN** the card's zone is the deck, it is the deck's first card, and it is in no other pile

#### Scenario: An engine module reaching into the state

- **WHEN** `rules/enemies.ts` reads `g.s.lead`
- **THEN** `pnpm lint` reports it and fails, and `leadInvestigator(g)` reads it instead

#### Scenario: The UI reading a card

- **WHEN** a UI component reads `game.cards[id].zone`
- **THEN** `pnpm lint` reports it, and `cardOf(game, id).zone` reads it instead

## ADDED Requirements

### Requirement: Read-only card and investigator views

The core's lookups of cards and investigators (`card`, `cardIf`, `inv`, `invIf`, `allCards`, the zone and location queries, and the UI's lookups over a state) SHALL return read-only views: their fields can be read, and a write through them SHALL fail to type-check. Every change to a card or investigator field outside the core SHALL go through a named core function (counters, exhausting and readying, revealing, location, engagement, control, attachment, the investigator's actions, status and trauma). Replaying a recorded game SHALL give the same state and event log as before the views.

#### Scenario: Writing through a view

- **WHEN** an engine module writes `card(g, id).exhausted = true`
- **THEN** `pnpm typecheck` fails, and `exhaust(g, id)` makes the change instead

#### Scenario: Nothing changes

- **WHEN** the recorded corpus is replayed after the move to views and setters
- **THEN** every recording reaches its stored final state and event log
