## MODIFIED Requirements

### Requirement: Scripts use the engine API

Card and scenario scripts under `content/**/scripts` SHALL read and change the game only through `src/engine/api.ts`: its accessors for cards, investigators, piles, counters, flags and the skill test. A script MUST NOT read or write the state object directly, and the linter SHALL refuse a script that does. Moving a card between piles SHALL keep its zone and the pile it sits in consistent in every case. The same SHALL hold for every engine module but the core (`context.ts`, `movement.ts`, `queries.ts`, the `world/` folder, `index.ts`, `steps/dispatch.ts` and `rules/skillTest.ts`), and the UI and online-play code SHALL read cards and investigators through the core's lookups over a state, not through the store's tables.

#### Scenario: A script reaching into the state

- **WHEN** a card script reads `game.s.world` directly
- **THEN** `pnpm lint` reports it and fails

#### Scenario: A card put on top of a deck

- **WHEN** a script puts a card from the discard pile on top of its owner's deck
- **THEN** the card's zone is the deck, it is the deck's first card, and it is in no other pile

#### Scenario: An engine module reaching into the state

- **WHEN** `rules/enemies.ts` reads `game.s.lead`
- **THEN** `pnpm lint` reports it and fails, and `leadInvestigator(game)` reads it instead

#### Scenario: The UI reading a card

- **WHEN** a UI component reads `game.world.tables.zone[id]`
- **THEN** `pnpm lint` reports it, and `cardOf(game, id).zone` reads it instead

## ADDED Requirements

### Requirement: Event types are a closed set

Every event the engine emits SHALL have a type from the engine's event catalogue, a constant object whose values are the event types the UI and the replay corpus already know. Emitting an event whose type isn't in the catalogue, or comparing an event's type with a string that isn't, SHALL fail the typecheck. The engine's other closed sets of strings (zones, phases, step kinds, choice kinds, skill test stages) SHALL likewise be constant objects with their types derived from them, so their values are written in one place.

#### Scenario: A misspelt event type

- **WHEN** an engine module emits an event of type `"attak"`
- **THEN** `pnpm typecheck` fails, and `EVENT.Attack` is the type to emit

#### Scenario: The recorded events don't change

- **WHEN** the recorded corpus is replayed after event types become constants
- **THEN** every recording's event log is the same as stored, type for type
