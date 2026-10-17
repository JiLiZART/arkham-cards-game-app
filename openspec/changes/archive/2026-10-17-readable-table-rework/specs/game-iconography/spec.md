## MODIFIED Requirements

### Requirement: Rules text icons
Card text and prompts that contain icon markup SHALL render those icons inline at text size. The markup is:
- skills: `[willpower]`, `[intellect]`, `[combat]`, `[agility]`, `[wild]`;
- chaos tokens: `[skull]`, `[cultist]`, `[tablet]`, `[elder_thing]`, `[elder_sign]`, `[auto_fail]`;
- classes: `[guardian]`, `[seeker]`, `[rogue]`, `[mystic]`, `[survivor]`;
- other symbols: `[action]`, `[reaction]`, `[fast]`/`[free]`, `[per_investigator]`, `[bless]`, `[curse]`.

Markup without PNG art SHALL use the matching icon font glyph. Raw brackets MUST NOT be shown.

#### Scenario: Zoomed card text
- **WHEN** the player zooms Roland Banks
- **THEN** his elder sign ability shows the elder sign icon inline, and his reaction ability starts with the reaction glyph from the icon font

#### Scenario: Per-investigator value
- **WHEN** a card's text contains `2[per_investigator]`
- **THEN** it shows "2" followed by the per-investigator glyph

## ADDED Requirements

### Requirement: Table art
The board SHALL use the art from `inspired/` for table objects:
- the encounter card back for the encounter deck pile and face-down encounter cards, and in place of any card back image that fails to load;
- the chaos bag image for the chaos bag; revealed tokens fly out of it;
- a connector plaque at the midpoint of every location connection, rotated along the link. Two-way connections use the double-headed plaque. One-way connections use the one-way plaque, pointing from the source location to the destination.

#### Scenario: Encounter deck
- **WHEN** a scenario is in progress
- **THEN** the encounter deck pile shows the encounter card back art

#### Scenario: Chaos bag
- **WHEN** a skill test reveals a token
- **THEN** the token flies out of the chaos bag image

#### Scenario: Connections
- **WHEN** The Gathering's Study connects to the Hallway
- **THEN** a double-headed connector plaque sits midway between them, aligned with the line joining them

#### Scenario: One-way connection
- **WHEN** a scenario declares that location A connects to B one way
- **THEN** the plaque between them is the one-way plaque pointing from A to B

### Requirement: Icon font
The game SHALL serve the ArkhamCards icon fonts and their glyph maps from its own static assets. These cover action, reaction, fast, health, sanity, per-investigator, slots, skills, classes and every chaos token, including −2 to −8, 0 and +1. The game SHALL use them wherever no PNG icon exists, including the action rail and numeric chaos tokens. Glyph names SHALL be resolved through the font's config, so no code points are hard-coded in components. If the font fails to load, the existing text or symbol fallback MUST be shown.

#### Scenario: Numeric chaos token
- **WHEN** a −3 token is revealed
- **THEN** it is drawn with the −3 glyph from the tokens font rather than a plain number

#### Scenario: Font offline
- **WHEN** the icon font file cannot be loaded
- **THEN** the action rail and card text show readable fallback symbols and the layout does not shift
