## ADDED Requirements

### Requirement: The table shows only what has played

Every surface that shows where cards are SHALL show the table as the events played so far leave it, not as the engine already has it: an enemy whose move is still to play stays at the location it is leaving and is not engaged, and an encounter card or weakness still to be shown in the showcase is in no strip, modal, pile or place on the map. These surfaces are the map, the play area strip, an investigator's modal, the phone's strip modal and the encounter discard pile, and they SHALL all apply the same rule. The pending choice and its options, the hand, the feed and the counters (damage, horror, clues, doom, resources, actions) SHALL keep showing the current game.

#### Scenario: A hunter in a teammate's modal

- **GIVEN** in the enemy phase the Ghoul Minion's move to Daisy's location is queued behind another enemy's attack
- **WHEN** the player opens Daisy's investigator modal while the attack plays
- **THEN** the Ghoul Minion is not among her engaged enemies
- **WHEN** the Ghoul Minion's move plays
- **THEN** it is in her modal's threat row, as it is on the map

#### Scenario: A treachery that needs nothing

- **WHEN** Roland draws a treachery whose revelation needs no choice and it waits in the showcase
- **THEN** the encounter discard pile does not show it on top or count it
- **WHEN** Roland taps it
- **THEN** it resolves and the discard pile shows it on top

#### Scenario: An enemy waiting in the showcase on the phone

- **GIVEN** the phone layout at 852×393
- **WHEN** Roland draws an enemy that will engage him and it waits in the showcase
- **THEN** opening his threat row shows no such enemy until he taps the card and it arrives

#### Scenario: The map and the strip agree

- **WHEN** an enemy's move or an encounter card is waiting to play
- **THEN** the map, the play strip and the investigators' modals show the same cards in the same places
