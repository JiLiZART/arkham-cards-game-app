## ADDED Requirements

### Requirement: The bot plays toward the printed objectives

The bot SHALL choose only legal options, choose the same option for the same game state, and play toward the current act's printed objective, reading what it needs from card data rather than from the scenario. When an enemy can be damaged only by one named card, the bot SHALL work to get that card into play and attack that enemy with it, and SHALL NOT attack that enemy with anything else. When a location costs clues to enter, the bot SHALL keep the clues the move needs and SHALL NOT spend them on anything else until it has moved in. A scenario MAY carry a strategy hint only where card data cannot express what the objective needs. Played with the core starter team that suits it, on Standard and an empty campaign log, the bot SHALL reach a printed resolution other than defeat in Undimensioned and Unseen and in Where Doom Awaits on at least one pinned seed, unless the change reports that no searched seed wins.

#### Scenario: The Brood and Esoteric Formula

- **GIVEN** Undimensioned and Unseen with a Brood of Yog-Sothoth at the bot's location and Esoteric Formula in the bot's hand
- **WHEN** the bot takes its turn with enough actions and resources
- **THEN** it plays Esoteric Formula, or fights the Brood with it if it is already in play, and it is never offered or chooses a Machete attack against the Brood

#### Scenario: Holding clues for Sentinel Peak

- **GIVEN** Where Doom Awaits with Sentinel Peak in play and the group holding 4 clues
- **WHEN** the bot could spend clues on anything else
- **THEN** it keeps them and moves toward Sentinel Peak

#### Scenario: A pinned win

- **WHEN** `dunwichPlaythrough.test.ts` plays Undimensioned and Unseen and Where Doom Awaits on their pinned seeds
- **THEN** each ends in a printed resolution other than defeat, with no choice the engine refuses
