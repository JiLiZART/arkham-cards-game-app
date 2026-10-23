## MODIFIED Requirements

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

### Requirement: Hover enlarge

Hovering a card SHALL show an enlarged copy on the spot, with no side panel. That covers:

- enemies and attachments on locations;
- the act and agenda;
- face-up pile tops;
- play-area strip cards.

The copy SHALL be twice the card's on-screen size, centred on the card and moved just enough to stay inside the window. Directly below it, a details panel SHALL show the card's name, subtitle, traits, rules text with icons, and its tokens (damage, horror, clues, doom, resources, uses). The copy and panel MUST NOT intercept the pointer, and SHALL disappear when the pointer leaves the card. A location that is not yet revealed shows its unrevealed side.

Location cards SHALL NOT get the enlarged copy; they show the location details column instead (see Location details).

#### Scenario: Hover a location

- **WHEN** the player hovers the Hallway
- **THEN** no enlarged copy appears; the Hallway is highlighted and its details column appears beside it

#### Scenario: Hover an enemy on a location

- **WHEN** the player hovers a Ghoul Minion sitting on the Cellar
- **THEN** the Ghoul Minion is shown at twice its size with its fight, health, evade and damage details below

#### Scenario: Near the edge

- **WHEN** the player hovers a play-strip card touching the right edge of the window
- **THEN** the enlarged copy and its details are shifted left so they are fully visible

## ADDED Requirements

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
