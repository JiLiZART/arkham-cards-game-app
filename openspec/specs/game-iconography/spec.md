# game-iconography Specification

## Purpose
Defines the official-looking icons and table art the game shows for stats, tokens, chaos tokens, skills, classes and slots, where those assets come from, and how the screen falls back when an icon is missing.

## Requirements

### Requirement: Icon assets are served by the app
The game SHALL serve its icons and table background from the app's own static assets, copied from `inspired/icons` and the Learn to Play booklet under stable, descriptive names. At runtime the game MUST NOT read anything from `inspired/`.

#### Scenario: Fresh build
- **WHEN** the app is built and served from `dist/` without the `inspired/` folder
- **THEN** every icon and the table background still load

### Requirement: Stats and tokens use icons
Every on-screen value for health, sanity, damage, horror, clues, doom, resources and remaining actions SHALL be shown as its icon plus a number. Each skill value (willpower, intellect, combat, agility) and each class SHALL also use its icon. Emoji or plain-text labels MUST NOT be used for these values.

#### Scenario: Investigator stats
- **WHEN** Roland Banks with 2 damage, 1 horror, 3 resources and 1 clue is shown
- **THEN** his plaque shows the health icon with 7, the sanity icon with 4, the resource icon with 3 and the clue icon with 1

#### Scenario: Token on a card
- **WHEN** an enemy has 2 damage and an agenda has 3 doom
- **THEN** the enemy shows a damage token icon with 2 and the agenda shows a doom token icon with 3

### Requirement: Chaos tokens use icons
Revealed chaos tokens SHALL be shown with their icon: skull, cultist, tablet, elder thing, elder sign, auto-fail and numeric tokens. This applies in the reveal animation, the skill test panel and the result banner. A numeric token without its own art MUST be shown as its number on a generic token face.

#### Scenario: Skull revealed
- **WHEN** a skull token is revealed during a skill test
- **THEN** the skull icon pops out of the bag and appears in the skill test panel

#### Scenario: Numeric token without art
- **WHEN** a −3 token is revealed and there is no −3 image
- **THEN** a generic token face with "−3" is shown

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

### Requirement: Missing icon fallback
If an icon image fails to load, the UI SHALL show a text or symbol fallback in the same place, and the layout MUST stay intact.

#### Scenario: Icon file missing
- **WHEN** the doom token image cannot be loaded
- **THEN** a "Doom" text badge with the number is shown instead and nothing shifts

### Requirement: Table art
The game SHALL use the art from `inspired/` for table objects:
- the official card backs, at full resolution from the ArkhamCards assets:
  - the encounter back (the blue eclipse design) for the encounter deck pile, side decks and face-down encounter cards;
  - the player back (the sepia tentacle and obelisk design) for the investigators' deck piles and face-down player cards, replacing the drawn "ARKHAM" placeholder;
  - either one, by card kind, in place of any card back scan that fails to load;
- the chaos bag image for the chaos bag in the top-right corner of the screen; revealed tokens fly out of it;
- on the map, a connector plaque at the midpoint of every location connection, rotated along the link. Two-way connections use the double-headed plaque. One-way connections use the one-way plaque, pointing from the source location to the destination.

#### Scenario: Encounter deck
- **WHEN** a scenario is in progress
- **THEN** the encounter deck pile in the left panel shows the encounter card back art

#### Scenario: Player deck
- **WHEN** the viewer's deck pile is shown in the left panel
- **THEN** it shows the player card back art, not a drawn placeholder

#### Scenario: Chaos bag
- **WHEN** a skill test reveals a token
- **THEN** the token flies out of the chaos bag image in the top-right corner

#### Scenario: Connections
- **WHEN** The Gathering's Study connects to the Hallway
- **THEN** a double-headed connector plaque sits midway between them, aligned with the line joining them

#### Scenario: One-way connection
- **WHEN** a scenario declares that location A connects to B one way
- **THEN** the plaque between them is the one-way plaque pointing from A to B

### Requirement: Icon font
The game SHALL serve the ArkhamCards icon fonts (`arkhamicons`, `arkhamslim`, `tokens`, `blood`, `standalone`) and their glyph maps from its own static assets. `tokens` draws every chaos token.

`blood` and `standalone` SHALL be used for the glyphs only they have: the blood chaos token and its encounter-set icons, and the standalone scenario, encounter-set and starter-deck icons. These are drawn when content uses them; an encounter set or scenario whose code matches a glyph name shows that icon. Glyph names SHALL be resolved through the fonts' configs, so no code points are hard-coded in components.

`arkhamslim` SHALL be used for icons drawn at text size or smaller: inline icons in rules text, prompts and labels, and badges up to about 24 px. `arkhamicons` SHALL be used for larger icons. Where only one of the two fonts has a glyph, that font is used at every size.

Wherever the font has a glyph for a concept, the game SHALL draw it with the font instead of a PNG, everywhere it appears (stat bar, tokens, modals, card text, skill test panel, rail):
- skills: willpower, intellect, combat, agility, wild;
- classes: guardian, seeker, rogue, mystic, survivor, neutral;
- health and sanity;
- slots: hand, two hands, arcane, two arcane, accessory, body, ally;
- action, reaction, fast, per-investigator, bless, curse, weakness;
- every chaos token, including skull, cultist, tablet, elder thing, elder sign, auto-fail and the numbers +1 to −8. These are layered from the tokens font's fill, overlay and highlight glyphs in the official colours.

Font glyphs SHALL be coloured to match the printed icons: skills in their skill colours, classes in their class colours, health red, sanity blue.

PNG art SHALL be used only for things the fonts don't have: the physical damage, horror, clue, doom and resource tokens (including the 3- and 5-value tokens), the lead investigator token, the card back, the chaos bag and the connector plaques.

If the font fails to load, the existing text or symbol fallback MUST be shown without layout shift.

#### Scenario: Skill icons from the font
- **WHEN** the stat bar shows Roland's skills
- **THEN** the willpower, intellect, combat and agility icons are font glyphs in their skill colours, and no skill PNG is requested

#### Scenario: Chaos token from the font
- **WHEN** a skull token is revealed
- **THEN** it is drawn from the tokens font's skull layers, as numeric tokens are

#### Scenario: Inline icons use the slim font
- **WHEN** Roland's card text shows its elder sign and reaction icons inline
- **THEN** both are drawn from `arkhamslim`, while the 44 px skill icons in the stat bar come from `arkhamicons`

#### Scenario: Blood token
- **WHEN** a chaos bag contains a blood token
- **THEN** it is drawn with the `blood` glyph, and its encounter-set icons resolve from the same font

#### Scenario: Standalone scenario icon
- **WHEN** content for "Curse of the Rougarou" is added with encounter set code `curse_of_the_rougarou`
- **THEN** its icon is drawn from the `standalone` font with no extra mapping

#### Scenario: Font offline
- **WHEN** the icon font file cannot be loaded
- **THEN** skills, classes, tokens and action symbols show readable fallback labels and the layout does not shift

### Requirement: Transparent icon art
Every PNG icon the game still uses SHALL have a transparent background: no white or light box around round tokens or plaques. The asset script SHALL produce them that way from the source art, so re-running it gives the same result.

#### Scenario: Token on a dark panel
- **WHEN** the clue and resource token stacks are shown on the dark stat panel
- **THEN** only the round tokens are visible, with no white square around them
