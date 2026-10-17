# game-table-ui Specification

## Purpose
The WebGL card table and HUD that players use to play hot-seat: what is shown, how cards move and animate, and how choices are offered.

## Requirements

### Requirement: Card showcase
When cards are drawn into the hand of the investigator whose hand is on screen, outside the opening hand and the mulligan redraw, they SHALL fly from that investigator's deck pile to a showcase area in the centre of the screen and turn face up on the way. There they stay large: at least 260 px wide at 1080p, side by side when several were drawn together, with each card's details shown on hover.

The showcase SHALL stay until the player clicks a showcased card, clicks the "To hand" button, or presses Space or Enter. All showcased cards then fly into their places in the fan. While the showcase is open, no game option can be chosen; the action rail, prompt and table options are inert. Cards drawn while the showcase is already open join it.

Draws into another investigator's hand are not showcased. They fly to that investigator's pile, as before. When hands are private, a draw for an investigator whose hand is hidden behind the hand-off screen isn't showcased; it is simply in the hand when that player takes the device. Under reduced motion the cards appear in the showcase and in the fan without flying.

#### Scenario: Draw action
- **WHEN** Roland takes the Draw action and draws Machete
- **THEN** Machete flies from his deck to the centre of the screen face up and stays there, and the rail's buttons don't respond
- **WHEN** he clicks Machete
- **THEN** it flies into his hand fan and the rail responds again

#### Scenario: Two cards at once
- **WHEN** an effect draws 2 cards for Roland
- **THEN** both stand side by side in the showcase, and one click sends both to his hand

#### Scenario: Upkeep draw, other investigator
- **WHEN** in upkeep both Roland and Daisy draw, with Roland's hand on screen and private hands off
- **THEN** Roland's card is showcased; Daisy's flies to her pile in the column

#### Scenario: Opening hand
- **WHEN** a scenario starts and the opening hand is drawn
- **THEN** the cards fly straight into the fan without the showcase, as before

### Requirement: Picking cards from a deck
When the pending choice asks the investigator on screen to pick one of a set of cards that are in their deck or discard pile, those cards SHALL be shown face up in the showcase area instead of only as option buttons. This covers searching the deck, looking at the top cards and choosing from the discard pile.

The prompt above names what is being picked. Clicking a card picks it. A picked card that goes to the hand flies from the showcase into the fan without stopping again; the others leave the showcase. Options that aren't cards, such as "none" or "done", stay as buttons under the cards. More cards than fit in one row wrap into further rows, and the area scrolls if needed. Hover shows each card's details.

#### Scenario: Old Book of Lore
- **WHEN** Daisy uses Old Book of Lore and the search offers the top 3 cards of her deck
- **THEN** the 3 cards stand face up in the middle of the screen
- **WHEN** she clicks one of them
- **THEN** it flies into her hand fan and the other two disappear from the showcase

#### Scenario: Nothing taken
- **WHEN** a search offers cards and a "none" option
- **THEN** "none" is a button under the cards, and choosing it closes the showcase

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
When a phase begins in a paced game, its title SHALL stay across the middle of the screen with the round under it and a Continue button. The phase resolves only after the lead investigator presses Continue, or Space or Enter. The button names the lead investigator ("Continue — Roland"), and it is the only option offered.

Titles never stack: the next phase's title can appear only after the previous phase has been continued and resolved, and after the chaos draws, test results and encounter reveals it waits for. The pause needs no hand-off screen, even when hands are private and someone other than the lead investigator was last on screen.

Games that aren't paced, such as old saves or imported logs that have no pauses, keep the timed title that fades by itself.

#### Scenario: End of the investigation phase
- **WHEN** the last investigator ends their turn in round 1
- **THEN** "Enemy phase · Round 1" stays on screen with a Continue button, and no enemy attacks yet
- **WHEN** the lead investigator presses Continue
- **THEN** the title goes, the enemy phase resolves, and then "Upkeep phase" appears with its own Continue

