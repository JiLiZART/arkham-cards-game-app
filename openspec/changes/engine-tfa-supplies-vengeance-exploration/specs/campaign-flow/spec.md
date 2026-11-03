## ADDED Requirements

### Requirement: Supplies in the campaign log and the flow

The campaign log SHALL have a supplies section kind: per investigator, each supply with its count. The flow SHALL be able to let each investigator buy supplies from a priced list with points by player count, optionally converting experience to points at a rate and up to a limit, and optionally without recording the purchase; to branch on whether any, each or a chosen investigator has a supply; and to cross a supply off: one per investigator with a step read for each investigator who lacks it, or one from any one investigator with a step read when nobody has it. The log screen SHALL show each investigator's supplies. A scenario SHALL start with the log's supplies, cards SHALL be able to check and cross them off during it, and the scenario's end SHALL write them back.

#### Scenario: Supply Point 1 with two investigators

- **WHEN** The Forgotten Age's prologue reaches the supply point with two investigators
- **THEN** each is offered the eleven supplies at their printed prices with 7 points, and the log shows what each bought

#### Scenario: Provisions at the first interlude

- **GIVEN** three investigators of whom two have provisions
- **WHEN** Interlude I crosses off one provisions per investigator
- **THEN** two provisions are crossed off, the third investigator reads "Low on Rations" once, and the log shows the remaining supplies

#### Scenario: A card crosses off a rope

- **GIVEN** Ursula with a rope in her supplies
- **WHEN** Steps of Yoth crosses it off during The Depths of Yoth and the scenario ends
- **THEN** the campaign log no longer lists her rope

#### Scenario: Scenario-local supplies

- **WHEN** Relics of the Past offers its five supplies without recording
- **THEN** they are checked during the scenario and are not in the campaign log after it

### Requirement: Flow amounts the engine knows are computed

A count effect in the flow SHALL be able to take its amount from the last scenario's vengeance in the victory display, and a card-list record from the vengeance cards in it, instead of asking the player.

#### Scenario: Yig's Fury after The Untamed Wilds

- **GIVEN** The Untamed Wilds ended with 2 vengeance points in the victory display
- **WHEN** its resolution records Yig's Fury
- **THEN** the count rises by 2 with no prompt
