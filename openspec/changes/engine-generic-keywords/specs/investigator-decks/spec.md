## MODIFIED Requirements

### Requirement: Deck validation

The system SHALL validate a deck against the investigator's deckbuilding rules: deck size, faction/level access, copies limit, required signature cards and weaknesses. Invalid decks MUST be rejected with the reasons listed.

A card with the Researched keyword SHALL be accepted only when the campaign log holds the entry its lower-level version records and the deck replaces that lower-level version with it; without a campaign the entry counts as absent. A bonded card SHALL be rejected as a deck entry, and the bonded cards of a deck's cards SHALL not count toward its size.

#### Scenario: Too many copies

- **WHEN** a deck contains three copies of a card with deck limit 2
- **THEN** validation fails naming that card

#### Scenario: Researched without the entry

- **WHEN** a deck adds Acidic Ichor (02263) and the log has no "identified the solution" entry
- **THEN** validation fails, naming the card and the entry it needs

#### Scenario: Researched as an upgrade

- **GIVEN** the log records the solution identified and Strange Solution (02021) in the deck
- **WHEN** the player replaces it with Acidic Ichor
- **THEN** validation passes

#### Scenario: A bonded card in a deck list

- **WHEN** a deck lists Soothing Melody (05314)
- **THEN** validation fails saying it is bonded to Hallowed Mirror
