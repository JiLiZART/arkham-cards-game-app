# game-table-ui Specification

## Purpose
The WebGL card table and HUD that players use to play hot-seat: what is shown, how cards move and animate, and how choices are offered.

## Requirements

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

### Requirement: Investigate in the action rail
Whenever the investigator whose turn it is may investigate their location, the action rail SHALL show an Investigate button with the intellect icon beside Draw and Gain resource. The button carries the action-cost marker the other rail buttons use. Clicking it takes the Investigate action, exactly as clicking the location does. The button is absent when investigating isn't legal, for example at an unrevealed location or one that cannot be investigated.

#### Scenario: Roland in the Study
- **WHEN** it is Roland's turn in the revealed Study with actions left
- **THEN** the rail shows Investigate next to Draw and Gain resource, and clicking it starts the intellect test against the Study's shroud

### Requirement: Effect hits
When a card's effect makes an investigator take damage or horror, or lose resources, clues or actions, the table SHALL show where it came from:
1. The source card pulses red, wherever it is shown: a location on the map, a card in a threat area, an enemy, or the card being resolved.
2. A streak flies from the source to that investigator's portrait. When the portrait isn't visible, it goes to their row in the investigator list.
3. The investigator's numbers change as the streak lands, with the existing floating "−N" numbers.

Hits from the same effect play together, and hits from different effects play one after another. Effects without a source card on the table, such as a chaos token's effect, show only the floating numbers, as before. Under reduced motion only the pulse and the numbers are shown.

#### Scenario: Entering the Attic
- **WHEN** Roland moves into the Attic and its forced ability deals him 1 horror
- **THEN** the Attic pulses, a streak flies from the Attic to Roland's portrait, and his horror goes up by 1 as it lands

#### Scenario: Treachery in the threat area
- **WHEN** a treachery in Daisy's threat area makes her lose 1 resource at the end of her turn
- **THEN** the treachery pulses in her strip and a streak flies to her portrait

### Requirement: Phase pacing on screen
When a phase begins in a paced game, its title SHALL stay across the middle of the screen with the round under it and the lead investigator's avatar ringed by a countdown. When the ring closes (3 seconds) the phase begins by itself; a tap on the avatar, or Space or Enter, begins it sooner. A phase with nothing to show SHALL begin at once, with no title and no avatar: an enemy phase in which no enemy in play is ready and either engaged or a hunter. The pause is an ordinary choice of the lead investigator, made by itself when it isn't made sooner, so saves, replays and Undo see it like any other.

Titles never stack: the next phase's title can appear only after the previous phase has begun and resolved, and after the chaos draws, test results and encounter reveals it waits for.

Games that aren't paced, such as old saves or imported logs that have no pauses, keep the timed title that fades by itself.

#### Scenario: End of the investigation phase
- **WHEN** the last investigator ends their turn in round 1 with an enemy engaged with them
- **THEN** "Enemy phase · Round 1" stays on screen with Roland's avatar and its countdown, and no enemy attacks yet
- **WHEN** the countdown closes, or Roland's avatar is tapped
- **THEN** the title goes and the enemy phase resolves

#### Scenario: Private hands
- **WHEN** Daisy's hand was last on screen while Roland is the lead investigator
- **THEN** the phase title with Roland's avatar shows without any hand-off screen

#### Scenario: Nothing in the enemy phase
- **WHEN** the investigation phase ends with no enemy in play
- **THEN** no enemy phase title shows and the upkeep phase's title follows at once

### Requirement: Undo
The HUD SHALL offer an Undo button, and Ctrl/Cmd+Z, whenever the last recorded choice can be taken back. Undo removes the last choice and rebuilds the game from the scenario setup and the remaining choices, so the result is identical to never having made it. Pressing it again takes back the choice before that, and so on.

Undo cannot go past a choice that revealed hidden information: drawing a chaos token, drawing or revealing a card from any deck, looking at or searching a deck, shuffling, or anything else random. It also cannot go into the mulligan or the scenario introduction. When nothing can be undone the button is disabled, and its tooltip says why ("hidden information was revealed").

After an undo:
- cards that changed place fly back, for example a committed card to the hand or a played asset to the fan;
- the action feed and journal drop the undone entries;
- event animations still waiting are dropped;
- when hands are private and the undo hands the choice to another investigator, the hand-off screen appears.

Undo is also recorded in the save, because the save holds the shortened list of choices.

#### Scenario: A committed card by mistake
- **WHEN** Roland fights the Ghoul and commits Vicious Blow
- **THEN** Undo is enabled
- **WHEN** he presses Undo
- **THEN** Vicious Blow is back in his hand and the commit window is still open

#### Scenario: Undoing the action itself
- **WHEN** Roland presses Undo again
- **THEN** the Fight action is not taken and his action count is restored

#### Scenario: Another investigator still to commit
- **WHEN** Daisy is still to commit to Roland's test after Roland pressed Done
- **THEN** Undo reopens Roland's commit window

#### Scenario: After the token
- **WHEN** the last commit window closes (the chaos token is drawn by that same choice, even while the draw animation is still to play)
- **THEN** Undo is disabled, and the tooltip says hidden information was revealed

### Requirement: Chaos bag entrance
When a chaos token is drawn by hand, the chaos bag SHALL grow out of the chaos-bag button into the middle of the screen over about 450 ms. The token circles then fade in, and only then can one be picked. After the token has flown to the skill-test panel, the bag shrinks back into the button.

The automatic draw likewise shows a small bag coming out of the button before the token pops out of it. Under reduced motion the bag appears without growing.

#### Scenario: Drawing by hand
- **WHEN** Roland's investigate test reaches the token draw
- **THEN** the bag grows from the chaos-bag button to the centre, and the circles appear once it is there
- **WHEN** he clicks a circle
- **THEN** the token flies to the skill-test panel, and the bag shrinks back into the button

### Requirement: Act and agenda buttons on the card
Each option on the current act or agenda SHALL be shown as a button laid over the lower part of that card in the act/agenda panel; Advance act is an example. Clicking the button chooses the option directly, and clicking the rest of the card still opens the viewer. Buttons that don't fit stack upward over the card. In the act and agenda viewer, the same buttons sit over the current card instead of in the side column.

#### Scenario: Advance the act from the panel
- **WHEN** the group has enough clues to advance act 1
- **THEN** an "Advance act" button shows over the act card in the panel, and clicking it advances the act without opening the viewer

#### Scenario: In the viewer
- **WHEN** the act viewer is open while the act can be advanced
- **THEN** the "Advance act" button is over the current act card in the list

### Requirement: Table layout
The game screen SHALL be a full-width, full-height map viewport rendered in WebGL with a top-down orthographic camera (cards appear flat, with no perspective). The viewport SHALL contain only the location map:
- locations and their connections;
- enemies and attachments at locations, including enemies engaged with other investigators, marked with that investigator's portrait;
- investigator portrait markers.

The table surface SHALL show the framed play-area background behind the map.

All other game objects SHALL be fixed HUD panels drawn over the viewport, which do not move when the map is panned or zoomed:
- act, agenda, encounter deck, encounter discard, victory display, and the viewer's deck and discard (see "Scenario and deck panels");
- the chaos bag in the top-right corner (see "Chaos bag modal");
- the other investigators' tokens (see "Other investigators");
- the viewer's play area and threat area (see "Play area strip");
- the hand fan, the stat bar, the action rail and the prompt banner.

The viewing investigator's investigator card SHALL NOT be drawn; the stat bar replaces it. No action sidebar SHALL cover the screen.

#### Scenario: Four-player table
- **WHEN** a 4-investigator scenario is running
- **THEN** the map fills the window behind the HUD, the HUD panels and the three other investigators' tokens are visible, and the active investigator is highlighted

#### Scenario: HUD stays put
- **WHEN** the player pans or zooms the map
- **THEN** the act, agenda, piles, chaos bag, play area strip, stat bar, hand and rail stay where they are

#### Scenario: Window resize
- **WHEN** the browser window changes from 1600×900 to 1280×800
- **THEN** the viewport fills the new window and every HUD panel is still fully visible

#### Scenario: No viewer investigator card
- **WHEN** Roland Banks is the viewing investigator
- **THEN** his investigator card is not drawn anywhere on the table, and his stats are shown in the stat bar

### Requirement: Card interaction
Players SHALL be able to:
- hover any card to see it enlarged in place with its details (see "Hover enlarge");
- click a hand card, or drag it upward out of the fan, to play it;
- click a location to move or investigate;
- click an enemy to fight, evade or engage;
- click abilities on cards in play;
- click the act, the agenda, a face-up pile or the stat-bar portrait to open the card detail modal;
- click the chaos bag to open the chaos bag modal.

Only legal interactions MUST be enabled and highlighted. When a card offers several actions, clicking it SHALL show a menu of those actions. On the map, a press that moves more than a few pixels SHALL pan the map and MUST NOT count as a click.

#### Scenario: Drag to play
- **WHEN** the active player drags a playable asset upward out of the hand fan and releases it over the table
- **THEN** the Play action is submitted and the card appears in the play area strip

#### Scenario: Illegal target
- **WHEN** a player hovers a location not connected to their current one
- **THEN** it is not highlighted as a move target and clicking does nothing

#### Scenario: Several actions on one card
- **WHEN** the investigator's own location can be investigated and also has an ability
- **THEN** clicking it opens a menu listing "Investigate" and the ability

#### Scenario: Pan is not a click
- **WHEN** the player presses on the Study, drags 100 px and releases
- **THEN** the map pans and no action is taken

