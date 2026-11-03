## ADDED Requirements

### Requirement: Return to the Night of the Zealot encounter cards

Every encounter card of the `rtnotz` pack SHALL have its behaviour, in data where the vocabulary allows and by a script under `content/packs/return/scripts/<code>.ts` otherwise: act 50012; agenda 50026a; locations 50013–50021, 50027–50030, 50033–50036; enemies 50022, 50023, 50026b, 50038, 50039, 50041, 50042, 50044, 50045, 50046; treacheries 50024, 50031, 50032b, 50037, 50040, 50043; the setup cards 50011, 50025, 50032a are the scenarios' `setupCards`. The `rtnotz` encounter cards SHALL be reported working by the coverage.

The vocabulary SHALL express: an enemy's spawn as an ordered list of locations, the first in play taken; an investigator at a location who cannot take the draw action; a Cultist enemy at or connecting to a location that cannot be parleyed with; prey as the investigator nearest to another enemy matching a filter; revealing one more chaos token during the test in which a token was revealed, at most once per test; an investigator losing their remaining actions and ending their turn; the one-damage cap on every enemy at a location; gaining a clue from the token pool; adding uses of a named type to a chosen asset the investigator controls; and conditions on being the lead investigator and on the current agenda's stage.

#### Scenario: Jeremiah Pierce spawns at the fallback

- **GIVEN** Your House out of the game
- **WHEN** Jeremiah Pierce (50044) is drawn
- **THEN** he spawns at Rivertown; with Your House in play he spawns there

#### Scenario: No draws in the Guest Hall

- **GIVEN** an investigator in the Guest Hall (50014) with 3 actions
- **WHEN** their options are listed
- **THEN** Draw is not among them, and it is again after they move to the Bedroom

#### Scenario: Narôgath forbids parley

- **GIVEN** Narôgath (50026b) at Rivertown and Alma Hill (50046) at Southside, which connects to Rivertown
- **WHEN** an investigator at Southside lists their actions
- **THEN** Alma Hill's parley is not offered; after Narôgath moves two locations away it is

#### Scenario: Arkham Woods reveals another token

- **GIVEN** an investigator investigating Arkham Woods (50034)
- **WHEN** the first token is revealed
- **THEN** a second token is revealed and both count; a third is not drawn in that test

#### Scenario: The Bathroom ends the turn

- **GIVEN** an investigator with 2 actions left investigating the Bathroom (50016)
- **WHEN** a skull is revealed
- **THEN** they have 0 actions and the next investigator's turn begins

#### Scenario: The Zealot's Seal by hand size

- **GIVEN** two investigators, one with 3 cards in hand and one with 5
- **WHEN** The Zealot's Seal (50024) is drawn
- **THEN** the first takes 1 damage and 1 horror, and the second tests willpower (2) and discards 2 random cards on a failure

#### Scenario: Umôrdhoth's Hunger kills the empty-handed

- **GIVEN** an investigator with 1 card in hand and an enemy with 2 damage
- **WHEN** Umôrdhoth's Hunger (50037) is drawn
- **THEN** the investigator discards the card and is killed, and the enemy has 1 damage

#### Scenario: Mask of Umôrdhoth on a unique Cultist

- **GIVEN** Jeremiah Pierce in play 2 locations away and no Cultist closer
- **WHEN** Mask of Umôrdhoth (50043) is drawn
- **THEN** it attaches to Jeremiah Pierce with 1 doom, he has 2 more health and Retaliate; attached to an Acolyte he would gain Aloof instead

#### Scenario: Disciple of the Devourer after agenda 1

- **GIVEN** agenda 01122 in play
- **WHEN** a Disciple of the Devourer (50041) spawns at the farthest empty location
- **THEN** it takes 1 doom and 1 clue from its location's investigator's pool; under agenda 1 the player chooses one of the two

#### Scenario: Vault of Earthly Demise

- **GIVEN** two investigators and one act left in the act deck
- **WHEN** Umôrdhoth enters play
- **THEN** the Vault holds 1 resource, Umôrdhoth has 2 more health and +1 fight, and the Vault cannot leave play