#### Scenario: Private hands
- **WHEN** hands are private and Daisy's hand was last on screen, while Roland is the lead investigator
- **THEN** the phase title with Continue shows without a hand-off screen

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
- **THEN** the card flies from the encounter deck, flips, resolves, and then moves to its destination

### Requirement: Hot-seat play
The UI SHALL support 1–4 investigators on one device. When control passes to another investigator, the hand fan and the stat bar SHALL switch to that investigator. The hand MUST be hidden behind a "pass to <player>" screen when hand-off privacy is enabled.

#### Scenario: Turn handoff
- **WHEN** Roland ends his turn and Agnes is next
- **THEN** a "Pass to Agnes" screen appears, and after confirming, Agnes's hand and stats are shown

### Requirement: Game menus
The UI SHALL provide screens for: new campaign (campaign, difficulty, investigators, decks), continue saved game, campaign log between scenarios, and language selection.

#### Scenario: Continue game
- **WHEN** a saved game exists and the player opens the app
- **THEN** a "Continue" option resumes it

### Requirement: Performance
The table SHALL render at 60 fps on a mid-range laptop with up to 4 investigators and ~80 cards on the table, using texture caching for card images.

#### Scenario: Full table
- **WHEN** a 4-player Devourer Below scenario is in progress
- **THEN** the frame rate stays at or above 50 fps on a 2020-era integrated GPU

### Requirement: Hand fan
The viewing investigator's hand SHALL be shown as a fan of cards along the bottom edge of the screen, outside the WebGL viewport. Cards overlap, are rotated along an arc, and partly extend below the screen edge, like Hearthstone.

Hand cards at rest SHALL be at least 300 px wide by 420 px tall at 1080p. The card under the pointer, or the focused card, SHALL show unrotated at 1.28× its resting size (about 384×538 px), fully on screen. When the window is too short for that, it SHALL show as large as fits the window height.

While the pointer is over the fan, the fan SHALL magnify like the macOS Dock: the card under the pointer is the largest and highest, its neighbours are raised and enlarged a little, and the effect falls off smoothly with horizontal distance from the pointer (about one and a half card widths). Sizes and lifts SHALL follow the pointer continuously and ease into place, with no snapping when the pointer passes from one card to the next. When the pointer leaves the fan, every card SHALL ease back to its resting place.

When a choice is pending, every hand card that has an option in it (play, commit and so on) SHALL rise above the fan and be highlighted. The other cards stay down.

The fan MUST stay usable with 1 to 12 cards by tightening the overlap as the hand grows.

#### Scenario: Read a card in hand
- **WHEN** the player hovers the third card of a 7-card hand at 1920×1080
- **THEN** that card is shown unrotated at about 384×538 px, fully on screen, above everything else

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

### Requirement: Stat bar
The UI SHALL show a stat bar in the bottom-left corner for the viewing investigator, using the iconography. It shows:
- a portrait of at least 120 px and the name (at least 36 px);
- the investigator's ability text, with buttons for any pending option tied to the investigator card (the same options as the card modal);
- health and sanity remaining, out of their maximum;
- actions left;
- the four skill values.

Every number in the stat bar SHALL be at least 38 px tall. That covers health, sanity, actions, the skill values and the resource and clue totals. The resource and clue totals SHALL be vertically centred on their token stacks. Stat icons SHALL be at least 44 px.

Resources and clues SHALL be shown in a row above the stat bar as stacks of token images, using the fewest tokens:
- resources use the 5, 3 and 1 tokens;
- clues use the 3 and 1 tokens;
- each stack also shows its total.

Every stat item and token stack SHALL have a tooltip naming it with its value, e.g. "Health 7 / 9". Clicking the portrait SHALL open the investigator card in the card detail modal. A change in any of these values SHALL be briefly highlighted.

#### Scenario: Readable numbers
- **WHEN** the stat bar is shown at 1600×900
- **THEN** the health, sanity, action, skill, resource and clue numbers are each rendered at a font size of at least 38 px

