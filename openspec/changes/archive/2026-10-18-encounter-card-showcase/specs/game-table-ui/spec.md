## ADDED Requirements

### Requirement: Encounter card showcase
When a card is drawn from the encounter deck (in the mythos phase, by surge, or by an effect), or a weakness is drawn from a player deck, the UI SHALL show it in the card showcase before anything it does happens on the table: the card rises face down out of its pile (the encounter deck, or the drawing investigator's deck), arcs to the middle of the screen and turns face up, at the showcase size (at least 260 px wide at 1080p), over the dimmed table, with the hand-card details column on hover, focus or long press. Under it a line says what to do ("Tap the card to continue") with a Continue button.

The card SHALL stay until the player taps it, presses Continue, or presses Space or Enter, at every pace setting. Until then no later event plays and no choice is offered: the enemy is not on the map, no damage, horror or doom is dealt, no test begins. The Journal and the menu stay available. On the tap the card SHALL leave from where it stood to where it goes next:
- an enemy glides to the location it spawns at (or to the engaged investigator's strip);
- an attachment glides to the card or location it attaches to;
- a treachery with a choice moves to the resolving spot under the banner and stays there while the choice is pending;
- a treachery with a skill test becomes the subject on the left of the skill-test screen;
- a treachery whose revelation needs nothing from the player resolves (its effects play) and goes to the encounter discard.

Several draws SHALL be shown one at a time, each tapped in turn, in the order the game produced them: the second investigator's mythos draw follows the first, a surge draw follows the card that caused it. The showcase for an encounter card is public: it shows whatever hand is on screen and regardless of private hands. Under reduced motion the card appears in the showcase without flying and still waits for the tap.

#### Scenario: Mythos draw, an enemy
- **WHEN** Roland draws Ghoul Minion in the mythos phase
- **THEN** the card rises out of the encounter deck, turns face up large in the middle and waits; the Ghoul is not on the map
- **WHEN** Roland taps it
- **THEN** the Ghoul glides from the middle to its spawn location and the feed says so

#### Scenario: A treachery with a test
- **WHEN** Daisy draws Rotting Remains
- **THEN** the card waits in the showcase; no bag or test screen appears
- **WHEN** she presses Space
- **THEN** the skill-test screen opens with Rotting Remains as its subject and her commit window

#### Scenario: A treachery with a choice
- **WHEN** Roland draws Offer of Power
- **THEN** after the tap the card moves to the resolving spot under the banner and the "choose one" prompt is offered with the card still readable there

#### Scenario: Two investigators draw
- **WHEN** Roland and Daisy each draw an encounter card in the mythos phase
- **THEN** Roland's card is shown and tapped first, then Daisy's; nothing of Daisy's card is on the table while Roland's waits

#### Scenario: Weakness drawn
- **WHEN** Roland draws Cover Up from his deck
- **THEN** it rises out of his deck pile, turns face up in the showcase and waits; after the tap it goes to his threat area

#### Scenario: Normal pace
- **WHEN** the pace is Normal and an encounter card is drawn
- **THEN** it still waits for the tap; it never closes on a timer

## MODIFIED Requirements

### Requirement: Animations follow the event log
Card movement, damage, clue and doom changes SHALL be animated in the order of engine events, and input MUST be blocked while animations that precede a choice are playing.

#### Scenario: Encounter draw
- **WHEN** an investigator draws an encounter card in the mythos phase
- **THEN** the card flies from the encounter deck, flips and waits in the showcase for the player's tap, then resolves and moves to its destination

### Requirement: Pace setting
The menu SHALL offer a pace setting with three values, saved with the other settings:
- **Normal**: events play on today's timings.
- **Slow**: every animated event holds at least 1.6 times as long.
- **Tap**: each big event (a chaos token, a test result, an attack, a spawn, an enemy move, an enemy defeated, an investigator defeated, an act or agenda advance, a resolution) holds until the player presses Next in the caption, clicks the event's card, or presses Space or Enter. Follow-on events (damage, enemy damage, clues, doom) play on their timers after the event they belong to.

A drawn encounter card or weakness is held at every pace (see "Encounter card showcase"); its Continue is on the showcase, not in the caption, and the pace does not time it.

In Tap mode the game is never stuck: a held event always shows the Next button, and undo and the menu stay available. The default is Normal.

#### Scenario: Tap mode in the enemy phase
- **WHEN** the pace is Tap and the Ghoul Minion attacks Roland
- **THEN** the attack holds with "Enemies attack · Next" until the player presses Next or Space, then the damage plays and the next event waits again

#### Scenario: Slow mode
- **WHEN** the pace is Slow and the Ghoul Minion moves
- **THEN** the move stays on screen at least 1.6 times as long as in Normal

#### Scenario: Encounter card at the Tap pace
- **WHEN** the pace is Tap and an encounter card is drawn
- **THEN** the showcase holds it with its own Continue; the caption shows no second Next

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

**Table arrivals.** A card entering the play strip or threat area from somewhere other than the hand SHALL fly in from its origin: the deck pile, the encounter pile, or the showcased card's position when it was just shown as an encounter card or weakness. A card appearing on the map SHALL glide to its place from its origin:
- a spawned enemy or an attachment from an encounter card or weakness that was just shown: from the showcased card's position in the middle of the screen;
- a card from the encounter deck that was not shown: from the encounter pile;
- a location put into play: from the act and agenda panel.

**Hidden hands.** When an investigator other than the viewer draws, a face-down card SHALL fly from the pile column on the left (their own deck is not on screen) to that investigator's token on the right. Their card SHALL NOT be shown face up. Weaknesses that resolve on draw are public: they are shown in the card showcase (see "Encounter card showcase"), whoever drew them.

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
- **THEN** after the encounter card is shown in the showcase and tapped, the Ghoul Minion glides from where the card stood to the Cellar on the map

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
