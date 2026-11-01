## MODIFIED Requirements

### Requirement: Deterministic, serializable game state

The engine SHALL represent the whole game as a plain serializable state object. Applying the same sequence of actions to the same initial state and seed MUST produce an identical state. All randomness (shuffles, chaos token draws) MUST come from a seeded RNG stored in the state.

The repository SHALL hold a corpus of recorded games, each a setup and its list of choices, with the final state and the event log it produced. It SHALL cover every hand-written scenario, with one to four investigators, and at least one campaign played from its first scenario to its last. A test SHALL replay every recorded game on a fresh engine and fail when the final state or the event log differs from the stored one. The stored results SHALL be rewritten only by an explicit script, never by running the tests.

#### Scenario: Replay produces same result

- **WHEN** a game is started with seed `S` and the recorded action list is replayed on a fresh engine
- **THEN** the final state is deep-equal to the original final state

#### Scenario: Save and resume

- **WHEN** the state is serialized to JSON and later deserialized
- **THEN** play continues from the exact same point with the same pending choices

#### Scenario: A refactor that changes nothing

- **GIVEN** the recorded corpus and its stored results
- **WHEN** an engine change that is meant to keep behaviour is tested
- **THEN** every recorded game replays to its stored final state and event log

#### Scenario: A rule change shows up

- **GIVEN** a recorded game in which Roland draws Paranoia
- **WHEN** an engine change makes Paranoia's revelation lose one fewer resource
- **THEN** the replay test fails for that game, naming it and the first differing event, until the stored results are rewritten by the script

## ADDED Requirements

### Requirement: Scripts use the engine API

Card and scenario scripts under `content/**/scripts` SHALL read and change the game only through `src/engine/api.ts`: its accessors for cards, investigators, piles, counters, flags and the skill test. A script MUST NOT read or write the state object directly, and the linter SHALL refuse a script that does. Moving a card between piles SHALL keep its zone and the pile it sits in consistent in every case.

#### Scenario: A script reaching into the state

- **WHEN** a card script reads `g.s.cards` directly
- **THEN** `pnpm lint` reports it and fails

#### Scenario: A card put on top of a deck

- **WHEN** a script puts a card from the discard pile on top of its owner's deck
- **THEN** the card's zone is the deck, it is the deck's first card, and it is in no other pile