### Requirement: Prompts and choices
Every pending engine choice SHALL be presented without a sidebar:
- a one-line prompt banner names the deciding investigator and the question;
- options tied to a card are offered on that card: in the hand fan, on the map, in the HUD panels, the play area strip or the card detail modal;
- options tied to no card are offered on the action rail.

Every option of the pending choice MUST be reachable this way. Skill tests SHALL show a commit window, then the chaos token draw (see "Chaos token draw"), then the calculation (skill + modifiers vs difficulty) before applying results.

#### Scenario: Skill test display
- **WHEN** a token is revealed
- **THEN** it is revealed through the chaos token draw, and the result panel shows e.g. "3 + 1 (committed) − 2 (token) = 2 vs 2 → Success"

#### Scenario: Every option reachable
- **WHEN** any choice is pending during an automated playthrough of The Gathering
- **THEN** each of its options can be found on a hand card, a map card, a HUD panel, the play area strip, a modal or the action rail

### Requirement: Animations follow the event log
Card movement, damage, clue and doom changes SHALL be animated in the order of engine events, and input MUST be blocked while animations that precede a choice are playing.

#### Scenario: Encounter draw
- **WHEN** an investigator draws an encounter card in the mythos phase
- **THEN** the card flies from the encounter deck, flips and waits in the showcase for the player's tap, then resolves and moves to its destination

### Requirement: Hot-seat play
The UI SHALL support 1–4 investigators on one device. The deciding investigator's view (hand, play area, choices) is the default; any investigator can be looked at from the player bar. No screen SHALL stand between players: when the decision passes to another investigator, their view is shown at once, with the turn title (see Turn title) announcing them, and their hand is visible.

#### Scenario: Turn handoff
- **WHEN** Roland ends his turn and Agnes is next
- **THEN** "Agnes's turn" plays across the middle and Agnes's hand and play area are shown with her avatar marked in the bar, with nothing to press

### Requirement: Game menus
The UI SHALL provide screens for: the title screen, a new-campaign wizard (campaign, investigators, decks, difficulty, ready), continue saved game, campaign log between scenarios, how to play, and settings including language selection. Wherever an investigator is chosen or shown in these screens, they SHALL appear as their avatar: the round portrait with the class ring, as on the map.

#### Scenario: Continue game
- **WHEN** a saved game exists and the player opens the app
- **THEN** a "Continue" option resumes it

#### Scenario: Avatars in the campaign log
- **WHEN** the campaign log lists the investigators between scenarios
- **THEN** each is shown with their avatar, trauma and experience beside it

### Requirement: Performance
The table SHALL render at 60 fps on a mid-range laptop with up to 4 investigators and ~80 cards on the table, using texture caching for card images.

#### Scenario: Full table
- **WHEN** a 4-player Devourer Below scenario is in progress
- **THEN** the frame rate stays at or above 50 fps on a 2020-era integrated GPU

### Requirement: Hand fan
The viewing investigator's hand SHALL be shown as a fan of cards along the bottom edge of the screen, outside the WebGL viewport. Cards overlap, are rotated along an arc, and partly extend below the screen edge, like Hearthstone.

Hand cards at rest SHALL be 225 px wide by 315 px tall at 1080p. The card under the pointer, or the focused card, SHALL show unrotated at 1.28× its resting size (about 288×403 px), fully on screen. When the window is too short for that, it SHALL show as large as fits the window height.

Every hand card SHALL carry a glance badge along its top edge: up to three chips, each an icon with a number where one applies, saying what the card is useful for, in this order of priority: what its play or ability does (fight as the combat icon, investigate as the intellect icon, evade as the agility icon, damage dealt as the damage icon with the amount, healing as the health or sanity icon with the amount, clues as the clue icon with the amount, cards drawn as the card icon with the amount, resources gained as the resource icon with the amount), then the skill icons the card commits, merged by skill with their count. Cost is not repeated. Chips are derived from the card's data, with a per-card override for cards the data cannot describe; when nothing can be derived the card has no badge. Hovering a chip names it. The badge stays on the card at every size, including hovered.

While the pointer is over the fan, the fan SHALL magnify like the macOS Dock: the card under the pointer is the largest and highest, its neighbours are raised and enlarged a little, and the effect falls off smoothly with horizontal distance from the pointer (about one and a half card widths). Sizes and lifts SHALL follow the pointer continuously and ease into place, with no snapping when the pointer passes from one card to the next. When the pointer leaves the fan, every card SHALL ease back to its resting place.

When a choice is pending, every hand card that has an option in it (play, commit and so on) SHALL rise above the fan and be highlighted. The other cards stay down.

The fan MUST stay usable with 1 to 12 cards by tightening the overlap as the hand grows.

#### Scenario: Read a card in hand
- **WHEN** the player hovers the third card of a 7-card hand at 1920×1080
- **THEN** that card is shown unrotated at about 288×403 px, fully on screen, above everything else

#### Scenario: Sweep across the fan
- **WHEN** the player moves the pointer slowly from the leftmost to the rightmost card of a 7-card hand
- **THEN** the magnification travels with the pointer: each card grows as the pointer approaches and shrinks as it moves away, the neighbours of the card under the pointer are slightly raised, and no card jumps between sizes

#### Scenario: Pointer leaves
- **WHEN** the pointer leaves the fan upward onto the map
- **THEN** all cards ease back to their resting arc

#### Scenario: Short window
- **WHEN** the player hovers a hand card in an 800 px tall window
- **THEN** the card is shown as tall as the window allows, fully visible

#### Scenario: Playable cards rise
- **WHEN** it is Roland's turn and 2 of his 5 hand cards can be played
- **THEN** those 2 cards rise above the fan and are highlighted, and the other 3 stay down

#### Scenario: Commit window
- **WHEN** a skill test opens its commit window
- **THEN** the cards that can be committed rise, and clicking one commits it

#### Scenario: Large hand
- **WHEN** the hand holds 12 cards
- **THEN** all 12 cards are reachable by hovering, and none is hidden completely behind its neighbours

#### Scenario: Keyboard
- **WHEN** the player tabs to a hand card and presses Enter
- **THEN** it is raised and, if it is playable, its play action is chosen

#### Scenario: Glance badge of a weapon
- **WHEN** Machete (fight, +1 damage, 1 combat icon) is in Roland's hand
- **THEN** its top edge shows "[combat]", "[damage] +1" and "[combat] 1", in that order

#### Scenario: Glance badge of a skill card
- **WHEN** Vicious Blow (1 combat icon, +1 damage on a successful attack) is in hand
- **THEN** its badge shows "[damage] +1" and "[combat] 1"

#### Scenario: Nothing to say
- **WHEN** a card's data yields no chip and it has no override
- **THEN** it shows no badge

### Requirement: Action rail
Options of the pending choice that are tied to no card SHALL be shown as a vertical rail of buttons on the right side of the screen, next to the hand. Examples are Draw, Gain resource, End turn, Done, Skip and Mulligan. Each button SHALL show an icon and a short label, and its label SHALL be translated. The primary option of the choice (End turn, Done or Pass) SHALL be visually distinct. The rail SHALL be hidden while hand-off privacy hides the hand.

#### Scenario: Turn actions
- **WHEN** it is Roland's turn with 3 actions left
- **THEN** the rail shows "Draw", "Resource" and "End turn" with icons, and Move, Investigate and Fight are offered on the map and enemy cards instead

#### Scenario: Hidden during hand-off
- **WHEN** the "Pass to Agnes" screen is shown
- **THEN** the rail shows no buttons

### Requirement: Card detail modal
Clicking the act, the agenda, the encounter discard, the victory display or the stat-bar portrait SHALL open a modal showing that card at full size with readable text, its tokens, and the pending options tied to it as buttons. For the act and the agenda, the modal SHALL show both sides of the card side by side: the front, and the back with its resolution text. Choosing an option SHALL submit it and close the modal. The modal SHALL close on Escape or on a click outside it.

#### Scenario: Advance the act
- **WHEN** the investigators have enough clues and the act offers "Advance"
- **THEN** the act in the top-left panel is highlighted, and clicking it opens the modal with both sides of the act and an "Advance" button that advances the act

#### Scenario: Read the agenda
- **WHEN** the player clicks the agenda while no option is tied to it
- **THEN** the modal shows the agenda's front with its doom count and its back side, and has no option buttons

### Requirement: Investigator markers on the map
Each investigator's position on the map SHALL be shown on their location card as a small round portrait of that investigator, cropped from the investigator card art, instead of initials. The portrait has a class-coloured ring. The active investigator's portrait SHALL be highlighted. Several investigators at one location SHALL be offset so all portraits stay visible. Hovering a portrait SHALL show the investigator's name. If the art cannot load, the portrait MUST fall back to the initials disc.

#### Scenario: Daisy at the Study
- **WHEN** Daisy Walker is at the Study
- **THEN** a small round portrait of Daisy sits on the Study card, and no "DW" initials are shown

#### Scenario: Shared location
- **WHEN** Roland and Daisy are both in the Hallway
- **THEN** both portraits are visible on the Hallway card without covering each other

#### Scenario: Art offline
- **WHEN** the investigator image cannot be loaded
- **THEN** the marker shows the investigator's initials in the class-coloured disc

### Requirement: Drag to move
During their turn, the deciding investigator SHALL be able to drag their own portrait marker from their location to another location card to move there, at any zoom level. While dragging:
- every location the investigator can legally move to SHALL be highlighted;
- the location under the pointer SHALL be emphasised if it is legal;
- the map MUST NOT pan.

Dropping on a highlighted location SHALL submit the same Move action as clicking that location. Dropping anywhere else, or pressing Escape, SHALL return the portrait to its location with no action taken. Other investigators' markers, and markers when no move is available, MUST NOT be draggable. A click without movement keeps the existing click behaviour.

