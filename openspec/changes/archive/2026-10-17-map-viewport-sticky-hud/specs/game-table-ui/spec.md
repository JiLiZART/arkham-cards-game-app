## MODIFIED Requirements

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

### Requirement: Hand fan
The viewing investigator's hand SHALL be shown as a fan of cards along the bottom edge of the screen, outside the WebGL viewport. Cards overlap, are rotated along an arc, and partly extend below the screen edge, like Hearthstone.

Hand cards at rest SHALL be at least 300 px wide by 420 px tall at 1080p. Hovering or focusing a card SHALL show it unrotated at 1.6× its resting size (about 480×672 px), fully on screen. When the window is too short for that, it SHALL show as large as fits the window height.

When a choice is pending, every hand card that has an option in it (play, commit and so on) SHALL rise above the fan and be highlighted. The other cards stay down.

The fan MUST stay usable with 1 to 12 cards by tightening the overlap as the hand grows.

#### Scenario: Read a card in hand
- **WHEN** the player hovers the third card of a 7-card hand at 1920×1080
- **THEN** that card is shown unrotated at about 480×672 px, fully on screen, above everything else

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

## ADDED Requirements

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
Hovering a card SHALL show an enlarged copy on the spot, with no side panel. That covers:
- enemies and attachments on locations;
- the act and agenda;
- face-up pile tops;
- play-area strip cards.

The copy SHALL be twice the card's on-screen size, centred on the card and moved just enough to stay inside the window. Directly below it, a details panel SHALL show the card's name, subtitle, traits, rules text with icons, and its tokens (damage, horror, clues, doom, resources, uses). The copy and panel MUST NOT intercept the pointer, and SHALL disappear when the pointer leaves the card. A location that is not yet revealed shows its unrevealed side.

Location cards SHALL NOT get the enlarged copy; they are read on the map itself, zoomed in as needed.

#### Scenario: Hover a location
- **WHEN** the player hovers the Hallway
- **THEN** no enlarged copy or side panel appears; the Hallway is only highlighted

#### Scenario: Hover an enemy on a location
- **WHEN** the player hovers a Ghoul Minion sitting on the Cellar
- **THEN** the Ghoul Minion is shown at twice its size with its fight, health, evade and damage details below

#### Scenario: Near the edge
- **WHEN** the player hovers a play-strip card touching the right edge of the window
- **THEN** the enlarged copy and its details are shifted left so they are fully visible

### Requirement: Play area strip
The viewing investigator's cards in play and threat area SHALL be shown as a fixed strip of small cards above the hand fan, between the stat bar and the action rail. Threat-area cards and engaged enemies come after the assets, separated from them. Exhausted cards SHALL be shown turned sideways. Tokens on the cards (uses, damage, horror, doom, resources) SHALL be visible on them. Cards with a pending option SHALL be highlighted, and clicking one SHALL choose its option, or show a menu when it has several. The strip SHALL be hidden while hand-off privacy hides the hand.

#### Scenario: Assets and an enemy
- **WHEN** Roland has a .45 Automatic with 3 ammo and a Machete in play and is engaged with a Ghoul Minion
- **THEN** the strip shows the two assets, the .45 Automatic with 3 uses on it, then the Ghoul Minion after a separator

#### Scenario: Fight from the strip
- **WHEN** Roland can fight the engaged Ghoul Minion
- **THEN** the Ghoul Minion in the strip is highlighted, and clicking it shows the Fight and Evade options

### Requirement: Chaos token draw
When a skill test reveals a chaos token, the UI SHALL stage the draw as a small interaction:
1. The chaos bag appears large in the centre of the screen, over a dimmed table. Above its mouth sits one plain white circle per token currently in the bag.
2. The deciding player clicks any white circle. Space or Enter picks one too.
3. The bag fades away, and the chosen circle flies to the table area beside the skill-test panel. It turns into the revealed token (its real art) as it lands.
4. A result panel then shows the calculation line by line:
   - the skill with its icon and base value;
   - each modifier, including committed cards' icons;
   - each revealed token with its icon and modifier (or "auto-fail" / "elder sign" effect);
   - the total against the difficulty;
   - Success or Fail.

   It stays until the player clicks Continue.

Which token comes out MUST NOT depend on the circle clicked. The engine's seeded draw decides it, so saved games and action-log replays stay exact.

When a test reveals more than one token, each is drawn the same way in turn. Bot play and the debug "skip" bypass the interaction. A menu setting "Draw chaos tokens by hand" (on by default) SHALL switch to an automatic reveal that plays the same animation without waiting for a click.

#### Scenario: Draw a token by hand
- **WHEN** Roland investigates the Study and finishes committing cards, with 16 tokens in the bag
- **THEN** the bag appears in the centre with 16 white circles; after he clicks one, the bag fades, the circle flies beside the skill-test panel and turns into the revealed token, e.g. −1

#### Scenario: Result breakdown
- **WHEN** that token was −1, Roland's intellect is 3, he committed one intellect icon, and the shroud is 2
- **THEN** the result panel lists "Intellect 3", "+1 committed", "−1 token", "= 3 vs 2" and "Success", and stays until Continue is clicked

#### Scenario: Same result whichever circle
- **WHEN** the same saved game is replayed and a different circle is clicked
- **THEN** the same token is revealed

#### Scenario: Automatic reveal
- **WHEN** "Draw chaos tokens by hand" is turned off in the menu
- **THEN** the token reveal animates from the bag without waiting for a click, and the result panel closes on its own after a short pause