#### Scenario: Use the investigator's ability from the stat bar
- **WHEN** a choice offers Roland's investigator card as an option (for example "Who takes the next turn?" or his reaction)
- **THEN** a button for it appears under his ability text in the stat bar, and clicking it submits that option

#### Scenario: Taking damage
- **WHEN** the viewing investigator takes 2 damage
- **THEN** the health value in the stat bar drops by 2 and flashes

#### Scenario: Resource stack
- **WHEN** the viewing investigator has 9 resources
- **THEN** above the stat bar there is one 5-resource token, one 3-resource token and one 1-resource token, labelled 9

#### Scenario: Clue stack
- **WHEN** the viewing investigator has 4 clues
- **THEN** above the stat bar there is one 3-clue token and one 1-clue token, labelled 4

#### Scenario: Tooltip
- **WHEN** the player hovers the sanity item
- **THEN** a tooltip reads "Sanity 5 / 8" (translated in the current language)

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

### Requirement: Other investigators
Each investigator other than the viewer SHALL be shown on the right side of the screen, below the chaos bag, only as:
- a round portrait;
- to the right of it, a column of counts with icons: clues, resources, health remaining and sanity remaining (horror);
- a tooltip on each count, as in the stat bar.

The active investigator's token SHALL be highlighted. A changed count SHALL flash. Defeated or resigned investigators SHALL be shown greyed out.

Clicking a token SHALL open an investigator modal. The modal shows:
- the same stats as the viewer's stat bar: portrait, name, health and sanity of max, resources and clues as token stacks, actions left, and skill values;
- the investigator card, which can be enlarged;
- their hand cards;
- their cards in play and threat area.

Pending options tied to any of those cards or to the investigator SHALL be offered as buttons in the modal, and the token SHALL be highlighted while such options exist. The modal SHALL close on Escape or on a click outside it.

#### Scenario: Three-player table
- **WHEN** Roland views a game with Daisy and Agnes
- **THEN** below the chaos bag, the right side shows Daisy's and Agnes's portraits, each with clue, resource, health and sanity counts beside it, and none of their other cards are on the map

#### Scenario: Inspect a teammate
- **WHEN** Roland clicks Daisy's token
- **THEN** a modal shows Daisy's stats like Roland's stat bar, her hand cards, and her assets and threat area

#### Scenario: Choose a teammate
- **WHEN** a card asks Roland to choose an investigator at his location and Daisy is eligible
- **THEN** Daisy's token is highlighted, and choosing her in her token's modal submits the choice

#### Scenario: Defeated teammate
- **WHEN** Agnes is defeated
- **THEN** her token is greyed out and still opens her modal

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

Piles SHALL stay at their size and position while the map moves. Cards with a pending option tied to them SHALL be highlighted.

#### Scenario: Panels visible while panning
- **WHEN** the player zooms into the far corner of the map
- **THEN** the act, agenda and piles are still at the top-left and left of the screen

#### Scenario: Act ready to advance
- **WHEN** the act can be advanced
- **THEN** the act card in the top-left panel is highlighted

### Requirement: Chaos bag modal
The chaos bag SHALL be shown in the top-right corner of the screen with its token count. Clicking it SHALL open a modal listing every token currently in the bag, grouped by kind, each with its icon and count, for example −1 ×3. Sealed or removed tokens are not listed. The modal SHALL also show the scenario reference card for the current difficulty, which explains the special tokens. The modal SHALL close on Escape or on a click outside it.

#### Scenario: Standard bag
- **WHEN** the player clicks the chaos bag in The Gathering on Standard
- **THEN** the modal lists +1 ×1, 0 ×2, −1 ×3, −2 ×2, −3 ×1, −4 ×1, skull ×2, cultist ×1, tablet ×1, auto-fail ×1 and elder sign ×1, next to The Gathering's reference card

### Requirement: Hover enlarge
Hovering a card SHALL show an enlarged copy on the spot. That covers:
- enemies and attachments on locations;
- the act and agenda;
- face-up pile tops;
- play-area strip cards;
- cards committed to a skill test.

