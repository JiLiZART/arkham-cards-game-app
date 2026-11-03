## ADDED Requirements

### Requirement: Every Return to The Path to Carcosa encounter card works

Every card the 8 Return scenarios use beyond the base campaign's SHALL have its behaviour: the 69 encounter cards of the rtptc pack (the 5 replacement sets Delusory Evils, Decaying Reality, Hastur's Envoys, Maddening Delusions and Neurotic Fear, and the 8 Return scenario sets), in data in `content/packs/return/cards.json` or in `content/packs/return/scripts/<code>.ts`, including the story assets Dianne Devine (52025) and Party Guest (52026) and the Hidden treacheries (52018 Theatre Lounge's search, 52020 La Comtesse, 52057, 52058, 52065, 52071–52075) through the Hidden keyword `engine-generic-keywords` defines. The vocabulary SHALL express what they add: a record per turn of the action kinds an investigator performed (52071–52074 Visions in Your Mind); a condition on hidden cards in hand (52030, 52075); a parley that evades without a test (52024 Crazed Guest); a trigger after any investigator parleys (52023 Dianne Devine); prey "lowest remaining sanity only" (52069 Preying Byakhee); a trigger after clues are discovered carrying their count (52032); forgetting a remembered fact (52039 Clouded Memory).

#### Scenario: A replacement set card in data

- **WHEN** Bleeding Walls (52066) is drawn at a location with shroud 4
- **THEN** it resolves from its declaration in `content/packs/return/cards.json` with a test against 4 and no script

#### Scenario: Visions in Your Mind

- **GIVEN** Visions in Your Mind (52071) hidden in an investigator's hand
- **WHEN** their turn ends without a card played
- **THEN** its forced effect resolves; a turn in which they played a card leaves it silent

#### Scenario: Clouded Memory

- **GIVEN** Return to The Unspeakable Oath with "took the keys" remembered
- **WHEN** Clouded Memory (52039) is drawn and that memory chosen
- **THEN** the memory is no longer remembered and the act's 4-of-6 count drops by one