#### Scenario: Drag to a connected location
- **WHEN** Roland is in the Study on his turn and drags his portrait onto the Hallway
- **THEN** while dragging, the Hallway (and any other legal destination) is highlighted, and on drop the Move action is taken and Roland's marker sits on the Hallway

#### Scenario: Zoomed out
- **WHEN** Roland zooms out to the whole map and drags his portrait to a legal location two cards away on screen
- **THEN** the destination is highlighted and the drop moves him there

#### Scenario: Illegal drop
- **WHEN** Roland drops his portrait on a location that is not connected to his own
- **THEN** that location was never highlighted, the portrait snaps back, and no action is taken

#### Scenario: Not your marker
- **WHEN** Roland tries to drag Daisy's portrait
- **THEN** it does not move, and the map pans instead

### Requirement: Map viewport
The player SHALL be able to pan the map by dragging empty table or any card with the mouse, and zoom it with the mouse wheel or a pinch, anchored at the pointer. Zoom MUST be limited:
- at the far end, so the whole map fits the window;
- at the near end, so a location is about twice hand-card size.

Panning MUST keep part of the map on screen.

By default the camera SHALL centre on the deciding investigator's location (the active investigator's when no one is deciding), zoomed so that location is about 420 px tall at 1080p. The camera SHALL glide back to that view when:
- the deciding investigator changes;
- that investigator moves to another location;
- the player presses "Focus".

A "Whole map" control SHALL zoom out to fit every location. The camera MUST NOT re-centre on its own while the player is dragging or within a moment of their last pan or zoom.

#### Scenario: Default view
- **WHEN** Roland's turn starts in the Study at 1920×1080
- **THEN** the Study is centred in the viewport and drawn about 420 px tall

#### Scenario: Zoom out and back
- **WHEN** the player scrolls the wheel down until the zoom stops, then presses "Focus"
- **THEN** the whole map is visible at the far limit, and "Focus" glides back to Roland's location at the default zoom

#### Scenario: Follow the decision
- **WHEN** control passes from Roland in the Study to Daisy in the Hallway
- **THEN** the camera glides to the Hallway

#### Scenario: Whole map
- **WHEN** the player presses "Whole map" in The Midnight Masks
- **THEN** all revealed and unrevealed locations fit inside the viewport

### Requirement: Scenario and deck panels
The act and the agenda SHALL be shown as small landscape cards, the right way up, in a fixed panel at the top-left of the screen. Doom on the agenda, clues needed for the act, and any other tokens on them SHALL show on these cards.

Below them, a fixed column on the left side SHALL show these piles, each with its count:
- encounter deck, face down;
- encounter discard, top card face up;
- victory display;
- any scenario side decks;
- the viewing investigator's deck and discard.

Piles SHALL stay at their size and position while the map moves. Cards with a pending option tied to them SHALL be highlighted. A deck with a pending option that draws from it (the Draw action on the investigator's deck, a waiting draw on the investigator's deck or the encounter deck) SHALL be highlighted the same way, and tapping it chooses that option; the rest of the table dims as for any choice.

#### Scenario: Panels visible while panning
- **WHEN** the player zooms into the far corner of the map
- **THEN** the act, agenda and piles are still at the top-left and left of the screen

#### Scenario: Act ready to advance
- **WHEN** the act can be advanced
- **THEN** the act card in the top-left panel is highlighted

#### Scenario: Deck ready to draw
- **WHEN** it is Roland's turn with an action left
- **THEN** his deck pile is highlighted, and tapping it draws a card as the rail's Draw does

#### Scenario: Encounter deck waits
- **WHEN** the mythos phase waits for Roland's encounter draw
- **THEN** the encounter deck is highlighted, the map and hand dim, the instruction bar reads "Tap the encounter deck to draw", and tapping the pile draws the card, which then shows in the showcase as before

### Requirement: Chaos bag modal
The chaos bag SHALL be shown in the top-right corner of the screen with its token count. Clicking it SHALL open a modal listing every token currently in the bag, grouped by kind, each with its icon and count, for example −1 ×3. Sealed or removed tokens are not listed. The modal SHALL also show the scenario reference card for the current difficulty, which explains the special tokens. The modal SHALL close on Escape or on a click outside it.

#### Scenario: Standard bag
- **WHEN** the player clicks the chaos bag in The Gathering on Standard
- **THEN** the modal lists +1 ×1, 0 ×2, −1 ×3, −2 ×2, −3 ×1, −4 ×1, skull ×2, cultist ×1, tablet ×1, auto-fail ×1 and elder sign ×1, next to The Gathering's reference card

### Requirement: Hover enlarge
Hovering a card SHALL show an enlarged copy on the spot. That covers:
- enemies and attachments on locations;
- face-up pile tops;
- play-area strip cards;
- cards committed to a skill test.

The act, the agenda and the scenario reference card in the panel SHALL NOT enlarge on hover: the hover highlights them and a tap opens the viewer. The copy SHALL be twice the card's on-screen size, centred on the card and moved just enough to stay inside the window, fully visible. Beside it, the details column SHALL show the same rows as for hand cards (name, class and type, level, cost, traits, slots, icons, health and sanity, uses, rules text with icons). An enemy also shows its fight, health and evade values, its damage and horror, and the damage already on it. The column is placed right of the copy, or left when there is no room, and clamped to the window. The copy and column MUST NOT intercept the pointer, and SHALL disappear when the pointer leaves the card. A location that is not yet revealed shows its unrevealed side.

Location cards SHALL NOT get the enlarged copy; they show the location details column instead (see Location details).

#### Scenario: Hover a location
- **WHEN** the player hovers the Hallway
- **THEN** no enlarged copy appears; the Hallway is highlighted and its details column appears beside it

#### Scenario: Hover an enemy on a location
- **WHEN** the player hovers a Ghoul Minion sitting on the Cellar
- **THEN** the Ghoul Minion is shown at twice its size, with a column beside it listing fight 2, health 2, evade 2, its 1 damage and 1 horror attack, and its text

#### Scenario: Engaged enemy in the strip
- **WHEN** the player hovers the engaged Ghoul Minion in the play strip at 1600×900
- **THEN** the whole enlarged copy is visible above the strip, none of it below the window edge, and the details column is beside it

#### Scenario: Near the edge
- **WHEN** the player hovers a play-strip card touching the right edge of the window
- **THEN** the enlarged copy is shifted left and the details column goes to its left, both fully visible

#### Scenario: Hover the agenda
- **WHEN** the player hovers the agenda in the panel
- **THEN** no enlarged copy and no column appear; the card is highlighted, and a tap opens the viewer

### Requirement: Play area strip
The viewing investigator's cards in play and threat area SHALL be shown as a fixed strip of cards above the hand fan, between the stat bar and the action rail. Threat-area cards and engaged enemies come after the assets, separated from them. Strip cards SHALL be at least 124×173 px at 1080p and shrink only when the strip would not fit in its width. Exhausted cards SHALL be shown turned sideways. Tokens on the cards (uses, damage, horror, doom, resources) SHALL be visible on them. The strip SHALL be hidden while hand-off privacy hides the hand.

Cards with a pending option SHALL be highlighted. Each of their options SHALL be shown as a labelled button directly above the card, with the action's icon where it has one, for example "Fight" (combat icon) and "Evade" (agility icon) above an engaged enemy. One click on a button chooses that option; no menu or second click is needed. Clicking a card with exactly one option still chooses it. The buttons MUST stay inside the window and MUST NOT cover the neighbouring cards' buttons. They SHALL be hidden while an event is animating, like other options.

While a fight or evade test is running against a strip enemy, that enemy SHALL stay highlighted as the test's target.

#### Scenario: Assets and an enemy
- **WHEN** Roland has a .45 Automatic with 3 ammo and a Machete in play and is engaged with a Ghoul Minion
- **THEN** the strip shows the two assets, the .45 Automatic with 3 uses on it, then the Ghoul Minion after a separator

#### Scenario: Fight from the strip
- **WHEN** Roland can fight and evade the engaged Ghoul Minion on his turn
- **THEN** "Fight" and "Evade" buttons are shown above the Ghoul Minion, and one click on "Fight" starts the fight test against it

#### Scenario: Asset ability
- **WHEN** Roland's .45 Automatic has one pending option (its fight ability)
- **THEN** a single button with the ability's label sits above the card, and clicking the card itself also chooses it

#### Scenario: Target during the test
- **WHEN** the fight test against the Ghoul Minion is in its commit window
- **THEN** the Ghoul Minion in the strip is outlined as the target, with no option buttons above it

### Requirement: Chaos token draw
When a skill test reveals a chaos token, the draw SHALL play as a stage of the skill-test screen over the subject card in the centre, with the subject, the placed cards and the calculation strip staying where they were:
1. The chaos bag is tossed onto the table: it flies from its button in an arc, lands on the lower part of the subject card with a bounce and a squash, and tips over on its side with its mouth open. The tokens tumble out of the mouth in a burst: each leaves low on its own arc and keeps its speed in the air, spinning and tumbling in perspective so its edge shows, hits the table, bounces once or twice with less height and speed each time, slides to a stop and wobbles flat like a coin settling, at its own place over or around the subject card (the resting places cover the card and the space beside it, so the card stays visible between them), tilting flat as it settles; later tokens leave a few milliseconds after earlier ones, so they come out as a stream. Each token is shown face down as a plain cream chaos token, the colour of the real tokens, with no symbol, a slightly darker rim and a visible edge when tilted, casting a shadow on the table that falls further away and fainter the higher it is, the size of a revealed token, one per token currently in the bag. The whole toss takes about 1.2 seconds at the Slow and Tap paces and about 0.9 seconds at the Normal pace, plays on every draw, and the paths are seeded by the test so a reload tosses the same way. Under reduced motion the bag and tokens simply appear in place.
2. The deciding player taps any disc. Space or Enter picks one too.
3. The chosen disc flips in place, revealing the token's real art on its face, while the other discs fade. The token then slides into the calculation strip, where its modifier (or "auto-fail" / "elder sign" effect) joins the sum.
4. The screen moves to its result stage over the subject card: the big total, below it Success or Fail in big text, below that a Continue button; bottom centre, the arithmetic as icons, for example "[intellect] 3 + [token −1] + [card] 2 = 4 vs 2". It stays until Continue is pressed.

