## ADDED Requirements

### Requirement: Frost token

The chaos bag SHALL accept the frost token. During a skill test the first frost revealed SHALL apply −1 and reveal another token; a second frost revealed in the same test SHALL end the reveal step at once and make the test an automatic failure; every revealed frost returns to the bag after the test. A frost revealed outside a skill test SHALL have no effect of its own. Adding a frost SHALL do nothing when the bag and the tokens sealed on cards in play already hold eight. A card SHALL be able to react after one or more frost are revealed in a test (`tokenRevealed` filtered on frost, or the per-test count `frostRevealedThisTest`), make the first frost −3 instead of −1, read the number of frost revealed this test as X, cancel a revealed frost and reveal another, and treat a revealed symbol token as a frost.

#### Scenario: One frost

- **GIVEN** a bag of one frost and one +1
- **WHEN** an investigator with skill 3 tests against difficulty 3
- **THEN** the frost gives −1 and the +1 is revealed next, the total is 3 and the test succeeds

#### Scenario: Two frost

- **GIVEN** a bag of two frost and a +1
- **WHEN** both frost are revealed in one test
- **THEN** no third token is revealed and the test fails automatically

#### Scenario: Cap of eight

- **GIVEN** seven frost in the bag and one sealed on a card in play
- **WHEN** a card adds a frost
- **THEN** the bag still holds seven frost

#### Scenario: Frost outside a test

- **WHEN** a card reveals a token outside a skill test and it is a frost
- **THEN** nothing happens and the token returns to the bag

### Requirement: Partner keyword

A story asset with the `Partner` keyword SHALL not leave play except by being defeated: discard effects skip it. When it is defeated it SHALL be removed from the game. When its controller is defeated it SHALL be defeated too; when its controller resigns it SHALL leave play undefeated, keeping its damage and horror. At the end of the scenario the engine SHALL report, per partner that was in play, whether it was defeated and the damage and horror on it.

#### Scenario: Discard effect skips a partner

- **GIVEN** Dr. Mala Sinha (08717) in play under an investigator
- **WHEN** a treachery discards an asset the investigator controls and she is the only asset
- **THEN** she stays in play

#### Scenario: Investigator defeated

- **GIVEN** an investigator with Danforth (08715) in play
- **WHEN** the investigator is defeated
- **THEN** Danforth is removed from the game and the scenario's end reports him defeated

#### Scenario: Resign

- **GIVEN** an investigator with Takada Hiroko (08722) carrying 1 damage
- **WHEN** the investigator resigns
- **THEN** Takada leaves play undefeated and the end reports 1 damage and 0 horror on her

### Requirement: Campaign ledger of bag and deck changes

Card ops `addChaosToken` and `removeChaosToken` SHALL change the game's bag and write the change to a ledger in game state; ops that add a card to or remove a card from an investigator's deck for the campaign (a Tekeli-li shuffled in, a Tekeli-li returned to its deck) SHALL write the same ledger. The ledger SHALL be part of the serialized state so a replay reproduces it.

#### Scenario: Frost added by a card

- **WHEN** Precarious Ice Sheet's effect adds a frost
- **THEN** the bag holds one more frost and the ledger records `{ add: "frost" }`

#### Scenario: Tekeli-li returned

- **GIVEN** a Tekeli-li (08723) in an investigator's deck
- **WHEN** it is drawn and its revelation returns it to the bottom of the Tekeli-li deck
- **THEN** it is at the bottom of the side deck and the ledger records it removed from that investigator's deck

### Requirement: Side deck ops

The engine SHALL offer, for any named side deck: shuffle the top N cards into an investigator's deck without looking, with a fallback effect for each card that cannot be taken; draw the top card for an investigator (a weakness resolves as drawn); place a card on the bottom; search an investigator's deck, or its top N, for cards of the side deck's set and return them to it. A setup step SHALL build a side deck from an encounter set minus the copies that sit in investigator decks.

#### Scenario: Tekeli-li deck built

- **GIVEN** one investigator whose deck holds two Tekeli-li
- **WHEN** an Edge of the Earth scenario sets up
- **THEN** the `tekelili` side deck holds 14 cards

#### Scenario: Shuffle in or take horror

- **GIVEN** an empty Tekeli-li deck
- **WHEN** a cultist token's failure effect shuffles the top Tekeli-li into the deck "if you cannot, take 1 horror"
- **THEN** the investigator takes 1 horror

#### Scenario: Draw the top card

- **WHEN** a tablet token's effect draws the top card of the Tekeli-li deck
- **THEN** the investigator resolves its revelation as if drawn from their own deck

### Requirement: Shelter as a test value

A location MAY carry a `shelter` value. Token effects and card effects SHALL be able to use X equal to the shelter of the investigator's location, or half of it rounded up.

#### Scenario: Half shelter on Standard

- **GIVEN** Ice and Death on Standard and an investigator at a location with shelter 5
- **WHEN** a skull is revealed
- **THEN** its modifier is −3
