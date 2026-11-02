## MODIFIED Requirements

### Requirement: Scripts use the engine API

Card and scenario scripts under `content/**/scripts` SHALL read and change the game only through `src/engine/api.ts`: its accessors for cards, investigators, piles, counters, flags and the skill test, and its verbs for what the engine resolves next (spawning, dealing damage, placing doom, advancing the act, resolving effects, running another script function and the rest). `api.ts` SHALL name each of its exports; it SHALL NOT re-export a module wholesale, and the list of its exports SHALL be checked by a test. A script SHALL queue engine steps only through the verbs, which SHALL resolve in the order they are queued; the engine's step kinds, step types and step fields SHALL NOT be exported to scripts. A script MUST NOT read or write the state object directly, and the linter SHALL refuse a script that does. Moving a card between piles SHALL keep its zone and the pile it sits in consistent in every case. The same SHALL hold for every engine module but the core (`context.ts`, `movement.ts`, `queries.ts`, the `world/` folder, `index.ts`, `steps/dispatch.ts` and `rules/skillTest.ts`), and the UI and online-play code SHALL read cards and investigators through the core's lookups over a state, not through the store's tables.

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

#### Scenario: A script writing a step literal

- **WHEN** a script queues `{ t: "AssignDamage", inv, damage: 1, horror: 0 }` itself
- **THEN** `pnpm typecheck` fails, since neither the step type nor `push` is exported, and `queue(game, dealDamage(...))` queues it instead

#### Scenario: Verbs resolve in the order queued

- **GIVEN** a script that queues a spawn and then a doom placement in one `queue` call
- **WHEN** the stack resolves
- **THEN** the enemy spawns before the doom is placed

#### Scenario: A step field changes without touching content

- **WHEN** an engine step gains a new required field, filled by its verb with a default
- **THEN** no file under `content/` changes and `pnpm typecheck` passes

#### Scenario: The API's exports are pinned

- **WHEN** a name is added to or removed from `api.ts`'s exports
- **THEN** `scriptApi.test.ts` fails until its list is updated

#### Scenario: Nothing changes

- **WHEN** the recorded corpus is replayed after every script queues through the verbs
- **THEN** every recording reaches its stored final state and event log
