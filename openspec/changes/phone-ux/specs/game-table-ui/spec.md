## MODIFIED Requirements

### Requirement: Phone layout mode

On a viewport under 500 px tall, or under 900 px wide in landscape, the table SHALL use the phone layout: the map fills the screen under a single top bar of at most 36 px (the player bar with the phase initials, a journal icon, the chaos bag icon and the fullscreen toggle where the page can go fullscreen); the act, agenda and piles in a left drawer and the Journal in a right drawer, each opened from an edge handle or a swipe and closed by a tap outside; the hand as a bottom drawer (see Hand drawer); the instruction bar above the hand drawer holding its buttons together with Draw, Resource and Investigate; the play strip split as on the desktop: the threat area and engaged enemies as a small row at the top centre under the bar, the cards in play as a column of thumbnails along the left edge, and the undo and camera buttons on the right edge; a tap on any card of either strip (or the column's count) SHALL open that strip's cards large, side by side, each with its pending options as buttons over its centre, its slots, its tokens and whether it is exhausted, and a Close icon; a tap on a card there opens it at full size. While the act or agenda offers an option (Advance act) and the left drawer is closed, its handle SHALL glow and the option SHALL stand as a button beside it. The act, agenda and reference viewer and the introduction's act and agenda SHALL show each card at least 80 % of the screen's height. The showcase (cards just drawn) and the encounter card showcase SHALL show one or two cards at least 85 % of the screen's height, its help line in a column beside them. Every overlay (skill test, showcase, hand-off, titles, tips, modals) SHALL fit the short screen with no scrolling and no element off screen. The map camera SHALL frame locations within the phone insets. Nothing in the rules or the sequence of screens changes between the layouts.

On the phone layout every control SHALL keep a tap target of at least 44 px while its visuals shrink: labels of 13 to 14 px, padding of 4 to 6 px, and an icon alone where the label is already known from its place (undo, camera, journal, bag, fullscreen). The instruction bar SHALL be one line of 15 px with its end caps scaled to the bar's height and an outer margin of 8 px, at most 40 px tall with its buttons; the hand drawer's peek and the camera's bottom inset follow it, so the map keeps the height saved.

#### Scenario: iPhone in landscape

- **WHEN** the game is opened at 852×393
- **THEN** the map fills the screen under a 36 px bar, no panel overlaps another, the instruction bar with Draw, Resource and Investigate sits above the hand drawer, and a location is framed within the visible map

#### Scenario: Drawers

- **WHEN** the player swipes from the left edge
- **THEN** the act, agenda and piles drawer slides in over the map, and a tap outside closes it

#### Scenario: Dense controls

- **WHEN** it is Roland's turn at 852×393
- **THEN** the instruction bar with End turn, Draw, Resource and Investigate is at most 40 px tall, each of its buttons still accepts a tap anywhere in a 44 px square, and the undo and camera buttons show icons alone

#### Scenario: Cards in play on the phone

- **GIVEN** Roland has Knife and Hyperawareness in play and a Ghoul Minion engaged at 852×393
- **WHEN** he taps the Knife's thumbnail in the right column
- **THEN** both cards open large with "Knife: fight" and "Knife: discard to fight" over the Knife's centre and its hand slot under it, while the Ghoul Minion stays in the row at the top centre; a tap on the Ghoul Minion opens the threat area the same way, with Fight and Evade over its centre

#### Scenario: Act ready to advance

- **WHEN** Roland holds enough clues to advance the act at 852×393 with the left drawer closed
- **THEN** the left drawer's handle glows and an Advance button stands beside it; tapping it advances the act

#### Scenario: Act and agenda readable

- **WHEN** the scenario's introduction shows the agenda, or the player opens the act from the left drawer, at 852×393
- **THEN** the card is at least 80 % of the screen's height, with its buttons beside it or its Close pinned at the top

#### Scenario: Desktop unchanged

- **WHEN** the game is opened at 1600×900
- **THEN** the desktop layout is shown as before

### Requirement: Player bar

The top bar SHALL show every investigator in turn order as an avatar (the round class-ringed portrait) with health remaining and sanity remaining under it and, during the investigation phase, their action pips (as the ribbon showed them). The active investigator SHALL be ringed; the investigator whose view is on screen SHALL be marked; defeated or resigned investigators SHALL be greyed. A changed count SHALL flash. The bar replaces the stat dock and the right-edge investigator tokens.

A click on an avatar SHALL only change whose table is shown (see Viewing another investigator); a click on the investigator already on screen does nothing, and a click never opens the sheet. Resting the mouse on the avatar of an investigator who is not on screen for 500 ms SHALL open their sheet: the investigator card (enlargeable), the ability text with any pending option tied to the investigator card, the four skills, resources, clues and the hand count; the sheet closes when the pointer leaves the avatar and the sheet, on Escape, or on a click elsewhere. On a touch screen, where there is no hover, a tap on the avatar of the investigator on screen SHALL open their sheet, and a tap outside or on the avatar again closes it. On the phone layout the sheet SHALL open as a bottom sheet (see the bottom-sheet capability) with the same content, so that it is never cut by the screen's edge; on the desktop it stays the popover anchored under the avatar. A pulsing avatar and an avatar that answers a pending choice keep their tap behaviour.

#### Scenario: Three-player bar

- **WHEN** Roland, Daisy and Agnes play
- **THEN** the bar shows three avatars in turn order with health and sanity under each, Roland's ringed during his turn with three pips, and no tokens on the right edge and no dock at the bottom left

#### Scenario: Own sheet

- **WHEN** Roland, on screen, clicks his own avatar with a mouse
- **THEN** nothing opens; when he rests the mouse on Daisy's avatar for half a second her sheet appears with her card, ability text, skills, resources, clues and hand count, and it closes when the mouse leaves

#### Scenario: Click to look

- **WHEN** Roland clicks Daisy's avatar
- **THEN** the table switches to Daisy's view at once and no sheet opens

#### Scenario: Touch

- **WHEN** Roland taps his own avatar on a phone
- **THEN** his sheet opens as a bottom sheet with its Close control and his card on screen, and a tap on the scrim closes it

### Requirement: New game wizard

Starting a campaign SHALL be a sequence of full-screen steps, one decision each, with a Back control on every step and the choices kept when going back: campaign, investigators, decks, difficulty, ready. Every control SHALL be at least 44 px tall. The investigators step shows the investigators as avatar tiles (the round class-ringed portrait, the name, the class); tapping adds one, up to four, and the order tapped is the turn order, shown as P1 to P4 badges on the tiles; tapping again removes it. The decks step shows, for each chosen investigator, the decks available as cards (the starter decks and any saved custom decks), one selected. The ready step shows the chosen investigators in order as avatars, the chosen bag, and the first scenario's name and icon, with a Begin control that starts the campaign.

On the phone layout the wizard SHALL keep the same steps and controls in a shape that leaves the step's body most of a 393 px tall screen: the step's title and its dots on one row of at most 40 px, with no hint line; the filters of the campaign and investigators steps folded behind one "Filter" chip that expands the filter row in place and shows a count of the filters set; a sticky footer of 48 px with Back and Continue; tiles in a grid of three columns; the campaign sheet and the investigator card opened as a bottom sheet from a tile's details control instead of a sidebar; on the decks step the chosen investigators' avatars and the deck tabs on one horizontal scrolling row, the deck's editing area taking the rest of the body, and the card pool opening full-screen with its own Close; the ready step as one sheet in two columns (the campaign, the investigators and the first scenario beside the bag) that fits the body without scrolling, with up to four investigators. The search field, when the filters are expanded, SHALL not be covered by the on-screen keyboard: the body scrolls it into view.

#### Scenario: Two investigators in order

- **WHEN** the player taps Daisy then Roland on the investigators step
- **THEN** Daisy shows P1 and Roland P2, and the campaign starts with Daisy as the lead

#### Scenario: Going back keeps the picks

- **WHEN** the player chose two investigators, moved to the decks step, and goes back
- **THEN** the two investigators are still selected in the same order

#### Scenario: Begin

- **WHEN** the player taps Begin on the ready screen
- **THEN** the campaign starts with the chosen investigators, decks and difficulty, as the old form did

#### Scenario: Campaign step on a phone

- **WHEN** the wizard opens at 852×393
- **THEN** the title row is at most 40 px, no filter controls are shown but a Filter chip, the tiles fill the body in three columns, and Back and Continue sit in a 48 px footer at the bottom edge

#### Scenario: Investigator details on a phone

- **WHEN** the player taps the details control on Roland's tile at 852×393
- **THEN** his card and text rise in a bottom sheet, and the tile grid stays where it was when the sheet closes

#### Scenario: Deck step on a phone

- **WHEN** the deck step opens with two investigators at 852×393
- **THEN** their avatars and the deck tabs share one horizontal row that scrolls sideways, the editing area fills the body beneath, and the card pool opens full-screen with a Close control

### Requirement: Title screen and settings

The game SHALL open on a title screen: the title, Continue (only while a game, a campaign or a save exists at that moment), New campaign, How to play, and a gear that opens the settings screen. Settings hold language, private hands, drawing tokens by hand, pace, tips, Reset tips, music and sound effects; Back returns to the title. "Draw chaos tokens by hand" SHALL start off on a fresh device; a saved setting keeps its value. The campaign log is reached from Continue when a campaign is between scenarios, and from the game's Menu button. Abandon campaign on the title clears the campaign and the save and leaves the title without Continue; it never needs a reload to take effect. On the phone layout the title's menu SHALL be a compact grid of 44 px buttons with 16 px labels and 6 px gaps, the title heading at most 48 px tall with its rule, so that the whole menu fits a 393 px tall screen without scrolling, and the fullscreen toggle sits in the top-right corner beside the language tabs where the page can go fullscreen.

#### Scenario: Cold load

- **WHEN** the app loads with no save
- **THEN** the title shows New campaign and How to play, no Continue, and the gear

#### Scenario: Continue with a save

- **WHEN** the app loads with a saved scenario in progress
- **THEN** Continue is the first button and restores the game

#### Scenario: Abandon

- **WHEN** the player presses Abandon campaign on the title
- **THEN** the campaign and the save are gone and the title shows no Continue, without a reload; pressing New campaign opens the wizard

#### Scenario: Fresh defaults

- **WHEN** the app loads on a device with no saved settings
- **THEN** Settings shows "Draw chaos tokens by hand" and "Tap decks to draw" both off

#### Scenario: Title on a phone

- **WHEN** the title opens at 852×393 with a save
- **THEN** Continue, New campaign, How to play, Cards and Settings are all on screen with no scrolling

### Requirement: Tap decks to draw setting

The settings SHALL offer "Tap decks to draw", off by default on a fresh device (a saved setting keeps its value) and saved with the other settings, with a hint under it saying what off does (cards are drawn by themselves, nothing to tap). Every scenario the UI starts SHALL ask the engine for tapped decks, so a draw in play is always a recorded "draw" choice; the setting decides who answers it:

- while it is on, the deck waits for the drawing investigator's tap as today: the deck glows, the instruction bar says which deck to tap, and on the phone the drawer's handle glows and the bar offers a Draw button;
- while it is off, the UI SHALL answer the choice itself as soon as it appears, in the same update that produced it: nothing glows, no instruction or Draw button is shown, the table does not switch to the drawing investigator for it, and the cards leave the deck and fly as they do after a tap.

The setting SHALL apply at once in the running game: turning it off while a deck is waiting draws at once; turning it on makes the next draw wait. The automatic answer is recorded like a tap, so saves, bug reports and replays give the same game, and Undo's limits are unchanged (a draw reveals hidden information). A save or imported log whose setup never asked for tapped decks keeps drawing without a choice, whatever the setting.

On the phone layout, where the piles are in the left drawer, the drawer's handle SHALL glow while a deck waits for a tap and the instruction bar SHALL offer a Draw button that chooses the same option, so the drawer needn't be opened. The bar's instruction, its Draw button ("Draw" or "Draw an encounter card") and the piles' names are in the player's language.

#### Scenario: Setting off

- **WHEN** "Tap decks to draw" is off and Roland's upkeep draw comes
- **THEN** the card flies from his deck to his hand without any deck glowing, no "Tap your deck" instruction and no Draw button, and the game's recorded choices hold the draw

#### Scenario: Turned off while a deck waits

- **GIVEN** the setting is on and the encounter deck is waiting for Roland's tap in the mythos phase
- **WHEN** he turns the setting off in the menu and returns to the table
- **THEN** the encounter card is drawn at once and shows in the showcase, with no tap

#### Scenario: Turned on mid-game

- **GIVEN** the setting was off when the scenario started
- **WHEN** the player turns it on and Roland's next upkeep draw comes
- **THEN** his deck glows and waits for the tap

#### Scenario: Save with a waiting draw

- **GIVEN** a save made with the setting on while Roland's deck waited for a tap
- **WHEN** it is loaded with the setting off
- **THEN** the draw happens on load and the table shows the card in his hand

#### Scenario: Replay

- **WHEN** a game played with the setting off is replayed from its setup and recorded choices
- **THEN** it reaches the same state, draws included

#### Scenario: Phone

- **WHEN** a draw waits on a phone with the setting on
- **THEN** the left drawer's handle glows and the instruction bar's Draw button draws the card

#### Scenario: Fresh device

- **WHEN** the app loads with no saved settings and a scenario starts
- **THEN** Roland's first upkeep draw flies to his hand on its own, with no glow and no Draw button
