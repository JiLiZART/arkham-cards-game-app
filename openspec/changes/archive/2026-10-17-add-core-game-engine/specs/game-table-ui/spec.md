## Purpose

The 3D browser table where players see and play the game: top-down Hearthstone-like view of each investigator's area and the shared scenario map, with prompts for every engine choice and local hot-seat play.

## ADDED Requirements

### Requirement: Table layout

The table SHALL be rendered in WebGL with a top-down perspective camera showing: the scenario area (act, agenda with doom, encounter deck and discard, chaos bag, victory display), the location map with connections and investigator/enemy tokens, and one area per investigator (investigator card with stats/damage/horror/clues/resources, deck, discard, threat area, play area). The active player's hand SHALL be shown fanned at the bottom of the screen.

#### Scenario: Four-player table

- **WHEN** a 4-investigator scenario is running
- **THEN** all four player areas and the map are visible without overlapping, and the active player's area is highlighted

### Requirement: Card interaction

Players SHALL be able to hover a card to zoom it with full text, click or drag a hand card to play it, click a location to move or investigate, click an enemy to fight/evade/engage, and click abilities on cards in play. Only legal interactions MUST be enabled and highlighted.

#### Scenario: Drag to play

- **WHEN** the active player drags a playable asset from hand onto the play area
- **THEN** the Play action is submitted and the card animates into its slot

#### Scenario: Illegal target

- **WHEN** a player hovers a location not connected to their current one
- **THEN** it is not highlighted as a move target and clicking does nothing

### Requirement: Prompts and choices

Every pending engine choice SHALL be shown as a clear prompt (HTML overlay) naming the deciding investigator, with selectable options either in the overlay or highlighted on the table. Skill tests SHALL show a commit window, then the revealed token and the calculation (skill + modifiers vs difficulty) before applying results.

#### Scenario: Skill test display

- **WHEN** a token is revealed
- **THEN** the token pops out of the bag with an animation and the panel shows e.g. "3 + 1 (committed) − 2 (token) = 2 vs 2 → Success"

### Requirement: Animations follow the event log

Card movement, damage, clue and doom changes SHALL be animated in the order of engine events, and input MUST be blocked while animations that precede a choice are playing.

#### Scenario: Encounter draw

- **WHEN** an investigator draws an encounter card in the mythos phase
- **THEN** the card flies from the encounter deck, flips, resolves, and then moves to its destination

### Requirement: Hot-seat play

The UI SHALL support 1–4 investigators on one device. When control passes to another investigator the camera focus and hand SHALL switch to that investigator, and the hand MUST be hidden behind a "pass to <player>" screen when handoff privacy is enabled.

#### Scenario: Turn handoff

- **WHEN** Roland ends his turn and Agnes is next
- **THEN** a "Pass to Agnes" screen appears, and after confirming, Agnes's hand is shown

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
