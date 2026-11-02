## ADDED Requirements

### Requirement: One device and a room make the same moves

Every change to the shared game made on one device SHALL go through the same moves a room sends: starting the campaign, beginning a scenario, a choice, a campaign-flow answer, a deck upgrade, an undo, calling off a skill test, and finishing the scenario. On one device the move is applied at once; in a room it is proposed to the host and applied when its numbered copy arrives. The same moves from the same start SHALL reach the same game state, the same list of choices, the same undo floor and the same save either way. A deck upgrade the engine would refuse SHALL be reported to the player at once in both cases.

#### Scenario: The same choices alone and in a room

- **GIVEN** a Night of the Zealot campaign with Roland Banks started with seed 7 on one device, and the same campaign started with seed 7 in a room with one browser, both with "Tap decks to draw" on
- **WHEN** the same choices are made in both through the mulligan and Roland's first turn, draws included
- **THEN** both reach the same game state, the same choices and the same undo floor, and their saves differ only in the room entry

#### Scenario: A refused upgrade

- **WHEN** a player asks for a deck upgrade they cannot afford, on one device or in a room
- **THEN** they are told at once that it is refused, and no move is applied or sent
