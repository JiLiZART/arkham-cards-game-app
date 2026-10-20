## MODIFIED Requirements

### Requirement: Play area strip
On the desktop, the viewing investigator's cards in play and threat area SHALL be shown as a column of cards at the window's right edge, from under the top bar down to just above the action rail; the chaos bag and the feed sit to its left. The engaged enemies and threat-area cards SHALL come first, at the top, then a divider, then the assets. Column cards SHALL be 92 px wide at 1080p when they all fit in the column's height and shrink to no less than 72 px; when they still don't fit, the column SHALL scroll (mouse wheel, drag, touch) while the cards keep 72 px. Exhausted cards SHALL be shown turned sideways. Tokens on the cards (uses, damage, horror, doom, resources) SHALL be visible on them. The column SHALL be hidden while hand-off privacy hides the hand. The camera SHALL keep the column's width free on the right, so no location is under it when the map is fitted or focused. On the phone the strip stays the right-edge column of thumbnails with its handle.

Cards with a pending option SHALL be highlighted, so a card with something to do can be found without hovering. A card's options SHALL be shown as labelled buttons, with the action's icon where it has one ("Fight" with the combat icon, "Evade" with the agility icon), only while the card is hovered or has keyboard focus, for one card at a time, stacked beside the card on its left, inside the window. One click on a button chooses that option. Clicking a card with exactly one option still chooses it, with no need to hover first. On touch, a first tap on a card shows its buttons and a tap on a button chooses it. The buttons SHALL be hidden while an event is animating, like other options, and MUST NOT cover another card's buttons.

While a fight or evade test is running against a strip enemy and the strip is shown (see Skill-test screen), that enemy SHALL stay highlighted as the test's target. The strip MUST NOT cover the skill-test screen's subject card or its chaos tokens.

#### Scenario: Assets and an enemy
- **WHEN** Roland has a .45 Automatic with 3 ammo and a Machete in play and is engaged with a Ghoul Minion
- **THEN** the column at the right edge shows the Ghoul Minion at the top, a divider, then the .45 Automatic with 3 uses on it and the Machete

#### Scenario: Fight from the strip
- **WHEN** Roland can fight and evade the engaged Ghoul Minion on his turn and hovers it
- **THEN** "Fight" and "Evade" buttons appear to the left of the Ghoul Minion, and one click on "Fight" starts the fight test against it

#### Scenario: Asset ability
- **WHEN** Roland's .45 Automatic has one pending option (its fight ability)
- **THEN** the card glows; hovering it shows a single button with the ability's label, and clicking the card itself chooses it without hovering

#### Scenario: Many cards
- **GIVEN** 10 cards in Roland's play and threat area, two of them engaged enemies, at 1600×900
- **WHEN** the table is on screen
- **THEN** the two enemies are at the top of the column, the cards are 72 px wide, the column scrolls to the rest, no card covers the map's bottom row, and hovering one card shows only that card's buttons

#### Scenario: The map is free
- **GIVEN** Roland with 6 cards in play at 1600×900
- **WHEN** the camera focuses Roland's location
- **THEN** the location is fully visible, clear of the column, the hand fan and the stat bar

#### Scenario: On touch
- **WHEN** the player taps a strip card that has two options on a touch screen
- **THEN** its buttons appear beside it, and a tap on one chooses it

#### Scenario: Target during the test
- **GIVEN** Roland has Physical Training in play, so the strip is shown during the commit window
- **WHEN** the fight test against the Ghoul Minion is in its commit window
- **THEN** the Ghoul Minion in the column is outlined as the target, with no option buttons beside it

### Requirement: Hover enlarge
Hovering a card SHALL show an enlarged copy on the spot. That covers:
- enemies and attachments on locations;
- face-up pile tops;
- play-area strip cards;
- cards committed to a skill test.