The copy SHALL be twice the card's on-screen size, centred on the card and moved just enough to stay inside the window, fully visible. Beside it, the details column SHALL show the same rows as for hand cards (name, class and type, level, cost, traits, slots, icons, health and sanity, uses, rules text with icons). An enemy also shows its fight, health and evade values, its damage and horror, and the damage already on it. The column is placed right of the copy, or left when there is no room, and clamped to the window. The copy and column MUST NOT intercept the pointer, and SHALL disappear when the pointer leaves the card. A location that is not yet revealed shows its unrevealed side.

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
When a skill test reveals a chaos token, the UI SHALL stage the draw as a small interaction:
1. The chaos bag appears large in the centre of the screen, over a dimmed table. Above its mouth sits one plain white circle per token currently in the bag.
2. Beside the bag (to its left, where the circles leave room), the draw SHALL show what is being tested:
   - the card the test is against or comes from (the enemy being fought or evaded, the location being investigated, the treachery or card that called for the test), at a readable size of at least 180×252 px at 1080p;
   - a line with the investigator's portrait and name, the skill icon and name, and the test value against the difficulty (for example "Roland Banks · [willpower] Willpower 3 vs 4").

   Hovering the card shows its enlarged copy and details column. A test with no card (a plain test from a scenario effect) shows only the line.
3. The deciding player clicks any white circle. Space or Enter picks one too.
4. The bag fades away, and the chosen circle flies to the table area beside the skill-test panel. It turns into the revealed token (its real art) as it lands.
5. A result panel then shows the calculation line by line:
   - the skill with its icon and base value;
   - each modifier, including committed cards' icons;
   - each revealed token with its icon and modifier (or "auto-fail" / "elder sign" effect);
   - the total against the difficulty;
   - Success or Fail.

   It stays until the player clicks Continue.

The draw SHALL NOT start until the screen has settled: every earlier animated event has finished, every card still flying (a card drawn, played, spawned or put into play, an encounter card being revealed) has landed, and about 0.4 s has passed after that. If something keeps animating, the draw starts anyway after at most 4 seconds, so the game can never stall.

Which token comes out MUST NOT depend on the circle clicked. The engine's seeded draw decides it, so saved games and action-log replays stay exact.

When a test reveals more than one token, each is drawn the same way in turn. Bot play and the debug "skip" bypass the interaction. A menu setting "Draw chaos tokens by hand" (on by default) SHALL switch to an automatic reveal that plays the same animation without waiting for a click; it shows the tested card the same way and waits for the screen to settle the same way.

#### Scenario: Draw a token by hand
- **WHEN** Roland investigates the Study and finishes committing cards, with 16 tokens in the bag
- **THEN** the bag appears in the centre with 16 white circles; after he clicks one, the bag fades, the circle flies beside the skill-test panel and turns into the revealed token, e.g. −1

#### Scenario: See what is tested
- **WHEN** Roland draws Rotting Remains from the encounter deck and must take a willpower test against difficulty 3
- **THEN** the draw shows the Rotting Remains card beside the bag with "Roland Banks · Willpower 3 vs 3", so the player can read the treachery while picking a circle

#### Scenario: Fight target shown
- **WHEN** Roland fights a Ghoul Minion
- **THEN** the Ghoul Minion card is shown beside the bag with "Combat 4 vs 2"

#### Scenario: Wait for the card to land
- **WHEN** an encounter card is revealed in the middle of the screen and its test follows at once
- **THEN** the bag appears only after the encounter card's reveal has finished and it has settled, not on top of it mid-flight

#### Scenario: Never stalls
- **WHEN** an animation is still running 4 seconds after the token was revealed
- **THEN** the draw starts anyway

#### Scenario: Result breakdown
- **WHEN** that token was −1, Roland's intellect is 3, he committed one intellect icon, and the shroud is 2
- **THEN** the result panel lists "Intellect 3", "+1 committed", "−1 token", "= 3 vs 2" and "Success", and stays until Continue is clicked

