## Purpose

Shows players what happens in the game as it happens — every investigator, enemy and game action as a styled, icon-rich sentence — in a live feed, a scrollable Journal and short centre-screen toasts.

## ADDED Requirements

### Requirement: Live action feed
The UI SHALL show a feed of game events in a fixed column on the right side of the screen, below the chaos bag and the other investigators' tokens. It shows events for every investigator, every enemy and the game itself (phases, encounter draws, spawns, doom, act and agenda advances, resolutions).

The live feed SHALL animate both ways:
- **Appear:** a new entry slides up from below and fades in at the bottom of the list (about 300 ms). The entries above move up smoothly to make room.
- **Fade from bottom to top:** older entries sit higher and grow fainter the higher they are (the newest is fully opaque, each older one more transparent). They leave at the top of the column, fading out while sliding upward, once they are older than about 12 seconds or beyond the newest 8.

An entry MUST NOT appear before the animation of its event has started, so the feed never runs ahead of the table. The feed SHALL be hidden behind the hand-off screen together with the hand.

#### Scenario: A resource is taken
- **WHEN** Roland takes the resource action
- **THEN** a new entry fades in at the bottom of the feed reading "[Roland's portrait] Roland Banks took 1 [resource icon]"

#### Scenario: Enemy and game actions appear too
- **WHEN** in the mythos phase doom is placed on the agenda and a Ghoul Minion spawns and attacks Daisy
- **THEN** the feed shows, in order, the doom entry with the doom icon, the spawn entry with the Ghoul Minion's thumbnail, and the attack entry with damage and horror icons and Daisy's portrait

#### Scenario: Entries appear at the bottom and fade out toward the top
- **WHEN** three events happen one after another
- **THEN** each new entry slides in and fades in at the bottom, the earlier ones move up and become fainter, and the oldest fades out upward at the top of the column

#### Scenario: The feed stays short
- **WHEN** 15 events happen in a row
- **THEN** at most the newest 8 entries are visible in the live feed, and older ones have faded out at the top

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
- the same styled entries, oldest first;
- scrollable, opened scrolled to the newest entry;
- no fading;
- following new entries while scrolled to the bottom.

Pressing Journal again, or pressing Escape, SHALL return to the live feed.

#### Scenario: Look back
- **WHEN** after three rounds the player presses Journal and scrolls up
- **THEN** they can read every entry since the scenario began, styled as in the feed, and pressing Journal again restores the live feed

### Requirement: Centre-screen toasts
As each new entry appears, the same styled sentence SHALL appear briefly in the middle of the screen. It is larger, floats upward and fades out over about 1.5 seconds, like the floating damage numbers. When several entries arrive together, their toasts SHALL be staggered and stacked so each stays readable. Toasts MUST NOT intercept the pointer. They replace the plain-text event banner.

#### Scenario: Toast for an attack
- **WHEN** a Ghoul Minion attacks Roland for 1 damage and 1 horror
- **THEN** a toast with the Ghoul Minion thumbnail, Roland's portrait and the damage and horror icons floats up from the centre of the screen and fades, while the same entry appears in the feed