The draw SHALL NOT start until the screen has settled: every earlier animated event has finished, every card still flying (a card drawn, played, spawned or put into play, an encounter card being revealed) has landed, and about 0.4 s has passed after that. If something keeps animating, the draw starts anyway after at most 4 seconds, so the game can never stall.

Which token comes out MUST NOT depend on the disc tapped. The engine's seeded draw decides it, so saved games and action-log replays stay exact.

When a test reveals more than one token, each is drawn the same way in turn. Bot play and the debug "skip" bypass the interaction. With the menu setting "Draw chaos tokens by hand" off, the discs do not spill: one token flips straight out of the bag and slides into the strip without waiting for a tap, after the screen has settled the same way; the result stage then closes on its own after a short pause (or waits for a tap at the Tap pace).

#### Scenario: Draw a token by hand
- **WHEN** Roland investigates the Study and finishes committing cards, with 16 tokens in the bag
- **THEN** the bag is tossed onto the Study card in the centre and 16 face-down tokens tumble out of it, bounce and come to rest over and around the card; after he taps one, it flips in place into the revealed token, e.g. −1, the others fade, and the token slides into the calculation strip

#### Scenario: See what is tested
- **WHEN** Roland draws Rotting Remains from the encounter deck and must take a willpower test against difficulty 3
- **THEN** the Rotting Remains card is the subject on the left throughout the draw, with "Roland Banks · Willpower 3 vs 3" in the strip, so the player can read the treachery while picking a disc

#### Scenario: Fight target shown
- **WHEN** Roland fights a Ghoul Minion
- **THEN** the Ghoul Minion card is the subject on the left with "Combat 4 vs 2" in the strip

#### Scenario: Wait for the card to land
- **WHEN** an encounter card is revealed in the middle of the screen and its test follows at once
- **THEN** the discs spill only after the encounter card's reveal has finished and it has settled, not on top of it mid-flight

#### Scenario: Never stalls
- **WHEN** an animation is still running 4 seconds after the token was revealed
- **THEN** the draw starts anyway

#### Scenario: Result breakdown
- **WHEN** that token was −1, Roland's intellect is 3, he committed one intellect icon, and the shroud is 2
- **THEN** the screen shows a big "3", "Success" under it, a Continue button, and at the bottom centre "[intellect] 3 + [−1] + [card] 1 = 3 vs 2"; it stays until Continue is pressed

#### Scenario: Same result whichever circle
- **WHEN** the same saved game is replayed and a different disc is tapped
- **THEN** the same token is revealed

#### Scenario: Automatic reveal
- **WHEN** "Draw chaos tokens by hand" is turned off in the menu
- **THEN** no discs spill: one token flips out of the bag and slides into the strip without a tap, after the screen has settled, and the result stage closes on its own after a short pause

#### Scenario: Tokens tumble out
- **WHEN** the draw starts with 16 tokens in the bag at 1600×900
- **THEN** the bag lands and tips over, the tokens stream out of its mouth over about half a second, each bouncing at least once and turning as it flies, and all are at rest within about 0.9 seconds of the bag leaving its button at the Normal pace, 1.2 seconds at the Slow pace

#### Scenario: Reduced motion
- **WHEN** the system asks for reduced motion
- **THEN** the bag and the face-down tokens appear in place without the toss

### Requirement: Prompt banner
The prompt banner at the top of the screen SHALL show:
- the deciding investigator's round portrait and their name in their class colour;
- the question, translated into the current language, at about 22 px (larger than now);
- the important parts emphasised: numbers in bold (for example actions left, shown with action glyphs), card and location names in bold card-name type, the skill being tested with its icon.

When no translation exists for a prompt, the banner SHALL fall back to the engine's English text with the same portrait and name.

#### Scenario: Turn prompt
- **WHEN** it is Roland's turn with 3 actions left
- **THEN** the banner shows Roland's portrait, "Roland Banks" in Guardian blue, then "choose an action" and three action glyphs with a bold 3

#### Scenario: Russian
- **WHEN** the locale is `ru` and Daisy must commit cards to an intellect test
- **THEN** the banner reads in Russian, with Daisy's portrait, her name in Seeker orange and the intellect icon

### Requirement: Map card frames
Cards on the map SHALL have rounded corners like the printed cards. The highlight frame around a card (a legal target, the hovered card, or a move destination while dragging) SHALL be half its previous thickness and follow the card's rounded corners.

#### Scenario: Legal location
- **WHEN** the Hallway can be moved to
- **THEN** it shows a thin rounded gold frame tight around its rounded corners, with no square corners

### Requirement: Hand card details
While a hand card is hovered or focused (raised and enlarged), a details column SHALL appear right beside it, on the right; if there is no room there (cards at the right end of the fan), on the left. The column lists, in large readable type:
- name (card-name type) and subtitle;
- class with its icon, and type (Asset, Event, Skill…);
- level as XP pips (level 0 shown as "Level 0");
- cost with the resource icon (or "—" for skills);
- traits (for example Item. Weapon. Melee.);
- slots with their icons;
- skill icons the card provides when committed;
- health and sanity (allies), and uses (for example 4 ammo);
- the rules text with icons.

It disappears when the card is no longer hovered or focused, and MUST NOT take the pointer, so moving across the fan still works. Everything is translated.

#### Scenario: Read a weapon at a glance
- **WHEN** the player hovers Machete in Roland's hand
- **THEN** beside the enlarged card a column shows "Machete", Guardian, Asset, Level 0, cost 3, "Item. Weapon. Melee.", the hand slot icon, the combat skill icon and its rules text

#### Scenario: Card at the right end of the fan
- **WHEN** the player hovers the rightmost card of a 7-card hand
- **THEN** the details column appears on the left of the enlarged card, fully on screen

### Requirement: Clues on locations
Clues on a location on the map SHALL be shown as a stack of clue token images using the fewest tokens (3-clue and 1-clue tokens), followed by the total in bold, the same way the stat bar shows clues. A location with no clues SHALL show no clue stack. The stack MUST NOT intercept the pointer and stays readable when the map is zoomed out to the whole map. Other tokens on map cards (damage, horror, doom) keep their badges.

#### Scenario: Four clues
- **WHEN** the Study has 4 clues on it
- **THEN** the Study shows one 3-clue token and one 1-clue token, labelled 4

#### Scenario: Clues taken
- **WHEN** an investigator discovers the last clue at the Attic
- **THEN** the Attic's clue stack disappears

### Requirement: Location details
While a location on the map is hovered, a details column SHALL appear beside it (on the right; on the left if there is no room; clamped to the window), in the same style as the hand card details column. For a revealed location it lists:
- name (card-name type) and subtitle;
- traits;
- shroud, with the skill it is investigated with when that is not intellect;
- clues on it now as a token stack, and the printed clue value (marked per investigator where it applies);
- victory points, if any;
- connected locations by name;
- investigators there (portraits) and enemies there (names);
- the rules text with icons.

An unrevealed location shows only its unrevealed name and back text, plus the investigators and enemies there. The column MUST NOT intercept the pointer, SHALL disappear when the pointer leaves the location or a card is being dragged, follows the location when the map pans or zooms, and is translated.

#### Scenario: Revealed location
- **WHEN** the player hovers the revealed Hallway with 1 clue in a 2-player game
- **THEN** beside it a column shows "Hallway", its traits, shroud 1, a 1-clue stack, the printed clue value marked per investigator, its connections (Attic, Cellar, Parlor) and its text

#### Scenario: Unrevealed location
- **WHEN** the player hovers an unrevealed Cellar
- **THEN** the column shows only the Cellar's unrevealed name and back text

#### Scenario: Location at the right edge
- **WHEN** the hovered location touches the right side of the window
- **THEN** the details column appears on its left, fully on screen

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

### Requirement: Phase title
When a new phase begins (mythos, investigation, enemy, upkeep), the screen SHALL show a chapter title like a film's: the phase name in large display type across the middle of the screen, with the round number in smaller type under it, over a soft dark band. It SHALL fade and drift in, hold for about 2 seconds, and fade out. When several phases begin in quick succession, their titles SHALL play one after another, each in full. The title MUST NOT intercept the pointer or block input, and it is shown in the player's language. Under reduced motion it appears and disappears without movement.

Phase changes SHALL NOT also appear as an action float. They are still listed in the feed.

#### Scenario: Mythos phase begins
- **WHEN** round 2 begins with the mythos phase
- **THEN** "Mythos Phase" appears in large type across the centre with "Round 2" under it, stays about 2 seconds and fades out

#### Scenario: Quick succession
- **WHEN** the upkeep phase ends and the mythos phase begins at once
- **THEN** the "Upkeep Phase" title finishes before "Mythos Phase" plays

#### Scenario: Russian
- **WHEN** the locale is Russian and the investigation phase begins
- **THEN** the title shows the Russian phase name

