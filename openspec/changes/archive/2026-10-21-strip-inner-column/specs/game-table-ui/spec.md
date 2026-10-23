## MODIFIED Requirements

### Requirement: Play area strip

On the desktop, the viewing investigator's cards in play and threat area SHALL be shown as a column of cards on the right, between the map and the chaos bag and feed, which sit at the window's right edge. The column SHALL run from under the top bar down to just above the hand fan's resting cards. Left to right, the desktop SHALL read: the act, agenda and piles; the map; the play strip; the chaos bag and the feed. The engaged enemies and threat-area cards SHALL come first, at the top, then a divider, then the assets. Column cards SHALL be 92 px wide at 1080p when they all fit in the column's height and shrink to no less than 72 px; when they still don't fit, the column SHALL scroll (mouse wheel, drag, touch) while the cards keep 72 px. Exhausted cards SHALL be shown turned sideways. Tokens on the cards (uses, damage, horror, doom, resources) SHALL be visible on them. The column SHALL be hidden while hand-off privacy hides the hand. The camera SHALL keep the strip's and the feed's widths free on the right, so no location is under them when the map is fitted or focused. On the phone the strip stays the right-edge column of thumbnails with its handle.

Cards with a pending option SHALL be highlighted with a slowly pulsing ring, stronger than the hand's static ring, so a card with something to do can be found without hovering and stands apart from exhausted and idle cards. A card's options SHALL be shown as labelled buttons, with the action's icon where it has one ("Fight" with the combat icon, "Evade" with the agility icon), only while the card is hovered, peeked by a tap or has keyboard focus, for one card at a time, stacked in the centre of the card's enlarged hover copy (see Hover enlarge); the buttons MAY be wider than the copy, and stay inside the window. Moving the pointer from the card onto its buttons SHALL keep the copy and the buttons up; leaving both hides them. One click on a button chooses that option. Clicking a card with exactly one option still chooses it, with no need to hover first. On touch, a first tap on a card peeks it, showing the copy with its buttons, and a tap on a button chooses it. The buttons SHALL be hidden while an event is animating, like other options, and MUST NOT cover another card's buttons.

While a fight or evade test is running against a strip enemy and the strip is shown (see Skill-test screen), that enemy SHALL stay highlighted as the test's target. The strip MUST NOT cover the skill-test screen's subject card or its chaos tokens.

#### Scenario: Assets and an enemy

- **WHEN** Roland has a .45 Automatic with 3 ammo and a Machete in play and is engaged with a Ghoul Minion
- **THEN** the column between the map and the feed shows the Ghoul Minion at the top, a divider, then the .45 Automatic with 3 uses on it and the Machete

#### Scenario: Columns in order

- **WHEN** the table is on screen at 1600×900
- **THEN** from left to right: the act, agenda and piles; the map; the play strip; the chaos bag above the feed at the right edge. The feed's left edge is right of the strip's right edge, and neither the strip nor the feed overlaps the right dock

#### Scenario: Fight from the strip

- **WHEN** Roland can fight and evade the engaged Ghoul Minion on his turn and hovers it
- **THEN** the Ghoul Minion's enlarged copy appears centred on the card with "Fight" and "Evade" buttons stacked in its middle, and one click on "Fight" starts the fight test against it

#### Scenario: Pointer onto the buttons

- **WHEN** the player moves the pointer from the hovered Ghoul Minion onto its "Evade" button
- **THEN** the copy and the buttons stay up until the pointer leaves both

#### Scenario: Asset ability

- **WHEN** Roland's .45 Automatic has one pending option (its fight ability)
- **THEN** the card's ring pulses; hovering it shows its copy with a single button with the ability's label in its centre, and clicking the card itself chooses it without hovering

#### Scenario: Nothing to do

- **WHEN** Roland's Machete has no pending option during the mythos phase
- **THEN** the Machete has no ring and no pulse, and hovering it shows the plain copy and details with no buttons

#### Scenario: Many cards

- **GIVEN** 10 cards in Roland's play and threat area, two of them engaged enemies, at 1600×900
- **WHEN** the table is on screen
- **THEN** the two enemies are at the top of the column, the cards are 72 px wide, the column scrolls to the rest, no card covers the map's bottom row or the hand fan's resting cards, and hovering one card shows only that card's buttons

#### Scenario: The map is free

- **GIVEN** Roland with 6 cards in play at 1600×900
- **WHEN** the camera focuses Roland's location
- **THEN** the location is fully visible, clear of the strip, the feed, the hand fan and the stat bar

#### Scenario: On touch

- **WHEN** the player taps a strip card that has two options on a touch screen
- **THEN** its enlarged copy appears with the two buttons in its centre, and a tap on one chooses it

#### Scenario: Target during the test

- **GIVEN** Roland has Physical Training in play, so the strip is shown during the commit window
- **WHEN** the fight test against the Ghoul Minion is in its commit window
- **THEN** the Ghoul Minion in the column is outlined as the target, with no option buttons on it

### Requirement: Hover enlarge

Hovering a card SHALL show an enlarged copy on the spot. That covers:

- enemies and attachments on locations;
- face-up pile tops;
- play-area strip cards;
- cards committed to a skill test.

The act, the agenda and the scenario reference card in the panel SHALL NOT enlarge on hover: the hover highlights them and a tap opens the viewer. The copy SHALL be twice the card's on-screen size, centred on the card and moved just enough to stay inside the window, fully visible. Beside it, the details column SHALL show the same rows as for hand cards (name, class and type, level, cost, traits, slots, icons, health and sanity, uses, rules text with icons). An enemy also shows its fight, health and evade values, its damage and horror, and the damage already on it. The column is placed right of the copy, or left when there is no room, and clamped to the window. The copy and column MUST NOT intercept the pointer, and SHALL disappear when the pointer leaves the card. A location that is not yet revealed shows its unrevealed side.

A strip card's copy is placed like any other card's, centred on the card; when the card has pending options, its buttons are drawn over the copy's centre and do take the pointer (see Play area strip).

Location cards SHALL NOT get the enlarged copy; they show the location details column instead (see Location details).

#### Scenario: Hover a location

- **WHEN** the player hovers the Hallway
- **THEN** no enlarged copy appears; the Hallway is highlighted and its details column appears beside it

#### Scenario: Hover an enemy on a location

- **WHEN** the player hovers a Ghoul Minion sitting on the Cellar
- **THEN** the Ghoul Minion is shown at twice its size, with a column beside it listing fight 2, health 2, evade 2, its 1 damage and 1 horror attack, and its text

#### Scenario: Engaged enemy in the strip

- **WHEN** the player hovers the engaged Ghoul Minion in the strip's column at 1600×900, with Fight and Evade offered
- **THEN** the enlarged copy is centred on the Ghoul Minion, the Fight and Evade buttons sit in the copy's centre, and the details column is beside the copy, all fully inside the window

#### Scenario: Near the edge

- **WHEN** the player hovers a strip card whose copy would run past the window's bottom or the feed's edge
- **THEN** the enlarged copy is moved just enough to stay fully inside the window, the details column goes to whichever side has room, and the buttons stay centred on the copy

#### Scenario: Hover the agenda

- **WHEN** the player hovers the agenda in the panel
- **THEN** no enlarged copy and no column appear; the card is highlighted, and a tap opens the viewer
