## MODIFIED Requirements

### Requirement: Card showcase
When cards are drawn into the hand of the investigator whose hand is on screen, outside the opening hand and the mulligan redraw, they SHALL come out of that investigator's deck pile and into a showcase area in the centre of the screen: each card first rises face down out of the pile, then arcs to its place in the showcase, growing and turning face up on the way, and settles there. Several cards drawn together leave the pile one after another, about 150 ms apart, and line up as they arrive. Under reduced motion the cards appear in the showcase without flying.

In the showcase the cards are large: 340 px wide at 1080p, side by side up to four in a row; five to eight cards shrink to fit two rows; more shrink further so that all are visible. The area MUST NOT scroll. Each card casts one shadow as a whole; the faces of the turn cast none, so no dark box shows mid-turn.

A help line under the cards SHALL read "Tap a card to take it to your hand" (in the game's language). There is no button. The showcase SHALL stay until the player taps any showcased card or the dark backdrop, or presses Space or Enter. All showcased cards then fly into their places in the fan. While the showcase is open, no game option can be chosen; the action rail, prompt and table options are inert. Cards drawn while the showcase is already open join it, coming out of the pile the same way.

Hovering or focusing a showcased card SHALL show the fan's details column (name, type, cost, icons, traits, text) beside it: to its right, or to its left for the rightmost card; on a touch screen a long press shows it. No enlarged copy is shown.

Draws into another investigator's hand are not showcased. They fly to that investigator's pile, as before. When hands are private, a draw for an investigator whose hand is hidden behind the hand-off screen isn't showcased; it is simply in the hand when that player takes the device.

#### Scenario: Draw action
- **WHEN** Roland takes the Draw action and draws Machete
- **THEN** Machete rises face down out of his deck pile, arcs to the centre turning face up, and stays there 340 px wide with "Tap a card to take it to your hand" under it, and the rail's buttons don't respond
- **WHEN** he taps Machete
- **THEN** it flies into his hand fan and the rail responds again

#### Scenario: Two cards at once
- **WHEN** an effect draws 2 cards for Roland
- **THEN** both come out of the pile one after the other and stand side by side in the showcase, and one tap sends both to his hand

#### Scenario: Upkeep draw, other investigator
- **WHEN** in upkeep both Roland and Daisy draw, with Roland's hand on screen and private hands off
- **THEN** Roland's card is showcased; Daisy's flies to her pile in the column

#### Scenario: Opening hand
- **WHEN** a scenario starts and the opening hand is drawn
- **THEN** the cards fly straight into the fan without the showcase, as before

#### Scenario: Details beside a showcased card
- **WHEN** the player hovers the showcased Machete
- **THEN** the details column with its name, cost, icons, traits and text appears to its right, and no enlarged copy is shown

#### Scenario: Many cards
- **WHEN** an effect shows 6 cards
- **THEN** they stand in two rows, all visible, with no scrollbar

### Requirement: Picking cards from a deck
When the pending choice asks the investigator on screen to pick one of a set of cards that are in their deck or discard pile, those cards SHALL come out of the pile into the showcase area the same way drawn cards do (rise, arc, turn face up) and stand there face up instead of being offered only as option buttons. This covers searching the deck, looking at the top cards and choosing from the discard pile.

The prompt in the instruction bar names what is being picked. A help line under the cards reads "Choose one", or "Choose one, or take nothing" when a none option exists. Options that aren't cards, such as "none" or "done", are small text links in that line, not buttons. Tapping a card picks it. A picked card that goes to the hand flies from the showcase into the fan without stopping again; the others leave the showcase. The cards follow the showcase's size rule (four per row, shrinking to fit) and never scroll. Hovering or focusing a card shows its details column beside it.

#### Scenario: Old Book of Lore
- **WHEN** Daisy uses Old Book of Lore and the search offers the top 3 cards of her deck
- **THEN** the 3 cards come out of her deck pile and stand face up in the middle of the screen with "Choose one" under them
- **WHEN** she taps one of them
- **THEN** it flies into her hand fan and the other two disappear from the showcase

#### Scenario: Nothing taken
- **WHEN** a search offers cards and a "none" option
- **THEN** the line reads "Choose one, or take nothing" with "take nothing" as a link, and choosing it closes the showcase
