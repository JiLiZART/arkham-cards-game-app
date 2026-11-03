## MODIFIED Requirements

### Requirement: Data-defined scenario setup

Each scenario SHALL define in data: encounter sets, set-aside cards, starting locations in play, starting location for investigators, act and agenda decks, chaos token effects per difficulty, and setup steps that may depend on the campaign log. The engine MUST perform setup from this data alone.

Setup steps SHALL also be able to build an exploration deck from listed cards and copies with random picks, set aside every Poisoned weakness not in a deck, and the scenario SHALL start with each investigator's campaign supplies in the game state.

#### Scenario: The Gathering setup

- **WHEN** The Gathering starts
- **THEN** only the Study is in play, all investigators start there, and the set-aside locations and Ghoul Priest are out of the encounter deck

#### Scenario: Log-dependent setup

- **WHEN** The Midnight Masks starts and the log records "Your house has burned to the ground"
- **THEN** the Rivertown setup variant is used instead of Your House

#### Scenario: An exploration deck from data

- **WHEN** a scenario's setup lists five locations and five treacheries for its exploration deck
- **THEN** the exploration deck holds those ten cards and none of them is in the encounter deck
