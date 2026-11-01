## MODIFIED Requirements

### Requirement: Deterministic, serializable game state

The engine SHALL represent the whole game as a plain serializable state object. Applying the same sequence of actions to the same initial state and seed MUST produce an identical state. All randomness (shuffles, chaos token draws) MUST come from a seeded RNG stored in the state.

The repository SHALL hold a corpus of recorded games, each a setup and its list of choices, with the event log it produced and a snapshot of its final state. The snapshot SHALL be built through the engine's lookups, not copied from the state's storage: every card in creation order with its fields, every investigator with their counters and piles, every pile by name, and the scenario's own state (round, phase, act, agenda, chaos bag, flags, pending choice). It SHALL cover every hand-written scenario, with one to four investigators, and at least one campaign played from its first scenario to its last. A test SHALL replay every recorded game on a fresh engine and fail when the snapshot or the event log differs from the stored one. The stored results SHALL be rewritten only by an explicit script, never by running the tests.

#### Scenario: Replay produces same result

- **WHEN** a game is started with seed `S` and the recorded action list is replayed on a fresh engine
- **THEN** the final state is deep-equal to the original final state

#### Scenario: Save and resume

- **WHEN** the state is serialized to JSON and later deserialized
- **THEN** play continues from the exact same point with the same pending choices

#### Scenario: A refactor that changes nothing

- **GIVEN** the recorded corpus and its stored results
- **WHEN** an engine change that is meant to keep behaviour is tested
- **THEN** every recorded game replays to its stored snapshot and event log

#### Scenario: A storage change that changes nothing

- **GIVEN** snapshots recorded before the state's storage changed
- **WHEN** the engine stores the same game differently
- **THEN** every recorded game still replays to its stored snapshot and event log

#### Scenario: A rule change shows up

- **GIVEN** a recorded game in which Roland draws Paranoia
- **WHEN** an engine change makes Paranoia's revelation lose one fewer resource
- **THEN** the replay test fails for that game, naming it and the first differing event, until the stored results are rewritten by the script

## ADDED Requirements

### Requirement: Entities, component tables and piles

The game state SHALL hold its cards and investigators in a store: the entities in creation order, one table per component (a card's record under `card`, an investigator's record, keyed by the investigator's code, under `investigator`), and every pile in one map keyed by the pile's name (`deck:<investigator>`, `hand:<investigator>`, `discard:<investigator>`, `encounterDeck`, `encounterDiscard`, `actDeck`, `agendaDeck`, `sideDeck:<name>`). A card SHALL sit in at most one pile, the one its zone and owner name, and moving it SHALL take it out of that pile alone. The store SHALL stay plain JSON. Looking an investigator up SHALL give a view that always shows the current record and piles.

#### Scenario: One pile per card

- **WHEN** a card moves from Roland's hand to his discard pile
- **THEN** it is in `discard:01001`, it is no longer in `hand:01001`, and no other pile holds it

#### Scenario: A view that doesn't go stale

- **WHEN** code holds Roland's view, Roland gains 2 resources and draws a card
- **THEN** the same view shows the new resources and the card in his hand

#### Scenario: An old save

- **WHEN** a save written by engine version 5 is opened
- **THEN** its setup and choices are replayed into the new store and play continues from the same point