### Requirement: Mulligan on the table
During an investigator's mulligan, each card they pick for redraw SHALL fly out of the hand fan onto a "to redraw" row on the table above the hand. The row is labelled and shows the picked cards face up, side by side, and the fan closes the gap. Clicking a card in the row SHALL fly it back into the fan at its old position and un-pick it. Hovering a card in the row shows its enlarged copy and details column.

When the investigator confirms, the picked cards SHALL fly from the row into their deck pile face down, and the replacement cards then fly into the fan as for the opening hand. Keeping the hand with no picks just closes the row. Under reduced motion the cards move without flying. With hand privacy, the row is shown only to the investigator whose mulligan it is.

#### Scenario: Pick a card
- **WHEN** Roland clicks Machete in his opening hand during the mulligan
- **THEN** Machete flies onto the "to redraw" row on the table, and the fan closes up to 4 cards

#### Scenario: Take it back
- **WHEN** Roland then clicks Machete in the row
- **THEN** Machete flies back into its place in the fan, and the row is empty again

#### Scenario: Confirm the redraw
- **WHEN** Roland has Machete and Flashlight in the row and confirms
- **THEN** both fly face down into his deck pile, and two new cards fly from the deck into the fan

### Requirement: Scenario introduction
When the last investigator's mulligan is confirmed in a new scenario, the game SHALL introduce the scenario before play starts:
1. The agenda card is shown large in the centre of the dimmed screen, at least 300 px wide at 1080p, with the scenario name above it and the scenario's intro text beside it.
2. After the player clicks Continue (or presses Space or Enter), the agenda flies to its place in the act/agenda panel.
3. The act card is shown the same way, without the intro text.
4. After Continue, the act flies to its place.
5. The starting locations are then dealt onto the table (see Location dealing and flips).

The introduction SHALL fit the screen at every size the game supports: the intro text scrolls inside its own area when it is longer than the room, with a fade at its bottom edge while more is below; the card shrinks on short screens; Continue and Skip stay within the screen. The intro text SHALL render the campaign guide's markup as styled text, never as raw tags: handwriting for `fancy`, a typewriter face for `typewriter`, the game's display face for `game`, a decorative face for `innsmouth`, small capitals for `smallcaps`, centred and right-aligned blocks, indented quotations, strikethrough, italics and bold; a tag it doesn't know shows its text without the tag. During the introduction, no game option can be chosen. The introduction plays once per scenario. A game loaded from a save, or imported from a log, after the mulligan doesn't play it. While a scenario is in its mulligan, the act/agenda panel is empty and the table has no locations; both appear through the introduction. The texts are in the player's language.

#### Scenario: The Gathering begins
- **WHEN** Roland keeps his hand in The Gathering
- **THEN** "The Gathering" with its intro text and the agenda "What's Going On?!" appear large in the centre. After Continue, the agenda flies to the panel and the act "Trapped" appears. After Continue, it flies to the panel and the Study is dealt onto the table.

#### Scenario: Two investigators
- **WHEN** Roland and Daisy both finish their mulligans
- **THEN** the introduction plays once, after Daisy's mulligan, and then play continues with the first turn

#### Scenario: Loaded game
- **WHEN** a player reloads the page during round 1
- **THEN** no introduction plays; the act, agenda and locations are in place

#### Scenario: A long intro
- **WHEN** Machinations Through Time is introduced at 1600×900, and again on a phone at 852×393
- **THEN** the Continue and Skip buttons are on screen, the intro text scrolls within the box with a fade at its edge, and the card is at least 300 px wide at 1600×900

#### Scenario: Guide markup rendered
- **WHEN** an intro containing `<center><fancy>June 1926</fancy></center>` and a `<typewriter>` letter is shown, in English and in Russian
- **THEN** the date is a centred handwritten line, the letter is set in the typewriter face, and no tag appears as text

### Requirement: Location dealing and flips
Locations put into play SHALL be dealt onto the table: each one flies face down from the act/agenda panel to its place on the map, one after another about 250 ms apart. This covers:
- the starting locations at the end of the scenario introduction;
- locations added later by an act, an agenda or a card effect.

A location that comes into play revealed, such as a starting location an investigator begins in, SHALL flip face up once it has landed. The investigators' portraits starting there SHALL appear on it after the flip.

When a location is revealed while on the table (an investigator moves into it, or an effect reveals it), it SHALL flip visibly: it lifts slightly, turns over in 3D in about 0.6 s, and settles back. The flip starts once the moving portrait has arrived. Under reduced motion the location simply changes side.

#### Scenario: Starting location
- **WHEN** The Gathering's introduction ends
- **THEN** the Study flies face down from the act/agenda panel onto the table, flips to its revealed side, and Roland's portrait appears on it

#### Scenario: Act advance places locations
- **WHEN** the act advances and puts the Hallway, Cellar, Attic and Parlor into play
- **THEN** they are dealt face down from the act/agenda panel one after another, and stay face down

#### Scenario: Entering an unrevealed location
- **WHEN** Roland moves into the unrevealed Cellar
- **THEN** his portrait moves onto it, then the Cellar lifts, turns over to its revealed side and settles, and its clues appear on it

### Requirement: Act and agenda viewer
The act/agenda panel SHALL show three cards: the agenda, the act, and the scenario reference card for the current difficulty (its front for Easy/Standard, its back for Hard/Expert). Clicking any of them SHALL open a viewer:
- **Agenda** and **act**: every agenda or act of the scenario in order, the current one marked. Each that has been reached (current or earlier) shows both sides. Each that is still to come shows its front only, with its back hidden as "not yet revealed". Options on the current act or agenda (advance) are offered in the viewer as before.
- **Reference card:** the card at full size with its other side, and the chaos tokens in the bag.

Hovering a card in the viewer shows its details column. The viewer closes with Escape or a click outside.

#### Scenario: See all acts
- **WHEN** the player clicks the act in round 1 of The Gathering
- **THEN** the viewer shows Trapped (both sides, marked current), then The Barrier and What Have You Done? with their fronts only

#### Scenario: Reference card from the panel
- **WHEN** the player clicks the reference card in the panel on Standard
- **THEN** the viewer shows the Standard side of The Gathering's reference card large, with the Hard/Expert side beside it

#### Scenario: Advance from the viewer
- **WHEN** the act can be advanced and the player opens the act viewer
- **THEN** the advance option is offered there, as it is today in the act modal

### Requirement: Floats for big moments only
Text floating up over the map SHALL be shown only for consequential events:
- an investigator taking damage or horror, or being defeated;
- an enemy attacking, taking damage, spawning or being defeated;
- clues gained, discovered or dropped;
- doom placed;
- the act or agenda advancing.

Every other entry, such as resources gained or lost, cards drawn, played or discarded, moves, engagements, commits and readying, SHALL appear only in the feed and the Journal. A phase change keeps its chapter title and gets no float.

#### Scenario: Gain resource
- **WHEN** Roland takes the Resource action
- **THEN** a line appears in the feed and no text floats over the map

#### Scenario: Enemy attack
- **WHEN** the Ghoul Minion attacks Roland in the enemy phase
- **THEN** the attack line floats up from the Ghoul Minion, and also appears in the feed

### Requirement: Merged feed bursts
When one player choice or one phase step produces several routine feed entries of the same kind, the live feed SHALL show them as one merged line. Routine kinds are cards drawn, resources gained and enemy moves (readying is never shown in the feed). Entries are merged as follows:
- for one investigator, the line sums them, for example "Roland drew 3 cards";
- for every playing investigator receiving the same amount, the line reads "each investigator drew 1 card";
- different kinds from the same burst are joined into one sentence when they follow each other, for example "Each investigator drew a card and took 1 resource";
- several enemy moves are joined into one line, separated by semicolons.

A consequential entry (see "Floats for big moments only") is never merged and breaks a run. The live feed shows at most 4 lines at once. The Journal SHALL keep listing every log entry separately, in order, unmerged.

#### Scenario: Upkeep with two investigators
- **WHEN** upkeep readies cards, then Roland and Daisy each draw 1 card and gain 1 resource
- **THEN** the live feed shows one line, "Each investigator drew a card and took 1 resource", and the Journal shows all four entries

#### Scenario: Attack between draws
- **WHEN** a burst contains a draw, an enemy attack, then another draw by the same investigator
- **THEN** the feed shows three lines in that order, because the attack breaks the run

### Requirement: One thing at a time
The middle of the screen SHALL be held by at most one of these at a time:
- the card showcase or a deck pick;
- the scenario introduction;
- an encounter card being revealed, or a card being resolved (which shows only while nothing else holds the middle, because it may wait there for a choice);
- a chaos token draw;
- a skill test result;
- a phase title or the paced phase pause.

Whatever needs the middle while it is held waits its turn and plays in the order the game produced it, with nothing dropped. While the middle is held, action floats and effect-hit streaks wait, and they play once it is free. The prompt banner and the skill test panel above the middle stay visible throughout. A prompt choice that needs the middle, such as a deck pick, is not offered until the middle is free.

#### Scenario: Draw during a test result
- **WHEN** a skill test succeeds, its result is on screen, and the success draws Roland a card
- **THEN** the showcase opens only after the result panel has closed

#### Scenario: Encounter during a phase title
- **WHEN** the mythos phase title is shown and an encounter card is drawn right after it
- **THEN** the encounter card flies in only after the title has gone

#### Scenario: Hit waits for the showcase
- **WHEN** a treachery deals Roland 1 horror while drawn cards are still in the showcase
- **THEN** the hit streak and "−1 horror" play after the showcase is sent to the hand

### Requirement: Event spotlight
While an animated event plays (an attack, a spawn, enemy damage, an enemy defeated, damage taken, clues, doom, an encounter reveal or an act/agenda advance), the map SHALL dim everything except what the event is about: the enemy, location or card involved, and the investigator's mini-portrait on the map when the event names one. The spotlit card is outlined and lifted slightly above the table. The HUD panels are not dimmed.

