## ADDED Requirements

### Requirement: Deferred engine rules are typed step kinds

A rule that is queued to run later rather than called at once (finishing an event or a revelation, checking defeated assets, revealing a location, checking engagement, a basic investigate, fight or evade, end-of-turn and end-of-round cleanup, readying, gaining the upkeep resource, an elusive enemy slipping away, exhausting an enemy, choosing a new lead, advancing to the next act or agenda, ending the game when every investigator is eliminated) SHALL be queued as a step of its own kind, named in `STEP`, with its fields typed, and resolved by the one handler the owning rules module registers for that kind. The engine SHALL have no step that names an engine function by a string. Card and scenario scripts SHALL queue these rules only through verbs in `src/engine/api.ts`. Replaying a recorded game SHALL give the same state and event log as before.

#### Scenario: A deferred rule with a missing field

- **WHEN** an engine module queues a location's reveal without naming the location
- **THEN** `pnpm typecheck` fails

#### Scenario: A script naming an engine function

- **WHEN** a script queues a `Script` step with code `"__engine"` and function `revealLocation`
- **THEN** the engine stops with "missing script function __engine.revealLocation", and the script queues the reveal through the api verb instead

#### Scenario: A script revealing a location later

- **GIVEN** the Hallway is unrevealed when The Gathering's first act advances
- **WHEN** the act's script queues the Hallway's reveal through the api verb
- **THEN** the Hallway is revealed at the same point of the resolution, with the same events, as before the change

#### Scenario: The recorded games don't change

- **WHEN** the recorded corpus is replayed after the deferred rules become step kinds
- **THEN** every recording reaches its stored final state and event log
