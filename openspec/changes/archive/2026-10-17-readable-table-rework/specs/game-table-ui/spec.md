## MODIFIED Requirements

### Requirement: Table layout
The table SHALL be rendered in WebGL with a fixed, top-down orthographic camera that looks straight down, so cards appear flat with no perspective. The camera MUST NOT pan, zoom or rotate when the player drags, scrolls or pinches. The board SHALL scale to fit the window and keep its aspect ratio. The table surface SHALL show the framed play-area background.

The board SHALL show:
- **a narrow scenario strip along the left edge**: act, agenda with doom, scenario reference, encounter deck and discard, victory display and chaos bag. These are drawn at about today's size and may be rotated sideways.
- **the location map**, filling most of the board, with connections and investigator and enemy tokens. Locations and the enemies on them SHALL be drawn at least twice their previous on-screen size: at 1600×900, a location is at least 150 px tall.
- **the viewing investigator's play area**: threat area, play area, deck and discard. It SHALL NOT contain the investigator card, because the stat bar replaces it.
- **a column of investigator tokens along the right edge**, one for each other investigator (see "Other investigators"). Other investigators have no card areas on the board. Enemies engaged with them are drawn at their location on the map, marked with that investigator's portrait.

No action sidebar SHALL cover the board. The viewing investigator's hand SHALL NOT be drawn on the board; it is shown by the hand fan (see "Hand fan").

#### Scenario: Four-player table
- **WHEN** a 4-investigator scenario is running
- **THEN** the scenario strip, the map, the viewer's play area and three investigator tokens on the right are visible without overlapping, and the active investigator is highlighted

#### Scenario: Readable locations
- **WHEN** The Gathering is shown at 1600×900
- **THEN** every revealed location is at least 150 px tall on screen

#### Scenario: Camera stays put
- **WHEN** the player drags across empty table or scrolls the mouse wheel
- **THEN** the view does not move or zoom

#### Scenario: Window resize
- **WHEN** the browser window changes from 1600×900 to 1280×800
- **THEN** the whole board is still visible, scaled to fit, with nothing cut off

#### Scenario: No viewer investigator card
- **WHEN** Roland Banks is the viewing investigator
- **THEN** his investigator card is not drawn on the board, and his stats are shown in the stat bar

### Requirement: Card interaction
Players SHALL be able to:
- hover a card to see it enlarged with readable full text and icons;
- click a hand card, or drag it upward out of the fan, to play it;
- click a location to move or investigate;
- click an enemy to fight, evade or engage;
- click abilities on cards in play;
- click a scenario-strip card or the stat-bar portrait to open it in the card detail modal.

Only legal interactions MUST be enabled and highlighted. When a card offers several actions, clicking it SHALL show a menu of those actions.

#### Scenario: Drag to play
- **WHEN** the active player drags a playable asset upward out of the hand fan and releases it over the table
- **THEN** the Play action is submitted and the card animates into its slot

#### Scenario: Illegal target
- **WHEN** a player hovers a location not connected to their current one
- **THEN** it is not highlighted as a move target and clicking does nothing

#### Scenario: Several actions on one card
- **WHEN** the investigator's own location can be investigated and also has an ability
- **THEN** clicking it opens a menu listing "Investigate" and the ability

### Requirement: Prompts and choices
Every pending engine choice SHALL be presented without a sidebar:
- a one-line prompt banner names the deciding investigator and the question;
- options tied to a card are offered on that card: in the hand fan, on the board, or in the card detail modal;
- options tied to no card are offered on the action rail.

Every option of the pending choice MUST be reachable this way. Skill tests SHALL show a commit window, then the revealed token and the calculation (skill + modifiers vs difficulty) before applying results.

#### Scenario: Skill test display
- **WHEN** a token is revealed
- **THEN** the token pops out of the bag with an animation and the panel shows e.g. "3 + 1 (committed) − 2 (token) = 2 vs 2 → Success"

#### Scenario: Every option reachable
- **WHEN** any choice is pending during an automated playthrough of The Gathering
- **THEN** each of its options can be found on a hand card, a board card, a modal or the action rail

### Requirement: Hand fan
The viewing investigator's hand SHALL be shown as a fan of cards along the bottom edge of the screen, outside the WebGL board. Cards overlap, are rotated along an arc, and partly extend below the screen edge, like Hearthstone.

Hand cards SHALL be twice their previous size: at rest at least 300 px wide by 420 px tall at 1080p. Hovering or focusing a card SHALL raise it fully into view, unrotated, with its whole text readable.

