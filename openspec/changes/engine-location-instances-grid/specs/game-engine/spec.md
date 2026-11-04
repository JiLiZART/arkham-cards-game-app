## MODIFIED Requirements

### Requirement: Locations

The engine SHALL track locations with shroud, clue value (per-investigator values multiplied by player count), revealed/unrevealed state, connections (symbols) and victory points. Revealing a location MUST place its clues.

Revealing a location SHALL open a window after its clues are placed, in which that location's "after you reveal this location" abilities resolve for the investigator who revealed it. A location SHALL be removable from play: investigators there are defeated unless the removing card moves them, enemies and attachments there are discarded, the location goes to the victory display when it has Victory X and no clues, else to the encounter discard, and a scenario hook is told it left. A single-sided location SHALL be able to sit in the encounter deck or a side deck: drawn as an encounter card, its revelation puts it into play, connected as its text says, and a discard-until effect SHALL be able to stop at a location.

Connections SHALL be computed per location instance from three sources: printed connections, which hold for every instance of a card (the scenario's code pairs and one-way pairs, and the symbols on the location card); links added to or removed from a particular instance at runtime, two-way or one-way; and, when the scenario says adjacency is orthogonal, the cells of the map, where two locations whose cells share a side are connected. Each location instance SHALL have a cell on the map: the starting locations' cells come from the scenario's layout, and a location entering play later takes the cell its placement names (a direction from another location, a named cell, or the next free cell); a placement into an occupied cell SHALL fail as the card says. A location leaving play SHALL free its cell and drop its links. Two instances of one card SHALL be able to differ in links and cells.

#### Scenario: Per-investigator clues

- **WHEN** a location with clue value "2 per investigator" is revealed in a 3-player game
- **THEN** 6 clues are placed on it

#### Scenario: After you reveal this location

- **WHEN** Roland enters the unrevealed Trap Room (03058) and it is revealed
- **THEN** after its clues are placed its reveal ability runs for Roland and the Swarm of Rats it names is put into play engaged with him

#### Scenario: The leftmost car leaves

- **GIVEN** the Essex County Express with an investigator in the leftmost car and a Victory 1 car with no clues behind it
- **WHEN** the agenda removes the leftmost car
- **THEN** that investigator is defeated, the car is no longer a location, and the scenario's hook sees it leave

#### Scenario: A location from the encounter deck

- **GIVEN** Lost in Time and Space with the single-sided locations in the encounter deck
- **WHEN** an investigator draws one
- **THEN** it enters play as a location connected to the investigator's location and its clues are placed; the act's "discard until a location" puts the next one into play the same way

#### Scenario: Four copies of one card

- **GIVEN** Lost in Time and Space with two copies of 02324 in play, one linked to Another Dimension and one not
- **WHEN** connections are read for each
- **THEN** the first lists Another Dimension and the second does not, while both list every location their printed symbols match

#### Scenario: The train line

- **GIVEN** the Essex County Express's cars placed left to right with instance links between neighbours
- **WHEN** the leftmost car is removed
- **THEN** its links are gone and the new leftmost car has only its right-hand neighbour

#### Scenario: Orthogonal adjacency

- **GIVEN** a scenario with `adjacency: "orthogonal"` and Tidal Tunnels at cells [1,1] and [2,1]
- **WHEN** a third is placed at [1,2]
- **THEN** it is connected to the one at [1,1] and not to the one at [2,1]

#### Scenario: Placement into an occupied cell

- **WHEN** a card says to put a location below the investigator's and that cell is taken
- **THEN** the placement fails and the card's "if you cannot" text resolves instead

#### Scenario: A one-way ring

- **GIVEN** Carnevale's nine locations linked one way clockwise
- **WHEN** an investigator at San Marco reads the move options
- **THEN** only the next location clockwise is offered