#### Scenario: Same result whichever circle
- **WHEN** the same saved game is replayed and a different circle is clicked
- **THEN** the same token is revealed

#### Scenario: Automatic reveal
- **WHEN** "Draw chaos tokens by hand" is turned off in the menu
- **THEN** the token reveal animates from the bag without waiting for a click, after the screen has settled, with the tested card shown, and the result panel closes on its own after a short pause

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

### Requirement: Skill-test panel
While a skill test is in progress, the panel at the top centre SHALL show:
- who is testing, which skill (with its icon) and why;
- the value as a sum: the base skill, then each committed card's icons, then other modifiers, then the current total against the difficulty;
- the revealed tokens;
- the committed cards, each at least 86×120 px.

Hovering a committed card SHALL show its enlarged copy and details column (see Hover enlarge).

While the commit window is open for the investigator who committed a card, that card SHALL be highlighted as removable. Clicking it SHALL return it to that investigator's hand, flying back into the fan, and update the value. They can then commit a different card or none. A card committed by another investigator, or once the commit window has closed, can't be taken back.

#### Scenario: Value breakdown
- **WHEN** Roland (combat 4) fights a Ghoul Minion (fight 2) and commits Vicious Blow (1 combat icon)
- **THEN** the panel shows "4 + 1 = 5 vs 2" with the combat icon and the Vicious Blow card below

#### Scenario: Take a card back
- **WHEN** Roland, still deciding what to commit, clicks the committed Vicious Blow in the panel
- **THEN** Vicious Blow flies back into his hand, the panel shows "4 vs 2", and Vicious Blow is again offered for commit

#### Scenario: Hover a committed card
- **WHEN** the player hovers a committed card in the panel
- **THEN** the card is shown enlarged with its details column, fully on screen

#### Scenario: After the reveal
- **WHEN** the chaos token has been revealed
- **THEN** the committed cards are no longer highlighted and clicking them does nothing

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

During the introduction, no game option can be chosen. The introduction plays once per scenario. A game loaded from a save, or imported from a log, after the mulligan doesn't play it. While a scenario is in its mulligan, the act/agenda panel is empty and the table has no locations; both appear through the introduction. The texts are in the player's language.

#### Scenario: The Gathering begins
- **WHEN** Roland keeps his hand in The Gathering
- **THEN** "The Gathering" with its intro text and the agenda "What's Going On?!" appear large in the centre. After Continue, the agenda flies to the panel and the act "Trapped" appears. After Continue, it flies to the panel and the Study is dealt onto the table.

#### Scenario: Two investigators
- **WHEN** Roland and Daisy both finish their mulligans
- **THEN** the introduction plays once, after Daisy's mulligan, and then play continues with the first turn

#### Scenario: Loaded game
- **WHEN** a player reloads the page during round 1
- **THEN** no introduction plays; the act, agenda and locations are in place

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

#### Scenario: Enemy phase
- **WHEN** the lead investigator continues into an enemy phase where a Ghoul Minion hunts and then a Swarm of Rats attacks Daisy
- **THEN** "Hunters move" is shown while the Ghoul moves, then "Enemies attack" while the Rats attack and Daisy takes damage, then the upkeep title

#### Scenario: Caption gives way to the prompt
- **WHEN** Roland's encounter card is a treachery that asks him to choose
- **THEN** "Roland draws an encounter card" shows while the card flies in, and the prompt replaces it when the choice is offered

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
- **Tap**: each big event (an encounter reveal, a chaos token, a test result, an attack, a spawn, an enemy move, an enemy defeated, an investigator defeated, an act or agenda advance, a resolution) holds until the player presses Next in the caption, clicks the event's card, or presses Space or Enter. Follow-on events (damage, enemy damage, clues, doom) play on their timers after the event they belong to.

In Tap mode the game is never stuck: a held event always shows the Next button, and undo and the menu stay available. The default is Normal.

#### Scenario: Tap mode in the enemy phase
- **WHEN** the pace is Tap and the Ghoul Minion attacks Roland
- **THEN** the attack holds with "Enemies attack · Next" until the player presses Next or Space, then the damage plays and the next event waits again

