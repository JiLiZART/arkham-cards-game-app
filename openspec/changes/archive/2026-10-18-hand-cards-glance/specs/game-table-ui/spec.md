## MODIFIED Requirements

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

### Requirement: Stat bar

The UI SHALL show a stat bar in the bottom-left corner for the viewing investigator, using the iconography. It shows:

- a portrait of at least 120 px and the name (at least 36 px);
- the investigator's ability text, with buttons for any pending option tied to the investigator card (the same options as the card modal);
- health and sanity remaining, out of their maximum;
- actions left;
- the four skill values.

Every number in the stat bar SHALL be at least 38 px tall. That covers health, sanity, actions, the skill values and the resource, clue and hand totals. The resource and clue totals SHALL be vertically centred on their token stacks. Stat icons SHALL be at least 44 px.

Resources and clues SHALL be shown in a row above the stat bar as stacks of token images, using the fewest tokens:

- resources use the 5, 3 and 1 tokens;
- clues use the 3 and 1 tokens;
- each stack also shows its total.

After the clue stack, the row SHALL show the hand count: a card-back icon with the number of cards in the viewing investigator's hand. Its tooltip names the count and the hand limit ("Cards in hand: 7 (hand limit 8)"), and the number is shown in red while the hand holds more than 8 cards.

Every stat item and token stack SHALL have a tooltip naming it with its value, e.g. "Health 7 / 9". Clicking the portrait SHALL open the investigator card in the card detail modal. A change in any of these values SHALL be briefly highlighted.

#### Scenario: Readable numbers

- **WHEN** the stat bar is shown at 1600×900
- **THEN** the health, sanity, action, skill, resource, clue and hand numbers are each rendered at a font size of at least 38 px

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

#### Scenario: Hand count

- **WHEN** the viewing investigator holds 7 cards
- **THEN** after the clue stack a card-back icon shows 7, with the tooltip "Cards in hand: 7 (hand limit 8)"

#### Scenario: Over the hand limit

- **WHEN** the viewing investigator holds 9 cards
- **THEN** the hand count reads 9 in red
