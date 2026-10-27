## MODIFIED Requirements

### Requirement: Play area strip

On the desktop, the viewing investigator's cards in play and threat area SHALL be shown in two places. The engaged enemies and threat-area cards SHALL form a column of cards on the right, between the map and the chaos bag and feed, which sit at the window's right edge; the column SHALL run from under the top bar down to just above the hand fan's resting cards, with the engaged enemies first. The cards in play (the assets) SHALL form a row at the bottom left, under the piles and over the stat dock, as wide as the stat dock. Left to right, the desktop SHALL read: the act, agenda and piles with the asset row under them; the map; the threat column; the chaos bag and the feed.

Column cards SHALL be 92 px wide at 1080p when they all fit in the column's height and shrink to no less than 72 px; when they still don't fit, the column SHALL scroll (mouse wheel, drag, touch) while the cards keep 72 px.

Asset-row cards SHALL stay 92 px wide however many there are. While they fit side by side they SHALL lie flat with a gap; when they don't, they SHALL overlap evenly, each later card over the one before it, so that every card's left edge stays in view and the whole row stays within the stat dock's width. The row MUST NOT wrap into a second row and MUST NOT scroll. A hovered, peeked or keyboard-focused asset SHALL come to the front of the row, covering its neighbours, while the pointer or focus is on it (its enlarged copy and buttons as in Hover enlarge). Token badges (uses, damage, horror, doom, resources) on asset-row cards SHALL sit at the card's top-left corner, so they stay in view when the card is overlapped; on column cards, piles and copies they stay at the top-right.

Exhausted cards SHALL be shown turned sideways, in the row as in the column. Tokens on the cards SHALL be visible on them. Both the column and the row SHALL be hidden while hand-off privacy hides the hand. The camera SHALL keep the column's and the feed's widths free on the right, so no location is under them when the map is fitted or focused. On the phone the strip stays the right-edge column of thumbnails with its handle, assets and threats together.

Cards with a pending option SHALL be highlighted with a slowly pulsing ring, stronger than the hand's static ring, so a card with something to do can be found without hovering and stands apart from exhausted and idle cards. A card's options SHALL be shown as labelled buttons, with the action's icon where it has one ("Fight" with the combat icon, "Evade" with the agility icon), only while the card is hovered, peeked by a tap or has keyboard focus, for one card at a time, stacked in the centre of the card's enlarged hover copy (see Hover enlarge); the buttons MAY be wider than the copy, and stay inside the window. Moving the pointer from the card onto its buttons SHALL keep the copy and the buttons up; leaving both hides them. One click on a button chooses that option. Clicking a card with exactly one option still chooses it, with no need to hover first. On touch, a first tap on a card peeks it, showing the copy with its buttons, and a tap on a button chooses it. The buttons SHALL be hidden while an event is animating, like other options, and MUST NOT cover another card's buttons.

While a fight or evade test is running against a strip enemy and the strip is shown (see Skill-test screen), that enemy SHALL stay highlighted as the test's target. Neither the column nor the row MUST cover the skill-test screen's subject card or its chaos tokens.

#### Scenario: Assets and an enemy

- **WHEN** Roland has a .45 Automatic with 3 ammo and a Machete in play and is engaged with a Ghoul Minion
- **THEN** the column between the map and the feed shows the Ghoul Minion; the row at the bottom left, under the piles and over the stat dock, shows the .45 Automatic with 3 uses badged at its top-left and the Machete, side by side with a gap

#### Scenario: Columns in order

- **WHEN** the table is on screen at 1600×900
- **THEN** from left to right: the act, agenda and piles with the asset row under them; the map; the threat column; the chaos bag above the feed at the right edge. The feed's left edge is right of the column's right edge, and neither the column nor the feed overlaps the right dock

#### Scenario: Six assets overlap

- **GIVEN** Roland has 6 assets in play at 1600×900
- **WHEN** the table is on screen
- **THEN** the six cards are each 92 px wide, overlap evenly with each later card over the one before, the last card's right edge is at the stat dock's right edge, every card's left edge and token badges are in view, and the row has no scrollbar and no second row

#### Scenario: Hovered asset comes forward

- **GIVEN** Roland has 6 overlapping assets in play
- **WHEN** the player hovers the third one
- **THEN** that card is drawn over its neighbours on both sides, its enlarged copy appears, and the others keep their places; when the pointer leaves, the row returns to its order

#### Scenario: Exhausted in the row

- **GIVEN** Roland has 5 assets in play, two of them exhausted
- **WHEN** the table is on screen
- **THEN** the two exhausted cards lie sideways at the row's bottom edge and overlap with the rest, and the row stays within the stat dock's width

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

- **GIVEN** 8 cards in Roland's threat area, two of them engaged enemies, at 1600×900
- **WHEN** the table is on screen
- **THEN** the two enemies are at the top of the column, the cards are 72 px wide, the column scrolls to the rest, no card covers the map's bottom row or the hand fan's resting cards, and hovering one card shows only that card's buttons

#### Scenario: The map is free

- **GIVEN** Roland with 6 cards in play at 1600×900
- **WHEN** the camera focuses Roland's location
- **THEN** the location is fully visible, clear of the column, the feed, the asset row, the hand fan and the stat bar

#### Scenario: On touch

- **WHEN** the player taps a strip card that has two options on a touch screen
- **THEN** its enlarged copy appears with the two buttons in its centre, and a tap on one chooses it

#### Scenario: Target during the test

- **GIVEN** Roland has Physical Training in play, so the strip is shown during the commit window
- **WHEN** the fight test against the Ghoul Minion is in its commit window
- **THEN** the Ghoul Minion in the column is outlined as the target, with no option buttons on it
