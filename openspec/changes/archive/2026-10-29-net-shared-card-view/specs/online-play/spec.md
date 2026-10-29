## ADDED Requirements

### Requirement: Shared table cards are shown to the room

In an online room, when a player opens a shared table card at full size, the same card SHALL open at full size on every other browser in the room, spectators included, labelled with the name of the player showing it. Shared table cards are the act, the agenda, the scenario reference card, and any card no investigator owns: enemies, treacheries, locations and story cards. Closing the card SHALL close it only on that browser. A browser SHALL NOT open a shown card while it has something open at full size that its player opened (a card another player showed is replaced), while a menu or a drag is in progress, or while the card is not on its table yet. Cards an investigator owns, investigator panels and the chaos bag SHALL open only on the browser that opened them. Showing a card SHALL NOT be a move: it is not logged, not replayed and not undone.

#### Scenario: Ana shows the agenda

- **GIVEN** Ana and Ben play online and Ben has nothing open
- **WHEN** Ana opens the agenda at full size
- **THEN** the agenda opens on Ben's screen with "Ana is showing", and on Ana's without the label

#### Scenario: An enemy on the map

- **WHEN** Ben opens the Ghoul Priest at full size
- **THEN** it opens on Ana's screen with "Ben is showing"

#### Scenario: Each closes their own

- **GIVEN** Ana showed the agenda and it is open on both screens
- **WHEN** Ben closes it
- **THEN** it stays open on Ana's screen

#### Scenario: Not in the way

- **GIVEN** Ben is reading one of his hand cards at full size
- **WHEN** Ana opens the act
- **THEN** Ben's hand card stays open and the act does not open on his screen

#### Scenario: Investigator cards stay private

- **WHEN** Ana opens a card from her hand, her investigator card, or the chaos bag
- **THEN** nothing opens on Ben's screen

#### Scenario: A spectator sees what is shown

- **GIVEN** Dan watches as a spectator
- **WHEN** Ana opens the scenario reference card
- **THEN** it opens on Dan's screen with "Ana is showing"

#### Scenario: Hot-seat play

- **WHEN** a player opens the agenda in a hot-seat game
- **THEN** it opens as before, with no label