The dim fades in and out over at most 200 ms and clears when the event ends. It never takes the pointer and never delays input. An event that names nothing on the map dims nothing. Under reduced motion, the spotlit card is outlined without the dim or the lift.

#### Scenario: Enemy attack spotlight
- **WHEN** the Ghoul Minion at the Study attacks Roland
- **THEN** during the attack the rest of the map is dimmed, while the Ghoul Minion and Roland's mini-portrait stay bright, with the Ghoul Minion outlined and lifted
- **WHEN** the attack event ends
- **THEN** the map returns to full brightness

#### Scenario: Event with no map card
- **WHEN** the agenda advances
- **THEN** the map is not dimmed

### Requirement: Step captions
While the events of an automated step play, a caption under the top bar SHALL name the step, with the investigator's portrait and name when the step has one: "Doom", "Roland draws an encounter card", "Hunters move", "Enemies attack", "Upkeep", "Roland discards down to 8 cards". The caption appears with the step's first event and stays until its last event has played, then gives way to the next caption or to the prompt of the next choice. The caption never takes the middle of the screen and never blocks input. Step entries are not shown in the live feed; the Journal shows them as section lines between the entries they introduce.

The caption SHALL give way to the instruction bar as soon as a choice waits for the player and nothing plays, including while the skill-test screen holds the middle (a commit window of a test drawn in the mythos phase). It stays only while events play or while something other than the test screen holds the middle (drawn cards in the showcase after an upkeep draw). The bar with its Done MUST be reachable in every commit window, whatever phase it opens in.

#### Scenario: Enemy phase
- **WHEN** the lead investigator continues into an enemy phase where a Ghoul Minion hunts and then a Swarm of Rats attacks Daisy
- **THEN** "Hunters move" is shown while the Ghoul moves, then "Enemies attack" while the Rats attack and Daisy takes damage, then the upkeep title

#### Scenario: Caption gives way to the prompt
- **WHEN** Roland's encounter card is a treachery that asks him to choose
- **THEN** "Roland draws an encounter card" shows while the card flies in, and the prompt replaces it when the choice is offered

#### Scenario: Mythos test with a card to commit
- **WHEN** Roland draws Crypt Chill in the mythos phase while holding Guts (with a Ghoul engaged in his strip)
- **THEN** after the card is tapped in the showcase the skill-test screen opens with the instruction bar reading "Tap a card to commit it to the test, then Done" and a Done button; Done closes the window and the chaos draw follows

### Requirement: The camera follows the event
While an animated event plays, the map camera SHALL pan to what the event is about: the enemy that moves or attacks, the location a card spawns at, or the investigator the event names, when any of these is on the map. The pan is eased and never faster than the event's own duration. When no event plays, the camera returns to the deciding investigator's location, as before. Dragging the map during an event stops the pan for that event. Under reduced motion the camera jumps instead of panning.

#### Scenario: Hunter moves off screen
- **WHEN** the Ghoul Minion moves from the Attic to the Hallway while the camera is on Roland in the Cellar
- **THEN** the camera pans to the Ghoul for its move, then back to Roland when his turn comes

#### Scenario: Agenda advances
- **WHEN** the agenda advances
- **THEN** the camera doesn't move, because nothing on the map is involved

### Requirement: Enemy moves are a beat
An enemy moving on its own (a hunter, or an effect that moves an enemy) SHALL play as an animated event: the map spotlights the enemy, its card travels to the new location over the event's duration, and the feed line appears with it. Enemy moves are not floated.

#### Scenario: Ghoul hunts
- **WHEN** in the enemy phase the Ghoul Minion moves one location toward Roland
- **THEN** the map dims around the Ghoul while it travels, the feed shows "Ghoul Minion moves to Hallway", and the next event starts only after the move

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

### Requirement: Phase ribbon
The top of the screen SHALL show a ribbon with the round number and the four phases of a round in order: Mythos, Investigation, Enemy, Upkeep. The current phase is lit (during the lead investigator's pause before a phase, that coming phase); the ones already played this round are marked done; the ones to come are plain. Round 1 has no mythos phase and the ribbon shows its Mythos segment as skipped. During setup and the mulligan the ribbon shows "Setup". When the scenario has ended it shows "End". The ribbon is a single row and never covers the map's middle.

#### Scenario: Enemy phase
- **WHEN** the enemy phase of round 2 begins
- **THEN** the ribbon reads round 2 with Mythos and Investigation done, Enemy lit and Upkeep plain

#### Scenario: First round
- **WHEN** round 1's investigation phase begins
- **THEN** the Mythos segment is shown as skipped and Investigation is lit

### Requirement: Turn order and action pips
During the investigation phase the player bar's avatars, in turn order, SHALL carry action pips. The active investigator is ringed and their pips show the actions left: one filled pip per action, three pips by default, more when extra actions apply. Investigators whose turn is done are dimmed with empty pips; those still to play show full pips. A pip empties with a short animation when an action is spent. Outside the investigation phase the avatars show no pips. The ribbon shows the phases only.

#### Scenario: Roland acts
- **WHEN** it is Roland's turn with 3 actions and he investigates
- **THEN** Roland's avatar is ringed in the bar and his third pip empties as the test starts

#### Scenario: Second investigator
- **WHEN** Roland ends his turn and Daisy's begins
- **THEN** Roland is dimmed with empty pips and Daisy is ringed with three filled pips

### Requirement: End turn stands out when nothing is left
When the active investigator has no actions left (counting extra actions restricted to some cards), the End turn button SHALL glow; actions that cost an action are no longer offered, while free actions and cards that cost no action stay as they are. The glow goes when an action is regained.

#### Scenario: Three actions spent
- **WHEN** Roland has spent his three actions
- **THEN** End turn glows and Draw, Resource and Investigate are gone from the rail, while a fast event in his hand still glows as playable

### Requirement: Enemy intents
Every enemy in play SHALL carry an intent badge, on the map and in the play strip, telling what it will do in the coming enemy phase:
- **attack**, with its damage and horror, when it is engaged and ready;
- **hunt**, when it has the hunter keyword, is ready, is not engaged and no investigator is at its location;
- **rest**, when it is exhausted;
- **wait**, otherwise.

The badge reflects the current state at once: evading an enemy turns its badge to rest, engaging it turns it to attack. Hovering a badge, or the enemy, explains the intent in words.

#### Scenario: Engaged Ghoul
- **WHEN** a ready Ghoul Minion is engaged with Roland
- **THEN** its badge shows attack 1 damage 1 horror
- **WHEN** Roland evades it
- **THEN** its badge shows rest

#### Scenario: Hunter afar
- **WHEN** a ready Swarm of Rats stands at Downtown with nobody there
- **THEN** its badge shows hunt

### Requirement: Turn title
When an investigator's turn begins, or a decision of their own begins for an investigator who wasn't deciding (their own test or choice, in any phase), a short title with the investigator's portrait and name ("Roland's turn") SHALL play in the middle of the screen, in the style of the phase titles, holding the middle like one and waiting its turn behind whatever holds it. The first turn after the investigation phase's own title gets no turn title when it belongs to the lead investigator who just continued. A help to another investigator's test (a commit window) or a reaction plays no title: the table switches quietly (see Someone else can act).

#### Scenario: Two investigators, hands shown
- **WHEN** Roland ends his turn
- **THEN** "Daisy's turn" plays in the middle, then her options are offered

#### Scenario: Private hands
- **WHEN** Roland ends his turn with any settings
- **THEN** no pass screen appears; the turn title is the only transition

#### Scenario: A help plays no title
- **WHEN** Roland's test opens Daisy's commit window
- **THEN** no title plays; Daisy's avatar pulses and the table switches to her

### Requirement: Instruction bar
When a choice is pending for the investigator whose hand is on screen, a bar under the top bar SHALL show that investigator's portrait and name, an instruction in plain words saying what to tap and what it does, and the choice's primary options as buttons inside the bar. Primary options are the ones that stand for no card and no action to take: Done, Pass, Keep hand, Redraw, Take nothing, Resign and End turn. Draw, Gain resource and Investigate stay on the action rail. Options that belong to a card stay on that card.

The instruction is written for a first-time player and names the target: "Tap a card to commit it to the test, then Done", "Tap the room the Ghoul moves to", "Tap a card to discard (2 more)". When no instruction exists for a prompt, the bar shows the prompt's own sentence. The phase pause keeps its title and Continue and shows no bar. While events play, the bar shows no choice.

When the decision belongs to another investigator who can act (a commit to another's test, a reaction) and the table on screen is not theirs, the bar SHALL NOT show that investigator's instruction without its buttons. It SHALL instead show who can act ("Daisy Walker can commit cards") with one button that switches the table to them, the same as tapping their pulsing avatar, until the table switches by itself. The bar MUST never show an instruction that has no button or tap that answers it.

#### Scenario: Commit
- **WHEN** Roland starts an investigate test
- **THEN** the bar reads "Tap a card to commit it to the test, then Done" with a Done button in it, and the rail shows no Done

#### Scenario: End turn
- **WHEN** it is Roland's turn
- **THEN** the bar reads his actions-left instruction with End turn as its button, and the rail shows Draw, Resource and Investigate

#### Scenario: No translation
- **WHEN** a card script asks a question with no instruction string
- **THEN** the bar shows the engine's sentence without the investigator's name prefix, as the banner does today

#### Scenario: Another can act
- **WHEN** Roland's test opens Daisy's commit window while Roland's table is on screen
- **THEN** the bar reads "Daisy Walker can commit cards" with a button that switches to Daisy's table, where the bar shows her commit instruction with Done

### Requirement: Choice spotlight
When the pending choice is about particular things, everything that isn't an option SHALL dim: cards on the map through the same dim as the event spotlight, and cards in the strip, the hand and the fan, portraits and the act, agenda and piles through a dimmed style. The options stay bright and outlined, wherever they are. This applies to choices that pick a target, cards to commit, where to assign damage or horror, a card to discard, a location or an investigator, or an enemy. Choosing an action on your turn, the mulligan, the phase pause and deck picks in the showcase dim nothing. The dim appears when the choice is offered, after the events before it have played, and clears when it is answered. It never takes the pointer. While an event plays, the event's spotlight wins.

#### Scenario: Assign damage
- **WHEN** Roland must assign 1 damage with Guard Dog in play
- **THEN** the map, the hand, the act and the piles dim while Roland's portrait and Guard Dog in the strip stay bright and outlined
- **WHEN** he taps Guard Dog
- **THEN** the dim clears

#### Scenario: Turn choice
- **WHEN** it is Roland's turn with every action available
- **THEN** nothing dims

#### Scenario: Commit
- **WHEN** Roland is asked to commit cards to his test
- **THEN** his hand cards with matching icons stay bright, the rest of the fan dims, and the map dims except the tested location

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

The instruction bar SHALL stay above the screen with its instruction and the Done button. The play strip SHALL stay visible and clickable above the overlay, dimmed except the cards whose fast ability is offered right now, so an in-play ability can be used during the test.

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

### Requirement: Player bar
The top bar SHALL show every investigator in turn order as an avatar (the round class-ringed portrait) with health remaining and sanity remaining under it and, during the investigation phase, their action pips (as the ribbon showed them). The active investigator SHALL be ringed; the investigator whose view is on screen SHALL be marked; defeated or resigned investigators SHALL be greyed. A changed count SHALL flash. The bar replaces the stat dock and the right-edge investigator tokens.

A click on an avatar SHALL only change whose table is shown (see Viewing another investigator); a click on the investigator already on screen does nothing, and a click never opens the sheet. Resting the mouse on the avatar of an investigator who is not on screen for 500 ms SHALL open their sheet: the investigator card (enlargeable), the ability text with any pending option tied to the investigator card, the four skills, resources, clues and the hand count; the sheet closes when the pointer leaves the avatar and the sheet, on Escape, or on a click elsewhere. On a touch screen, where there is no hover, a tap on the avatar of the investigator on screen SHALL open their sheet, and a tap outside or on the avatar again closes it. A pulsing avatar and an avatar that answers a pending choice keep their tap behaviour.

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
- **THEN** his sheet opens, and a tap outside closes it

### Requirement: Viewing another investigator
Tapping another investigator's avatar SHALL switch the table to that investigator's view: the play strip shows their assets and threats, their marker is lit on the map, and their hand is shown. Choices stay reachable only while the deciding player's view is on screen. A control in the bar returns to the deciding player's view, and the view SHALL return by itself when the decision passes to another investigator.

#### Scenario: Look at a teammate
- **WHEN** it is Roland's turn and he taps Daisy's avatar
- **THEN** the strip shows Daisy's assets and threats, her marker is lit, her hand is shown, and Roland's choices are not offered until he returns to his view

#### Scenario: Snap back
- **WHEN** Roland is viewing Daisy and his turn ends, making Daisy the deciding player
- **THEN** the view returns to the deciding player's rules (Daisy's view, her hand shown)

### Requirement: Someone else can act
When the pending decision is a help to another investigator's test (a commit window for a test that is not the decider's own) or a reaction, and the decider is not the active investigator, that investigator's avatar SHALL pulse with a short label naming what they can do ("Daisy can commit cards", "Daisy may react") and, after about a second with no turn title, the table SHALL switch to their view by itself with the decision's options offered. Tapping the avatar or the instruction bar's button switches sooner.

