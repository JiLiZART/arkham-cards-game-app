## MODIFIED Requirements

### Requirement: Prompts and choices

Every pending engine choice SHALL be presented without a sidebar:

- a one-line prompt banner names the deciding investigator and the question;
- options tied to a card are offered on that card: in the hand fan, on the map, in the HUD panels, the play area strip, the skill-test screen, the showcase, the mulligan row, an investigator's avatar or sheet, or another investigator's modal for a card that investigator holds;
- options tied to no card are offered on the action rail (Draw, Gain resource, Investigate) or in the instruction bar (Done, Pass, End turn and the other answers).

Each option SHALL have exactly one home, decided in one place for every surface, and SHALL be offered there while the choice can be answered. Only these options SHALL also be offered in a second place: Investigate on its location as well as on the rail; the turn's Draw and a waiting draw on the deck pile; and in the phone layout, the rail's options and the act's and agenda's options in the instruction bar as well. A card SHALL never offer the same option twice.

Every option of the pending choice MUST be reachable this way in both layout modes. Skill tests SHALL show a commit window, then the chaos token draw (see "Chaos token draw"), then the calculation (skill + modifiers vs difficulty) before applying results.

#### Scenario: Skill test display

- **WHEN** a token is revealed
- **THEN** it is revealed through the chaos token draw, and the result panel shows e.g. "3 + 1 (committed) − 2 (token) = 2 vs 2 → Success"

#### Scenario: Every option reachable

- **WHEN** any choice is pending during an automated playthrough of The Gathering
- **THEN** each of its options can be found on a hand card, a map card, a HUD panel, the play area strip, a modal or the action rail

#### Scenario: Every option reachable in both modes

- **WHEN** any choice is pending during automated playthroughs of The Gathering, The Midnight Masks and The Devourer Below, laid out once for the desktop and once for the phone
- **THEN** each option has a home that layout draws, and no card carries the same option in two places

#### Scenario: Investigate on the rail and the location

- **WHEN** it is Roland's turn in the Study with clues left
- **THEN** Investigate is a button on the action rail and also lights the Study on the map, and either one investigates

#### Scenario: Draw on the phone

- **WHEN** it is Roland's turn at 852×393
- **THEN** Draw, Resource and Investigate are buttons in the instruction bar, there is no action rail, and a tap on his deck in the left drawer draws as well

#### Scenario: Another investigator's card

- **WHEN** Roland is choosing an asset at his location and one of the assets is controlled by Daisy
- **THEN** that asset's option is offered in Daisy's investigator modal, and not on Roland's play strip
