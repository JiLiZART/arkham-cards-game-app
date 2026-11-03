## ADDED Requirements

### Requirement: Chaos token effects beyond a modifier

A scenario's token effect SHALL be able to declare, besides its modifier and its on-fail and on-reveal effects: an effect on success; automatic failure instead of a modifier under a condition; a cost the investigator may pay to treat the token as 0; cancelling the effects and icons of committed skill cards; the reveal of another token; and a modifier computed from the game state: the current agenda's stage, the locations in play with no card beneath them (capped or not), the Brood of Yog-Sothoth in play, the Extradimensional locations in play, the shroud of the investigator's location (or twice it), the printed cost of cards just discarded from the deck, and a second value used instead when a condition holds (an enemy at your location, 10 or more cards in the discard pile, an Altered location, agenda 2). A token effect SHALL be able to name a chaos token added to the bag for the rest of the campaign.

#### Scenario: Essex skull

- **GIVEN** The Essex County Express on Hard with agenda 2 current
- **WHEN** a skull is revealed
- **THEN** its modifier is −3

#### Scenario: Pay to treat as 0

- **GIVEN** The House Always Wins on Standard and an investigator with 2 resources
- **WHEN** a skull is revealed
- **THEN** they may spend 2 resources to treat it as 0, or take −2

#### Scenario: Automatic failure instead

- **GIVEN** Where Doom Awaits on Expert with agenda 2 current
- **WHEN** a tablet is revealed
- **THEN** the test fails automatically

### Requirement: Effects on the deck, the turn and movement

The engine SHALL provide effects that discard the top cards of an investigator's deck, make an investigator lose their remaining actions and end their turn, make an enemy attack an investigator outside the enemy phase, reveal a chaos token outside a skill test and resolve effects by its kind, and add a cost to moving into or out of a location or forbid leaving it; and an amount read from the campaign log in a card's effect.

#### Scenario: Lose actions mid-turn

- **GIVEN** an investigator with 2 actions left on their turn
- **WHEN** they enter the Exhibit Hall (Athabaskan Exhibit) and its forced effect resolves
- **THEN** they have 0 actions and their turn ends

#### Scenario: Arcane Barrier

- **GIVEN** Arcane Barrier attached to the Student Union
- **WHEN** an investigator at the Quad takes the move action to the Student Union
- **THEN** they must pass a willpower test to enter, and a failure keeps them at the Quad with the action spent
