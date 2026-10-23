## Purpose

Shows players what happens in the game as it happens — every investigator, enemy and game action as a styled, icon-rich sentence — in a live feed, a scrollable Journal and short floats that rise from whoever acted, like the damage numbers.

## ADDED Requirements

### Requirement: Live action feed

The UI SHALL show a feed of game events in a fixed column on the right side of the screen, below the chaos bag and the other investigators' tokens. It shows events for every investigator, every enemy and the game itself (phases, encounter draws, spawns, doom, act and agenda advances, resolutions).

The live feed SHALL work like a shooter's kill feed:

- **Appear at the top:** a new entry drops in at the top of the list, sliding down from above and fading in (about 300 ms). The entries below move down smoothly to make room.
- **Fade toward the bottom:** older entries sit lower and grow fainter the lower they are (the newest, at the top, is fully opaque; each older one is more transparent). They leave at the bottom of the column, fading out while sliding down, once they are older than about 12 seconds or beyond the newest 8.

An entry MUST NOT appear before the animation of its event has started, so the feed never runs ahead of the table. The feed SHALL be hidden behind the hand-off screen together with the hand.

#### Scenario: A resource is taken

- **WHEN** Roland takes the resource action
- **THEN** a new entry drops in at the top of the feed reading "[Roland's portrait] Roland Banks took 1 [resource icon]"

#### Scenario: Enemy and game actions appear too

- **WHEN** in the mythos phase doom is placed on the agenda and a Ghoul Minion spawns and attacks Daisy
- **THEN** the feed shows, newest at the top, the attack entry with damage and horror icons and Daisy's portrait, below it the spawn entry with the Ghoul Minion's thumbnail, and below that the doom entry with the doom icon

#### Scenario: Kill-feed order

- **WHEN** three events happen one after another
- **THEN** each new entry drops in at the top, the earlier ones move down and become fainter, and the oldest fades out at the bottom of the column

#### Scenario: The feed stays short

- **WHEN** 15 events happen in a row
- **THEN** at most the newest 8 entries are visible in the live feed, and older ones have faded out at the bottom

### Requirement: Styled entries

Each entry SHALL be a translated sentence built from parts, never the engine's raw text. The parts are:

- investigators as a small round portrait plus their name in their class colour;
- enemies, locations and other cards as a small card thumbnail plus the card name;
- amounts as a number plus the matching token icon (resources, clues, damage, horror, doom);
- skills as their icon, and chaos tokens as their token art;
- outcomes in colour: success green, failure red.

Every event type the engine emits SHALL have a template. A type without a specific one MUST fall back to a generic styled entry (portrait or card plus the event's text), never an empty or raw line.

#### Scenario: Skill test result

- **WHEN** Daisy investigates and fails with a −2 token
- **THEN** the entry shows Daisy's portrait and name in her class colour, the intellect icon, the −2 token art, and "failed" in red

#### Scenario: Russian

- **WHEN** the locale is `ru` and Roland draws a card
- **THEN** the entry reads in Russian, with the same portrait and card thumbnail

### Requirement: Card thumbnails open the card

When an entry involves a specific card (drawn, played, committed, discarded, an encounter card, a spawned enemy, a location moved to), it SHALL show a small thumbnail of that card. Clicking the thumbnail SHALL open the card in the card detail modal. Hovering it SHALL show the hover copy.

#### Scenario: Open a played card

- **WHEN** the feed shows "Roland Banks played [.45 Automatic thumbnail]" and the player clicks the thumbnail
- **THEN** the card detail modal opens with the .45 Automatic at full size

### Requirement: Journal history

The navbar SHALL have a **Journal** button in place of the Log button. Pressing it SHALL turn the feed column into the full history of the current scenario:

- the same styled entries, newest at the top as in the live feed;
- scrollable down to the start of the scenario, opened at the top;
- no fading;
- new entries keep appearing at the top while the player is scrolled to the top.

Pressing Journal again, or pressing Escape, SHALL return to the live feed.

#### Scenario: Look back

- **WHEN** after three rounds the player presses Journal and scrolls down
- **THEN** they can read every entry since the scenario began, styled as in the feed, and pressing Journal again restores the live feed

### Requirement: Action floats

As each new entry appears, the same styled sentence SHALL float up from whoever did it and fade out over about 1.5 seconds, the way the floating damage numbers do:

- an investigator's action starts at their portrait on the map;
- an enemy's action starts at its card on the map;
- an action with no actor on the map, or whose actor is off-screen (a phase change, doom, an encounter draw), starts at the centre of the screen.

A float SHALL follow its anchor while the camera pans or zooms. When several entries arrive together, their floats SHALL be staggered and stacked so each stays readable. Floats MUST NOT intercept the pointer. They replace the plain-text event banner.

#### Scenario: Float from the investigator

- **WHEN** Roland, whose portrait is on the Study, takes the resource action
- **THEN** "[portrait] Roland Banks took 1 [resource icon]" rises from Roland's portrait on the Study and fades, while the same entry drops into the feed

#### Scenario: Float from an enemy

- **WHEN** a Ghoul Minion on the Cellar attacks Roland for 1 damage and 1 horror
- **THEN** the styled attack entry rises from the Ghoul Minion's card and fades

#### Scenario: No actor on screen

- **WHEN** the mythos phase places 1 doom on the agenda
- **THEN** the doom entry rises from the centre of the screen and fades

#### Scenario: Burst

- **WHEN** a scenario starts and many events arrive at once
- **THEN** only the last three float, staggered, and the screen isn't flooded
