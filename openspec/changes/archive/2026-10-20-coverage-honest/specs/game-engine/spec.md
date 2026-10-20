## MODIFIED Requirements

### Requirement: Chaos bag
The engine SHALL hold a chaos bag of tokens defined by the scenario/campaign difficulty, draw tokens at random from the seeded RNG, return revealed tokens after the test, and support adding, removing and sealing tokens. Symbol tokens (skull, cultist, tablet, elder thing) MUST resolve using the current scenario's reference card values for the chosen difficulty, and a hand-written scenario SHALL define its token effects for all four difficulties (Easy, Standard, Hard, Expert), from the front and the back of its reference card. A token effect SHALL be able to search the encounter deck and the encounter discard pile for an enemy matching a filter and have the investigator taking the test draw it, shuffling the encounter deck after, and to reveal another token when a condition holds (such as an enemy with a trait being in play, or none being in play).

#### Scenario: Skull resolved by scenario
- **WHEN** a skull is revealed in The Gathering on Standard
- **THEN** the modifier equals −X where X is the number of Ghoul enemies at the investigator's location, per the scenario reference card

#### Scenario: Skull on Hard
- **GIVEN** The Gathering on Hard, with a Ghoul enemy in the encounter discard pile
- **WHEN** an investigator reveals a skull and fails the test
- **THEN** the modifier is −2, and after the test that investigator draws the Ghoul enemy from the discard pile and the encounter deck is shuffled

#### Scenario: Reveal another when no Cultist is in play
- **GIVEN** The Midnight Masks on Expert with no Cultist enemy in play
- **WHEN** a cultist token is revealed
- **THEN** its modifier is −2, no doom is placed, and another token is revealed

#### Scenario: Every difficulty defined
- **WHEN** the content is checked
- **THEN** each of Night of the Zealot's three scenarios has token effects for Easy, Standard, Hard and Expert