A decision that is the decider's own, including the commit window of their own skill test (a treachery's test in the mythos phase, a forced test at the end of a turn), SHALL NOT pulse: the table switches to the decider as any decision does, and their choices are offered at once.

#### Scenario: Commit to a teammate's test
- **WHEN** Roland's test opens Daisy's commit window
- **THEN** Daisy's avatar pulses with "Daisy can commit cards", no title plays, and about a second later her view is shown with the commit options, with nothing pressed

#### Scenario: Daisy's own treachery test
- **WHEN** Daisy draws Rotting Remains in the mythos phase while Roland is the active investigator
- **THEN** the skill-test screen opens on Daisy's table with her fan and the bar's Done; no avatar pulses and nothing waits for a tap on the bar

#### Scenario: Choosing an investigator
- **WHEN** a card asks Roland to choose an investigator at his location and Daisy is eligible
- **THEN** Daisy's avatar is highlighted in the bar and in the middle of the screen, and tapping either submits the choice

### Requirement: New game wizard
Starting a campaign SHALL be a sequence of full-screen steps, one decision each, with a Back control on every step and the choices kept when going back: campaign, investigators, decks, difficulty, ready. Every control SHALL be at least 44 px tall. The investigators step shows the investigators as avatar tiles (the round class-ringed portrait, the name, the class); tapping adds one, up to four, and the order tapped is the turn order, shown as P1 to P4 badges on the tiles; tapping again removes it. The decks step shows, for each chosen investigator, the decks available as cards (the starter decks and any saved custom decks), one selected. The ready step shows the chosen investigators in order as avatars, the chosen bag, and the first scenario's name and icon, with a Begin control that starts the campaign.

#### Scenario: Two investigators in order
- **WHEN** the player taps Daisy then Roland on the investigators step
- **THEN** Daisy shows P1 and Roland P2, and the campaign starts with Daisy as the lead

#### Scenario: Going back keeps the picks
- **WHEN** the player chose two investigators, moved to the decks step, and goes back
- **THEN** the two investigators are still selected in the same order

#### Scenario: Begin
- **WHEN** the player taps Begin on the ready screen
- **THEN** the campaign starts with the chosen investigators, decks and difficulty, as the old form did

### Requirement: Difficulty shown as the bag
The difficulty step SHALL show every difficulty the campaign defines (easy, standard, hard, expert) as a card drawing the bag's tokens as chaos token icons grouped by kind with their counts, and a derived line with the average modifier of the numeric tokens. Tapping a card selects it; the selection is shown on the ready screen as the same bag card.

#### Scenario: Standard bag
- **WHEN** the difficulty step shows Night of the Zealot
- **THEN** the standard card shows +1, 0 ×2, −1 ×3, −2 ×2, −3, −4, skull ×2, cultist, tablet, auto-fail and elder sign as token icons, and "average −1.3"

#### Scenario: Expert available
- **WHEN** the difficulty step is shown
- **THEN** hard and expert cards are present and selectable

### Requirement: Title screen and settings
The game SHALL open on a title screen: the title, Continue (only while a game, a campaign or a save exists at that moment), New campaign, How to play, and a gear that opens the settings screen. Settings hold language, private hands, drawing tokens by hand, pace, tips, Reset tips, music and sound effects; Back returns to the title. The campaign log is reached from Continue when a campaign is between scenarios, and from the game's Menu button. Abandon campaign on the title clears the campaign and the save and leaves the title without Continue; it never needs a reload to take effect.

#### Scenario: Cold load
- **WHEN** the app loads with no save
- **THEN** the title shows New campaign and How to play, no Continue, and the gear

#### Scenario: Continue with a save
- **WHEN** the app loads with a saved scenario in progress
- **THEN** Continue is the first button and restores the game

#### Scenario: Abandon
- **WHEN** the player presses Abandon campaign on the title
- **THEN** the campaign and the save are gone and the title shows no Continue, without a reload; pressing New campaign opens the wizard

### Requirement: Stat bar
The UI SHALL show a stat bar in the bottom-left corner for the investigator whose table is on screen (the one being looked at, else the deciding investigator). It is the bar that existed before the player bar, sized to the window: full size (420 px wide) in a window of 1080p and up, scaled with the window's smaller ratio to 1920×1080 below that, between 75 % and 115 %, with the hand fan starting after it; it shows:
- a portrait of at least 90 px and the name (at least 27 px);
- the investigator's ability text, and under it the pending options tied to the investigator card as buttons whenever there are any (the investigator's own ability), lit like the rail's buttons, each with the ability's symbol (action, reaction or free) and its label in the player's language; tapping one chooses it;
- health and sanity remaining, out of their maximum;
- the four skill values.

Every number in the bar SHALL be at least 28 px tall. Above the bar a row SHALL show resources and clues as stacks of the PNG token images, using the fewest tokens (resources 5, 3 and 1; clues 3 and 1), each with its total, and after them the hand count. Every item SHALL have a tooltip naming it with its value and SHALL flash briefly when it changes. Clicking the portrait SHALL open the investigator card in the card detail modal. While an ability option is offered, the portrait SHALL glow as the avatar does. The same options stay on the avatar and its sheet, as the player bar defines. In the phone layout mode the bar is not drawn; the sheet serves there.

#### Scenario: Back in the corner
- **WHEN** the table is shown at 1600×900 on Roland's turn
- **THEN** a stat bar stands in the bottom-left with Roland's portrait, ability, health 9/9, sanity 5/5 and his four skills, 350 px wide (five sixths of full size), and above it his resource stack, clue stack and hand count

#### Scenario: Looking at a teammate
- **WHEN** Roland taps Daisy's avatar to look at her
- **THEN** the stat bar shows Daisy's portrait, numbers and token row until he returns

#### Scenario: Resource stack
- **WHEN** the investigator on screen has 9 resources
- **THEN** the row shows one 5-resource token, one 3-resource token and one 1-resource token from the PNG art, labelled 9

