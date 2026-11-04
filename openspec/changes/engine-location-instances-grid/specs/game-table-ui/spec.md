## MODIFIED Requirements

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

Each location SHALL be drawn at the cell the engine's map gives its instance, and the lines between locations SHALL be the engine's connections for those instances, so two copies of one card sit in two cells and a link added or removed during play is drawn or dropped. A location that has no cell SHALL be placed in a spare row below the map.

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

#### Scenario: Two copies apart

- **WHEN** two copies of 02324 are in play in Lost in Time and Space
- **THEN** they are drawn in two different cells, each with its own connection lines

#### Scenario: A car leaves the line

- **WHEN** the Essex County Express's leftmost car is removed
- **THEN** its card and its lines are gone from the map on the next frame of the event clock
