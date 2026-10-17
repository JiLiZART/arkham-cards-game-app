## MODIFIED Requirements

### Requirement: Table layout
The table SHALL be rendered in WebGL with a fixed, top-down orthographic camera that looks straight down, so cards appear flat with no perspective. The camera MUST NOT pan, zoom or rotate when the player drags, scrolls or pinches. The board SHALL scale to fit the window and keep its aspect ratio. The table surface SHALL show the parchment play-area background from the Learn to Play booklet. The board SHALL show:
- the scenario area: act, agenda with doom, encounter deck and discard, chaos bag, victory display;
- the location map, with connections and investigator and enemy tokens;
- one area per investigator: investigator card, deck, discard, threat area, play area.

The viewing investigator's hand SHALL NOT be drawn on the board. It is shown by the hand fan (see "Hand fan").

#### Scenario: Four-player table
- **WHEN** a 4-investigator scenario is running
- **THEN** all four player areas and the map are visible without overlapping, and the active player's area is highlighted

#### Scenario: Camera stays put
- **WHEN** the player drags across empty table or scrolls the mouse wheel
- **THEN** the view does not move or zoom

#### Scenario: Window resize
- **WHEN** the browser window changes from 1600×900 to 1280×800
- **THEN** the whole board is still visible, scaled to fit, with nothing cut off

### Requirement: Card interaction
Players SHALL be able to:
- hover a card to see it enlarged with readable full text and icons;
- click a hand card, or drag it upward out of the fan, to play it;
- click a location to move or investigate;
- click an enemy to fight, evade or engage;
- click abilities on cards in play.

Only legal interactions MUST be enabled and highlighted.

#### Scenario: Drag to play
- **WHEN** the active player drags a playable asset upward out of the hand fan and releases it over the table
- **THEN** the Play action is submitted and the card animates into its slot

#### Scenario: Illegal target
- **WHEN** a player hovers a location not connected to their current one
- **THEN** it is not highlighted as a move target and clicking does nothing

### Requirement: Hot-seat play
The UI SHALL support 1–4 investigators on one device. When control passes to another investigator, the hand fan and the stat bar SHALL switch to that investigator. The hand MUST be hidden behind a "pass to <player>" screen when hand-off privacy is enabled.

#### Scenario: Turn handoff
- **WHEN** Roland ends his turn and Agnes is next
- **THEN** a "Pass to Agnes" screen appears, and after confirming, Agnes's hand and stats are shown

## ADDED Requirements

### Requirement: Hand fan
The viewing investigator's hand SHALL be shown as a fan of cards along the bottom edge of the screen, outside the WebGL board. Cards overlap and are rotated along an arc, and partly extend below the screen edge, like Hearthstone. Hovering or focusing a card SHALL raise it fully into view at a size where its rules text is readable, at least 280 px tall at 1080p. Playable cards SHALL be highlighted. The fan MUST stay usable with 1 to 12 cards by tightening the overlap as the hand grows.

#### Scenario: Read a card in hand
- **WHEN** the player hovers the third card of a 7-card hand
- **THEN** that card rises above the others, unrotated and enlarged, and its text is legible

#### Scenario: Large hand
- **WHEN** the hand holds 12 cards
- **THEN** all 12 cards are reachable by hovering, and none is hidden completely behind its neighbours

#### Scenario: Keyboard
- **WHEN** the player tabs to a hand card and presses Enter
- **THEN** it is raised and, if it is playable, its play action is chosen

### Requirement: Stat bar
The UI SHALL show a stat bar for the viewing investigator, using the iconography. It shows portrait, name, health and sanity remaining (out of their maximum), resources, clues, actions left, and the four skill values. A compact plaque SHALL show the same counts for every other investigator. A change in any of these values SHALL be briefly highlighted.

#### Scenario: Taking damage
- **WHEN** the viewing investigator takes 2 damage
- **THEN** the health value in the stat bar drops by 2 and flashes

#### Scenario: Other investigators
- **WHEN** a 3-investigator game is in progress
- **THEN** the two non-viewing investigators each have a plaque with their icons and counts, and the active one is marked