When a choice is pending, every hand card that has an option in it (play, commit and so on) SHALL rise above the fan and be highlighted. The other cards stay down.

The fan MUST stay usable with 1 to 12 cards by tightening the overlap as the hand grows.

#### Scenario: Read a card in hand
- **WHEN** the player hovers the third card of a 7-card hand
- **THEN** that card rises above the others, unrotated and fully on screen, and its text is legible

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
The UI SHALL show a stat bar in the bottom-left corner for the viewing investigator, using the iconography. Its portrait and stat icons SHALL be about twice their previous size: a portrait of at least 120 px and stat icons of at least 44 px. It shows:
- portrait and name;
- health and sanity remaining, out of their maximum;
- actions left;
- the four skill values.

Resources and clues SHALL be shown in a row above the stat bar as stacks of token images, using the fewest tokens:
- resources use the 5, 3 and 1 tokens;
- clues use the 3 and 1 tokens;
- each stack also shows its total.

Every stat item and token stack SHALL have a tooltip naming it with its value, e.g. "Health 7 / 9". Clicking the portrait SHALL open the investigator card in the card detail modal.

A change in any of these values SHALL be briefly highlighted.

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

## ADDED Requirements

### Requirement: Action rail
Options of the pending choice that are tied to no card SHALL be shown as a vertical rail of buttons on the right side of the screen, next to the hand. Examples are Draw, Gain resource, End turn, Done, Skip and Mulligan. Each button SHALL show an icon and a short label, and its label SHALL be translated. The primary option of the choice (End turn, Done or Pass) SHALL be visually distinct. The rail SHALL be hidden while hand-off privacy hides the hand.

#### Scenario: Turn actions
- **WHEN** it is Roland's turn with 3 actions left
- **THEN** the rail shows "Draw", "Resource" and "End turn" with icons, and Move, Investigate and Fight are offered on the map and enemy cards instead

#### Scenario: Hidden during hand-off
- **WHEN** the "Pass to Agnes" screen is shown
- **THEN** the rail shows no buttons

### Requirement: Card detail modal
Clicking a scenario-strip card (act, agenda, scenario reference, encounter discard, victory display) or the stat-bar portrait SHALL open a modal showing that card at full size with readable text, its tokens, and the pending options tied to it as buttons. Choosing an option SHALL submit it and close the modal. The modal SHALL close on Escape or on a click outside it.

#### Scenario: Advance the act
- **WHEN** the investigators have enough clues and the act offers "Advance"
- **THEN** the act in the scenario strip is highlighted, and clicking it opens the modal with an "Advance" button that advances the act

#### Scenario: Read the agenda
- **WHEN** the player clicks the agenda while no option is tied to it
- **THEN** the modal shows the agenda at full size with its doom count, and has no option buttons

### Requirement: Other investigators
Each investigator other than the viewer SHALL be shown on the right side of the board only as:
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
- **THEN** the right side of the board shows Daisy's and Agnes's portraits, each with clue, resource, health and sanity counts beside it, and no other cards of theirs are on the board

#### Scenario: Inspect a teammate
- **WHEN** Roland clicks Daisy's token
- **THEN** a modal shows Daisy's stats like Roland's stat bar, her hand cards, and her assets and threat area

#### Scenario: Choose a teammate
- **WHEN** a card asks Roland to choose an investigator at his location and Daisy is eligible
- **THEN** Daisy's token is highlighted, and choosing her in her token's modal (or on the token's quick action) submits the choice

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
During their turn, the deciding investigator SHALL be able to drag their own portrait marker from their location to another location card to move there. While dragging:
- every location the investigator can legally move to SHALL be highlighted;
- the location under the pointer SHALL be emphasised if it is legal.

Dropping on a highlighted location SHALL submit the same Move action as clicking that location. Dropping anywhere else, or pressing Escape, SHALL return the portrait to its location with no action taken. Other investigators' markers, and markers when no move is available, MUST NOT be draggable. A click without movement keeps the existing click behaviour.

#### Scenario: Drag to a connected location
- **WHEN** Roland is in the Study on his turn and drags his portrait onto the Hallway
- **THEN** while dragging, the Hallway (and any other legal destination) is highlighted, and on drop the Move action is taken and Roland's marker sits on the Hallway

#### Scenario: Illegal drop
- **WHEN** Roland drops his portrait on a location that is not connected to his own
- **THEN** that location was never highlighted, the portrait snaps back, and no action is taken

#### Scenario: Not your marker
- **WHEN** Roland tries to drag Daisy's portrait
- **THEN** it does not move