#### Scenario: Use the ability from the bar
- **WHEN** Daisy has a tome in play on her turn
- **THEN** her stat bar shows the tome ability's button under her ability text, lit, and tapping it uses the ability; the same button is in her sheet

### Requirement: Hand count icon
The hand count in the stat bar's token row and in the avatar sheet SHALL be a small image of the player card back (at the token stacks' height, 40 px before the bar's zoom) followed by the number of cards in hand, at the same font size as the clue and resource totals. It MUST NOT render as a text label under any circumstance: it does not depend on the icon sprite. Its tooltip names the count and the hand limit, and the number turns red over the limit.

#### Scenario: Five cards
- **WHEN** Roland holds 5 cards
- **THEN** the row shows the card back image and "5" at the clue total's size, with the tooltip "Cards in hand: 5 (hand limit 8)"

#### Scenario: Sprite without the symbol
- **WHEN** the loaded icon sprite has no `card` symbol
- **THEN** the hand count still shows the card back image and the number, and no word appears

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

### Requirement: Skill-test line alignment
The skill-test screen's line ("Willpower test · 3 vs 4"), the subject card under it and the calculation strip SHALL all be centred on the screen's vertical axis at every window width; the placed cards sit to the subject's right.

#### Scenario: Line over strip
- **WHEN** the skill-test screen is open at 1600×900
- **THEN** the horizontal centres of the line, the subject card and the strip are within 2 px of each other and of the screen's centre

### Requirement: Game report
The Debug panel SHALL offer **Copy report**, which puts one JSON on the clipboard holding everything needed to recreate the table: the scenario setup and the action list (the replay log), the campaign, the settings (language, private hands, draw by hand, pace), the view (the investigator being looked at), the pending prompt's kind and investigator, and the app version. When the clipboard is refused, the report SHALL be shown selected in a text box so the player can copy it by hand. The panel SHALL also offer **Paste report…**: a text box and a Load button that replays a pasted report and shows its table, with a plain error when it can't be replayed. A report pasted into a later build that still replays SHALL give the same table.

#### Scenario: Copy and paste
- **WHEN** the player presses Copy report in a stuck game and, in a fresh page, pastes it into Paste report… and presses Load
- **THEN** the same scenario, round, pending choice and hands are on the table

#### Scenario: Clipboard refused
- **WHEN** the browser refuses clipboard access
- **THEN** the report appears selected in a text box, ready to copy

### Requirement: Phone layout mode
On a viewport under 500 px tall, or under 900 px wide in landscape, the table SHALL use the phone layout: the map fills the screen under a single top bar of at most 36 px (the player bar with the phase initials, a journal icon and the chaos bag icon); the act, agenda and piles in a left drawer and the Journal in a right drawer, each opened from an edge handle or a swipe and closed by a tap outside; the hand as a bottom drawer (see Hand drawer); the instruction bar above the hand drawer holding its buttons together with Draw, Resource and Investigate; the play strip as a column of thumbnails along the right edge that expands on tap. Every overlay (skill test, showcase, hand-off, titles, tips, modals) SHALL fit the short screen with no scrolling and no element off screen. The map camera SHALL frame locations within the phone insets. Nothing in the rules or the sequence of screens changes between the layouts.

#### Scenario: iPhone in landscape
- **WHEN** the game is opened at 852×393
- **THEN** the map fills the screen under a 36 px bar, no panel overlaps another, the instruction bar with Draw, Resource and Investigate sits above the hand drawer, and a location is framed within the visible map

#### Scenario: Drawers
- **WHEN** the player swipes from the left edge
- **THEN** the act, agenda and piles drawer slides in over the map, and a tap outside closes it

#### Scenario: Desktop unchanged
- **WHEN** the game is opened at 1600×900
- **THEN** the desktop layout is shown as before

### Requirement: Hand drawer
In the phone layout the hand SHALL be a drawer along the bottom edge: collapsed, the top 60 px of the cards peek in a row, playable cards peeking 20 px higher and highlighted; a swipe up or a tap on the peek opens the fan over the map at a size where the card under the finger is readable (at least 220 px tall); a tap on a card chooses it when it is an option and the drawer closes; a tap outside or a swipe down closes it without choosing. While a choice needs a hand card (a commit, a play), the drawer MAY open by itself.

#### Scenario: Play a card
- **WHEN** it is Roland's turn on a phone and two cards are playable
- **THEN** those two peek higher in the collapsed drawer; tapping the peek opens the fan; tapping Machete plays it and the drawer closes

### Requirement: Touch interaction
On a touch screen, a tap on a card, a marker or a token SHALL peek it: the details column and, where one exists, the enlarged copy, without choosing; a second tap on the same thing SHALL choose it when it is an option; a long press SHALL open the detail modal. Pointer devices keep hover. Every tap target SHALL be at least 44×44 px. Dragging a marker to move keeps working with touch.

#### Scenario: Peek then choose
- **WHEN** Roland taps the Hallway on a phone during his turn
- **THEN** the Hallway's details are shown and nothing is chosen; a second tap chooses "Move to Hallway"

#### Scenario: Long press
- **WHEN** the player long-presses a card in the strip
- **THEN** the card detail modal opens

### Requirement: Orientation and safe areas
The page SHALL use the full screen including the notch areas, keeping bars, drawers and buttons inside the safe-area insets. In portrait on a phone the game SHALL show a full-screen card asking to rotate the phone, and resume where it was once rotated.

#### Scenario: Portrait
- **WHEN** a phone is held upright with a game in progress
- **THEN** a "rotate your phone" card covers the screen and the game is unchanged when the phone is turned sideways

### Requirement: Investigator choices as avatars
When every option of the pending choice is an investigator, the choice SHALL be shown as a row of large avatars with names across the middle of the screen, lit as the bar lights them, with the prompt above; tapping one submits it, as does the bar. When exactly one investigator is eligible, the overlay SHALL show that avatar for about a second and then submit the choice by itself, a tap submitting sooner; the choice is made through an ordinary action, so undo and replay see it like any other.

#### Scenario: Who takes the damage
- **WHEN** an effect asks the lead investigator which of two investigators takes 1 damage
- **THEN** both avatars appear large in the middle and tapping Daisy's gives her the damage

#### Scenario: One eligible investigator
- **WHEN** a card asks Roland to choose an investigator and only Daisy is eligible
- **THEN** Daisy's avatar is shown in the middle for about a second and the choice is made without a tap

#### Scenario: Undo
- **WHEN** the player presses Undo after an automatic single-investigator choice
- **THEN** the choice is taken back like any other action

### Requirement: Tap decks to draw setting
The settings SHALL offer "Tap decks to draw", on by default and saved with the other settings; a new scenario starts with tapped decks when it is on. On the phone layout, where the piles are in the left drawer, the drawer's handle SHALL glow while a deck waits for a tap and the instruction bar SHALL offer a Draw button that chooses the same option, so the drawer needn't be opened. The bar's instruction, its Draw button ("Draw" or "Draw an encounter card") and the piles' names are in the player's language.

#### Scenario: Setting off
- **WHEN** "Tap decks to draw" is off and a scenario starts
- **THEN** draws happen without waiting, as before

#### Scenario: Phone
- **WHEN** a draw waits on a phone
- **THEN** the left drawer's handle glows and the instruction bar's Draw button draws the card

### Requirement: Ability labels in the player's language
Every button that uses a card ability (in the stat bar, the avatar sheet, the play strip, a card's menu, the act and agenda, a fast ability during a test) SHALL show the ability's label in the player's language, after the card's name in that language when the label names the card, and the engine's English label only for an ability the strings don't have.

#### Scenario: Roland's ability in Russian
- **WHEN** Roland may use his reaction and the locale is Russian
- **THEN** its button reads "Роланд Бэнкс: найти 1 улику в вашей локации" with the reaction symbol

### Requirement: Menu backgrounds
The title screen SHALL show the core rulebook's cover painting, without its printed logo, filling the screen behind the menu and dimmed so the buttons stay readable. The new-campaign wizard, settings, how to play and the campaign log SHALL sit on the rulebook's parchment page art. The images SHALL be extracted from the rulebook by an import command into committed WebP files with a manifest naming their source page, and SHALL load without delaying the first screen beyond the icon sprite.

#### Scenario: Title screen
- **WHEN** the app opens
- **THEN** the cover painting fills the screen behind the title and its buttons, which keep their contrast

#### Scenario: Wizard on parchment
- **WHEN** the new-campaign wizard is open
- **THEN** its steps sit on the parchment art

### Requirement: Settings in the menu
The title screen SHALL list Settings as a menu item after How to play and Cards, styled like the other items; no settings gear SHALL remain in the corner.

#### Scenario: Open settings
- **WHEN** the player taps Settings on the title screen
- **THEN** the settings screen opens

### Requirement: Keyword glossary
The card details column and the card detail modal SHALL explain, below the card text, each keyword the card has (Hunter, Retaliate, Alert, Aloof, Massive, Surge, Peril, Fast, Patrol, Elusive, Swarming, Concealed, Exceptional, Myriad, Bonded, Permanent, Seal, Uses, Victory), in one or two sentences worded after the rules reference, in the game's locale (English, or Russian after the Russian rules reference). A keyword is found in the card's keyword list or as a keyword line of its text. Cards without keywords show no glossary.

#### Scenario: Hunter enemy
- **WHEN** the details of the Ghoul Priest are shown in Russian
- **THEN** below its text, "Охотник", "Мститель" and "Победа" are each explained in a sentence

#### Scenario: No keywords
- **WHEN** the details of the Machete are shown
- **THEN** no glossary appears
