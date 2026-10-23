## MODIFIED Requirements

### Requirement: Starting a scenario with a deck

At scenario start each investigator SHALL shuffle their deck with signature cards and one random basic weakness (selected at campaign start), draw 5 cards, set aside drawn weaknesses and redraw them, gain 5 resources, and may take one mulligan.

During the mulligan the investigator picks cards to redraw one at a time. Until they confirm the redraw, each picked card SHALL be offered to be taken back, which un-picks it; it is then offered for picking again. Only confirming redraws the picked cards. Picking and taking back are ordinary recorded choices, so saved games and action-log replays stay exact. The bot MUST NOT take back a pick.

#### Scenario: Weakness in opening hand

- **WHEN** an investigator draws a weakness in the opening hand
- **THEN** it is set aside, replaced with a new card, and shuffled back after the mulligan

#### Scenario: Take back a pick

- **WHEN** Roland picks Machete and Flashlight for redraw, then takes Machete back, then confirms
- **THEN** only Flashlight is redrawn and Machete stays in his hand

#### Scenario: Picked card offered again

- **WHEN** Roland takes back a picked card
- **THEN** the mulligan choice is asked again, with that card among the cards he can pick and the confirm option counting one fewer card
