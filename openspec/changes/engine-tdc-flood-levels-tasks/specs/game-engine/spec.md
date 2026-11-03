## ADDED Requirements

### Requirement: Flood levels

Every location in play SHALL have a flood level: unflooded, partially flooded or fully flooded; a location enters play unflooded unless setup or a card says otherwise. Increasing a flood level SHALL take unflooded to partially flooded and partially to fully flooded, and leave a fully flooded location as it is; decreasing SHALL do the reverse and leave an unflooded location as it is. A location whose card says it cannot be flooded SHALL stay unflooded, and one that cannot be fully flooded SHALL stop at partially flooded. For card effects, "flooded" SHALL mean partially or fully flooded. An investigator whose card treats fully flooded as partially flooded SHALL be answered partially flooded for their own location. Every change SHALL be an event naming the location and both levels, so replays and the table follow it.

#### Scenario: Increase past the top

- **GIVEN** a fully flooded location
- **WHEN** a card increases its flood level
- **THEN** it stays fully flooded and no event is emitted

#### Scenario: Decrease to dry

- **GIVEN** a partially flooded location
- **WHEN** a card decreases its flood level
- **THEN** it is unflooded, and a further decrease changes nothing

#### Scenario: Cannot be flooded

- **GIVEN** the Moving Platform (11594), whose card says it cannot be flooded
- **WHEN** Something in the Water (11737) would increase the flood level of the nearest eligible location and the Moving Platform is nearest
- **THEN** the Moving Platform is not eligible and the next nearest unflooded or partially flooded location is increased

#### Scenario: Diving Suit

- **GIVEN** an investigator wearing Diving Suit (11764) at a fully flooded location
- **WHEN** a token effect asks whether their location is fully flooded
- **THEN** the answer is no, while another investigator at the same location is answered yes

### Requirement: Map positions and levels

Every location in play SHALL have a grid position `[col, row]` in the game state, taken from the scenario's layout when it is put into play, or from the position the setup step, effect or script that put it there names. A script SHALL be able to place a location at a position and to swap two locations, each as an event naming the location and both positions. The engine SHALL answer, for a location: its row and its level (the row counted from the scenario's level origin, up or down as the scenario says), the locations on a row, the location beside it to the left, right, above or below, and whether an investigator entered it from above or below. When positions change, connections derived from adjacency or from the rows above and below SHALL be derived again, and printed connections SHALL not change.

#### Scenario: Level as X

- **GIVEN** The Western Wall descending, with Treacherous Path on the third row
- **WHEN** an investigator there reveals the skull, whose X is their location's level
- **THEN** the modifier is −3

#### Scenario: Rows above and below

- **GIVEN** the agenda rule that each location is connected to every location on the rows above and below it, with three locations on row 2 and two on row 3
- **WHEN** an investigator on row 2 looks at where they may move
- **THEN** both row-3 locations and every row-1 location are offered and the other row-2 locations are not

#### Scenario: Swap and follow

- **GIVEN** the Moving Platform at `[1, 1]` and a Vault Chamber at `[1, 0]`, adjacent and connected through the Platform's rule
- **WHEN** a script swaps them
- **THEN** the Platform is at `[1, 0]`, the Chamber at `[1, 1]`, the Platform is now connected to the locations adjacent to `[1, 0]`, and a `locationMoved` event is emitted for each

#### Scenario: Entered from above

- **GIVEN** Treacherous Path (11521) below a Walkway
- **WHEN** an investigator moves from the Walkway down into it
- **THEN** its forced ability "after you enter from a location above it" resolves; moving in from a location on the row below does not trigger it

### Requirement: Scenarios write per-investigator campaign counts

A scenario SHALL be able to leave, besides log entries and counts, a count for one investigator under a section (`invCount:<section>:<id>:<investigator>`), and an id of `$task` SHALL mean that investigator's assigned Task. A card effect or script "mark N progress" SHALL add N and "erase N progress" SHALL subtract N, never below zero. The campaign SHALL apply these when the scenario ends, as it applies entries and counts today.

#### Scenario: Progress marked at game end

- **GIVEN** Daisy holds Do No Harm and her Task card's end-of-game condition is met
- **WHEN** the scenario ends and the campaign applies its notes
- **THEN** the log's Task progress for Daisy under Do No Harm is 2 higher, and no other investigator's changes

#### Scenario: Erase below zero

- **GIVEN** Roland with 0 progress under his Task
- **WHEN** a resolution erases 1 progress
- **THEN** his progress stays 0