The act, the agenda and the scenario reference card in the panel SHALL NOT enlarge on hover: the hover highlights them and a tap opens the viewer. The copy SHALL be twice the card's on-screen size, centred on the card and moved just enough to stay inside the window, fully visible. Beside it, the details column SHALL show the same rows as for hand cards (name, class and type, level, cost, traits, slots, icons, health and sanity, uses, rules text with icons). An enemy also shows its fight, health and evade values, its damage and horror, and the damage already on it. The column is placed right of the copy, or left when there is no room, and clamped to the window. The copy and column MUST NOT intercept the pointer, and SHALL disappear when the pointer leaves the card. A location that is not yet revealed shows its unrevealed side.

A card in the strip's column SHALL have its copy and details column placed to the left of its option buttons, so they never cover them.

Location cards SHALL NOT get the enlarged copy; they show the location details column instead (see Location details).

#### Scenario: Hover a location
- **WHEN** the player hovers the Hallway
- **THEN** no enlarged copy appears; the Hallway is highlighted and its details column appears beside it

#### Scenario: Hover an enemy on a location
- **WHEN** the player hovers a Ghoul Minion sitting on the Cellar
- **THEN** the Ghoul Minion is shown at twice its size, with a column beside it listing fight 2, health 2, evade 2, its 1 damage and 1 horror attack, and its text

#### Scenario: Engaged enemy in the strip
- **WHEN** the player hovers the engaged Ghoul Minion in the strip's column at 1600×900, with Fight and Evade offered
- **THEN** the Fight and Evade buttons are beside the card on its left, and the whole enlarged copy and its details column are further left, past the buttons, fully inside the window

#### Scenario: Near the edge
- **WHEN** the player hovers a strip card in the column at the right edge of the window
- **THEN** the enlarged copy is shifted left and the details column goes to its left, both fully visible

#### Scenario: Hover the agenda
- **WHEN** the player hovers the agenda in the panel
- **THEN** no enlarged copy and no column appear; the card is highlighted, and a tap opens the viewer

### Requirement: Skill-test screen
When a skill test begins (the commit prompt is offered), the UI SHALL open a skill-test screen over the dimmed table and keep it open through the chaos draw until the result is dismissed. The screen SHALL show:
- in the centre, the subject: the card the test is against or comes from (the enemy being fought or evaded, the location being investigated, the treachery or card that called for the test) at a readable size of at least 240×336 px at 1080p, or the investigator's portrait for a test with no card; hovering the card shows its details column (no enlarged copy, the card is already large);
- above the subject, the test's name and line (for example "Investigate: Study · shroud 2");
- to the right of the subject, the placed cards in a row that wraps, each at least 86×120 px, with the icons it contributes to the test and, when several investigators have placed cards, the owner's portrait on each;
- along the bottom, above the hand fan, a calculation strip: the skill with its icon and base value, each placed card with its icons, other modifiers, and the total against the difficulty, updated as cards are placed and taken back.

