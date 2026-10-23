## ADDED Requirements

### Requirement: Card arrival animations

Every card that arrives in the viewer's hand, in a play area or threat area, or on the map SHALL travel visibly from where it came from to where it lands, instead of appearing in place.

**Drawing.** A card the viewing investigator draws from their deck SHALL:

1. rise out of the deck pile face down;
2. flip face up while moving to a show spot above the hand, enlarged to about the hovered hand-card size;
3. stay there briefly (about half a second);
4. shrink and fly into its place in the fan, while the cards around that place ease aside to make room.

When several cards are drawn at once, they SHALL leave the deck one after another, about 150 ms apart. The opening hand and mulligan redraws SHALL skip the show spot and fly straight into the fan. The whole sequence for one card SHALL take no more than about 1.2 s.

**Other arrivals in hand.** A card that enters the viewer's hand from anywhere else (play area, discard pile, encounter area) SHALL fly from that place into its fan slot, face up, without the show spot.

**Playing from hand.** A card leaving the viewer's hand for the play area SHALL fly from its fan position to its slot in the play strip. An event played from hand SHALL fly to the spot in the middle where resolving cards are shown.

**Table arrivals.** A card entering the play strip or threat area from somewhere other than the hand SHALL fly in from its origin: the deck pile, the encounter pile, or the middle of the screen when it was just shown there as an encounter card. A card appearing on the map SHALL glide to its place from its origin:

- a spawned enemy or an attachment from an encounter card that was just shown: from the middle of the screen;
- a card from the encounter deck that was not shown: from the encounter pile;
- a location put into play: from the act and agenda panel.

**Hidden hands.** When an investigator other than the viewer draws, a face-down card SHALL fly from the pile column on the left (their own deck is not on screen) to that investigator's token on the right. Their card SHALL NOT be shown face up. Weaknesses that resolve on draw are public and keep their existing face-up display.

Arrival animations MUST NOT intercept the pointer and MUST NOT delay the game beyond the existing event animations. A card in flight to the fan or strip SHALL become clickable once it lands. Cards already in place when a game is loaded, or revealed behind the hand-off screen, SHALL NOT animate. When the system asks for reduced motion, cards SHALL appear in place without flying.

#### Scenario: Draw in Upkeep

- **WHEN** Roland draws a card in the Upkeep phase
- **THEN** a face-down card rises from his deck pile, turns face up as it moves above the hand, holds there enlarged for about half a second, then shrinks into its place in the fan while the neighbouring cards slide aside

#### Scenario: Draw two

- **WHEN** a card effect makes Daisy draw 2 cards
- **THEN** two cards leave the deck about 150 ms apart and each runs the same draw sequence

#### Scenario: Opening hand

- **WHEN** a scenario starts and Roland draws his opening 5 cards
- **THEN** the 5 cards fly from the deck into the fan one after another without stopping at the show spot

#### Scenario: Play an asset

- **WHEN** Roland plays Machete from his hand
- **THEN** Machete flies from its place in the fan to its new slot in the play strip, and the fan closes the gap

#### Scenario: Return to hand

- **WHEN** a card effect returns an asset from Roland's play area to his hand
- **THEN** the asset flies from the play strip into the fan

#### Scenario: Enemy spawns from the encounter deck

- **WHEN** a Ghoul Minion is drawn from the encounter deck and spawns at the Cellar
- **THEN** after the encounter card is shown in the middle, the Ghoul Minion glides from the middle of the screen to the Cellar on the map

#### Scenario: Locations placed by the act

- **WHEN** the act advances and puts the Hallway, Attic, Cellar and Parlor into play
- **THEN** each location glides onto the map from the act and agenda panel instead of appearing in place

#### Scenario: Another investigator draws

- **WHEN** Daisy draws a card while Roland is the viewing investigator
- **THEN** a face-down card flies to Daisy's token on the right, and the card's face is never shown

#### Scenario: Load a game

- **WHEN** a saved game is loaded
- **THEN** the hand, play strip and map appear in place without arrival animations

#### Scenario: Reduced motion

- **WHEN** the system's reduced-motion setting is on and Roland draws a card
- **THEN** the card appears in the fan without flying