#### Scenario: Slow mode
- **WHEN** the pace is Slow and an encounter card flies in
- **THEN** it stays in the middle at least 1.6 times as long as in Normal

### Requirement: Phase ribbon
The top of the screen SHALL show a ribbon with the round number and the four phases of a round in order: Mythos, Investigation, Enemy, Upkeep. The current phase is lit (during the lead investigator's pause before a phase, that coming phase); the ones already played this round are marked done; the ones to come are plain. Round 1 has no mythos phase and the ribbon shows its Mythos segment as skipped. During setup and the mulligan the ribbon shows "Setup". When the scenario has ended it shows "End". The ribbon is a single row and never covers the map's middle.

#### Scenario: Enemy phase
- **WHEN** the enemy phase of round 2 begins
- **THEN** the ribbon reads round 2 with Mythos and Investigation done, Enemy lit and Upkeep plain

#### Scenario: First round
- **WHEN** round 1's investigation phase begins
- **THEN** the Mythos segment is shown as skipped and Investigation is lit

### Requirement: Turn order and action pips
During the investigation phase the ribbon's Investigation segment SHALL list the playing investigators in turn order, each as a portrait with action pips. The active investigator is lit and their pips show the actions left: one filled pip per action, three pips by default, more when extra actions apply. Investigators whose turn is done are dimmed with empty pips; those still to play show full pips. A pip empties with a short animation when an action is spent. Outside the investigation phase the segment shows the portraits only. The stat dock no longer shows an action count.

#### Scenario: Roland acts
- **WHEN** it is Roland's turn with 3 actions and he investigates
- **THEN** Roland's portrait is lit in the ribbon and his third pip empties as the test starts

#### Scenario: Second investigator
- **WHEN** Roland ends his turn and Daisy's begins
- **THEN** Roland is dimmed with empty pips and Daisy is lit with three filled pips

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
When the active investigator changes during the investigation phase and no hand-off screen is shown for them, a short title with the investigator's portrait and name ("Roland's turn") SHALL play in the middle of the screen, in the style of the phase titles, holding the middle like one and waiting its turn behind whatever holds it. The first turn after the investigation phase's own title gets no turn title when it belongs to the lead investigator who just continued. With private hands the hand-off screen is the turn's beginning and no title plays.

#### Scenario: Two investigators, hands shown
- **WHEN** hands aren't private and Roland ends his turn
- **THEN** "Daisy's turn" plays in the middle, then her options are offered

#### Scenario: Private hands
- **WHEN** hands are private and Roland ends his turn
- **THEN** the hand-off screen for Daisy appears and no turn title plays

### Requirement: Instruction bar
When a choice is pending for the investigator whose hand is on screen, a bar under the top bar SHALL show that investigator's portrait and name, an instruction in plain words saying what to tap and what it does, and the choice's primary options as buttons inside the bar. Primary options are the ones that stand for no card and no action to take: Done, Pass, Keep hand, Redraw, Take nothing, Resign and End turn. Draw, Gain resource and Investigate stay on the action rail. Options that belong to a card stay on that card.

The instruction is written for a first-time player and names the target: "Tap a card to commit it to the test, then Done", "Tap the room the Ghoul moves to", "Tap a card to discard (2 more)". When no instruction exists for a prompt, the bar shows the prompt's own sentence. The phase pause keeps its title and Continue and shows no bar. While events play, the bar shows no choice.

#### Scenario: Commit
- **WHEN** Roland starts an investigate test
- **THEN** the bar reads "Tap a card to commit it to the test, then Done" with a Done button in it, and the rail shows no Done

#### Scenario: End turn
- **WHEN** it is Roland's turn
- **THEN** the bar reads his actions-left instruction with End turn as its button, and the rail shows Draw, Resource and Investigate

#### Scenario: No translation
- **WHEN** a card script asks a question with no instruction string
- **THEN** the bar shows the engine's sentence without the investigator's name prefix, as the banner does today

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
