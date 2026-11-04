## MODIFIED Requirements

### Requirement: Data-defined scenario setup

Each scenario SHALL define in data: encounter sets, set-aside cards, starting locations in play, starting location for investigators, act and agenda decks, chaos token effects per difficulty, and setup steps that may depend on the campaign log. The engine MUST perform setup from this data alone.

Setup data SHALL be able to say: several named act or agenda decks; an act or agenda entry with versions chosen by a log condition or at random; a random choice from a list (into play, set aside, as an act or agenda, the rest removed or set aside); N cards removed at random from a pile or a side deck; set-aside cards shuffled; N random set-aside cards into play; a side deck of locations; an encounter set whose locations go into the encounter deck; cards placed beneath a card; and the table rebuilt from a checkpoint's log entries.

Setup data SHALL also be able to say how the map connects (printed symbols and pairs, or orthogonal adjacency of cells), the cell of each starting location (a second copy of a card getting its own cell), a location put into play at a cell or in a direction from another, and instance links between named starting locations.

#### Scenario: The Gathering setup

- **WHEN** The Gathering starts
- **THEN** only the Study is in play, all investigators start there, and the set-aside locations and Ghoul Priest are out of the encounter deck

#### Scenario: Log-dependent setup

- **WHEN** The Midnight Masks starts and the log records "Your house has burned to the ground"
- **THEN** the Rivertown setup variant is used instead of Your House

#### Scenario: One of two at random

- **WHEN** Return to The Gathering starts with "one of 01113 and 50018 set aside at random, the other removed"
- **THEN** exactly one of the two is set aside, the other is out of the game, and the same seed picks the same one on replay

#### Scenario: Three cultists removed at random

- **WHEN** Return to The Midnight Masks builds its cultist side deck of 8 with "3 removed at random"
- **THEN** the side deck holds 5 cultists

#### Scenario: Agenda 1 at random

- **WHEN** Return to The Midnight Masks starts with agenda 1 as one of 01121a and 50026a
- **THEN** the chosen card is the agenda, the other's back is set aside, and the rest of the agenda deck follows

#### Scenario: A grid at setup

- **WHEN** In Too Deep starts with `adjacency: "orthogonal"` and its 5×3 layout
- **THEN** every location is at its cell and connected to the locations sharing a side, with no printed pairs needed

#### Scenario: Two Unvisited Isles

- **WHEN** Union and Disillusion puts two random Unvisited Isles into play at the two island cells
- **THEN** each has its own cell and the connections the map gives that cell