While the deciding investigator's commit window is open, the subject card SHALL be highlighted like any card with an option, and tapping it SHALL finish committing, exactly as the instruction bar's Done does; Space or Enter does the same. It is not highlighted and does nothing at other times (another investigator's window not on screen, the draw, the result).

The chaos draw and the result play over the subject card: the bag lands on it and the tokens tumble over and around it, and the big total appears over it (see Chaos token draw). The subject stays in place and visible between the tokens.

The hand fan SHALL stay live under the strip: the cards that can be committed are bright and the rest dimmed (the choice spotlight), and a tap commits a card, which flies to the placed cards. A placed card of the deciding investigator SHALL be highlighted as removable while their commit window is open; tapping it returns it to their hand and updates the strip. Cards placed by another investigator, or after the window has closed, can't be taken back.

While the tester's own commit window is open and nothing hidden has come out since the test began (it started from a choice of their turn, such as Fight or Investigate), the screen SHALL offer Cancel the test beside the line, and Escape does the same: every choice since the test began is taken back, the action and the cards placed included, and the turn is as it was before it, so the player can do something else first (play a fast card, use an asset, take another action). A test forced by a card (a treachery drawn) can't be cancelled.

The instruction bar SHALL stay above the screen with its instruction and the Done button. While one of the play strip's cards has an option offered right now (a fast ability in the commit window), the strip's column SHALL be shown above the overlay, clickable, and dimmed except the cards whose option is offered, so an in-play ability can be used during the test. At every other moment of the test (the token draw, the result, a commit window with no in-play ability offered) the column SHALL step aside: it slides out past the window's right edge and fades, takes no pointer, and comes back when the screen closes. The strip MUST NOT cover the subject card or a chaos token disc at any window size.

The subject card SHALL keep its 240×336 px size and its place under the line on every desktop window: the strip's column is at the right edge, clear of the centre, so nothing below the subject has to be avoided.

After the tester's Done, each other investigator at the location who may commit SHALL be asked in turn on the same screen; with private hands the hand-off box appears over the screen, and the next player's fan comes in once they are ready. The placed cards and the strip keep everyone's contributions.

#### Scenario: Commit from the fan
- **WHEN** Roland (combat 4) fights a Ghoul Minion (fight 2) and taps Vicious Blow (1 combat icon) in his fan
- **THEN** Vicious Blow flies to the placed cards with "+1 [combat]", the strip reads "[combat] 4 + 1 = 5 vs 2", and the Ghoul Minion card is the subject in the centre

#### Scenario: Take a card back
- **WHEN** Roland, still deciding, taps the placed Vicious Blow
- **THEN** it flies back into his fan, the strip reads "4 vs 2", and Vicious Blow is bright in the fan again

#### Scenario: A helper's card
- **WHEN** Roland presses Done and Daisy, at the same location, is asked to commit
- **THEN** the screen stays with Roland's Vicious Blow marked with his portrait, Daisy's fan comes in (after the hand-off box when hands are private), a card she places shows her portrait, and she can take back hers but not his

#### Scenario: An ability from play
- **WHEN** Roland has Physical Training in play during a willpower test
- **THEN** Physical Training is bright and clickable in the strip above the overlay while the other strip cards are dimmed, and using it adds its bonus to the calculation strip

#### Scenario: A test with no card
- **WHEN** a scenario effect calls for a plain willpower test
- **THEN** the subject is Roland's portrait and the line reads "Willpower test · 3 vs 3"

#### Scenario: Tap the subject to finish
- **WHEN** Roland has placed Vicious Blow in his fight against the Ghoul Minion
- **THEN** the Ghoul Minion card in the centre is highlighted, and tapping it ends his commit window as Done does, and the draw begins

#### Scenario: Cancel a fight
- **WHEN** Roland chooses to fight the Ghoul Minion, places Vicious Blow, then presses Cancel the test
- **THEN** the screen closes, Vicious Blow is back in his hand, he has the action back, and he can play a fast card before fighting again

#### Scenario: A treachery's test can't be cancelled
- **WHEN** Roland's test comes from Rotting Remains drawn in the mythos phase
- **THEN** no Cancel the test is offered

#### Scenario: Subject in the centre
- **WHEN** Roland investigates the Study at 1600×900
- **THEN** the Study card stands in the centre of the screen at least 240 px wide with the line above it, the placed cards to its right, the strip along the bottom, and when the draw starts the bag lands on the Study and the tokens tumble over it

#### Scenario: Tokens are free to pick
- **GIVEN** Roland has a .45 Automatic and a Machete in play and is engaged with a Ghoul Minion, at 1600×900
- **WHEN** he investigates the Study, presses Done, and the tokens spill
- **THEN** the play strip has stepped aside, every face-down disc is visible and a tap on any of them picks it

#### Scenario: Nothing to use, nothing in the way
- **GIVEN** Roland has only a Machete in play, which has no ability usable during the test
- **WHEN** his investigate test opens its commit window
- **THEN** the play strip has stepped aside and the Study card in the centre is fully visible and tappable

#### Scenario: Back after the test
- **WHEN** the result is dismissed and the skill-test screen closes
- **THEN** the column is back at the right edge

#### Scenario: Short window
- **GIVEN** Roland has Physical Training in play during a willpower test at 1600×900
- **WHEN** the commit window is open
- **THEN** the column at the right edge shows Physical Training bright, and the subject card is 240×336 px in the centre, clear of the column and its buttons
