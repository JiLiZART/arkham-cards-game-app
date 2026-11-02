## ADDED Requirements

### Requirement: A choice is offered only when it can be taken

The table SHALL offer the pending choice's options (a lit card, a card's menu, a button in the instruction bar, the action rail, a modal, the showcase or the mulligan row) exactly when an answer would be taken, and an answer SHALL be taken exactly when the table offers it. Nothing SHALL be offered, and a click, tap, key or `choose` call SHALL do nothing, while:

- events are playing or waiting to play;
- the scenario introduction is on screen;
- drawn cards wait in the showcase;
- the middle of the screen is held by anything other than the skill-test screen or the phase pause (a phase title, an encounter card being revealed, a test result);
- in an online room, the deciding investigator's seat is held by another device;
- the table on screen is not the deciding investigator's.

The action rail MAY keep its buttons on screen, dimmed, while events play; they SHALL NOT respond.

#### Scenario: Events still playing

- **GIVEN** the Ghoul Minion's attack on Roland is playing and his turn's choice is already pending
- **WHEN** the player clicks the Study on the map or a card in his hand
- **THEN** nothing is lit, no menu opens and no action is taken
- **WHEN** the attack has played
- **THEN** the Study and the playable hand cards light, and the same click moves or plays

#### Scenario: Drawn cards in the showcase

- **WHEN** Roland's draw action puts a card in the showcase and his turn's choice is pending behind it
- **THEN** no card on the map, in the play strip or in the hand is lit, and clicking one does nothing until the drawn card is sent to the hand

#### Scenario: Scenario introduction

- **WHEN** the scenario introduction is on screen and the first choice is already pending
- **THEN** no option is offered anywhere, and pressing a deck or a card does nothing

#### Scenario: Skill-test screen open

- **WHEN** Roland's investigate test opens its commit window on the skill-test screen
- **THEN** his hand cards with intellect icons are offered and the bar shows Done, although the test screen holds the middle

#### Scenario: Phase pause

- **WHEN** the paced pause before the mythos phase holds the middle
- **THEN** its Continue is offered and pressing it continues

#### Scenario: Another device decides

- **GIVEN** an online room where Daisy's seat is held by another device
- **WHEN** Daisy is deciding
- **THEN** this device lights nothing, and a `choose` call made here sends no move

#### Scenario: Looking at a teammate

- **WHEN** it is Roland's turn and the player opens Daisy's table
- **THEN** none of Roland's options are offered on Daisy's table, and a `choose` call for one of them is not taken until Roland's table is back

#### Scenario: The screen and the store agree

- **WHEN** a test runs every combination of these states over a pending choice
- **THEN** for each one, the options the surfaces offer are exactly the ones `choose` takes
