# game-iconography Specification

## Purpose

Defines the official-looking icons and table art the game shows for stats, tokens, chaos tokens, skills, classes and slots, where those assets come from, and how the screen falls back when an icon is missing.

## Requirements

### Requirement: Icon assets are served by the app

The game SHALL serve its icons and table background from the app's own static assets: the generated icon sprite, the remaining PNG token art copied from `inspired/icons`, and the table art from the Learn to Play booklet, under stable, descriptive names. At runtime the game MUST NOT read anything from `inspired/`.

#### Scenario: Fresh build

- **WHEN** the app is built and served from `dist/` without the `inspired/` folder
- **THEN** every icon and the table background still load

### Requirement: Stats and tokens use icons

Every on-screen value for health, sanity, damage, horror, clues, doom, resources and remaining actions SHALL be shown as its icon plus a number. Each skill value (willpower, intellect, combat, agility) and each class SHALL also use its icon. Emoji or plain-text labels MUST NOT be used for these values.

Clues and resources SHALL be drawn from the PNG token art (`public/icons/clue.png`, `clue-3.png`, `resource.png`, `resource-3.png`, `resource-5.png`) everywhere they appear: the stat bar's token row, clue piles on locations, the action rail, the feed and Journal, the glance chips, the hand and location details and the campaign log. Where a stack is shown (the stat bar, a location's clues), it uses the fewest tokens of the 5, 3 and 1 (resources) or 3 and 1 (clues) denominations with the total beside it; elsewhere the single token is shown with the number.

#### Scenario: Investigator stats

- **WHEN** Roland Banks with 2 damage, 1 horror, 3 resources and 1 clue is shown
- **THEN** his plaque shows the health icon with 7, the sanity icon with 4, the resource token image with 3 and the clue token image with 1

#### Scenario: Token on a card

- **WHEN** an enemy has 2 damage and an agenda has 3 doom
- **THEN** the enemy shows a damage token icon with 2 and the agenda shows a doom token icon with 3

#### Scenario: Clue chip

- **WHEN** a hand card's glance badge says it discovers a clue
- **THEN** the chip shows the clue token image (`clue.png`), not a sprite symbol

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
- chaos tokens: `[skull]`, `[cultist]`, `[tablet]`, `[elder_thing]`, `[elder_sign]`, `[auto_fail]`, `[bless]`, `[curse]`, `[frost]`;
- classes: `[guardian]`, `[seeker]`, `[rogue]`, `[mystic]`, `[survivor]`;
- other symbols: `[action]`, `[reaction]`, `[fast]`/`[free]`, `[per_investigator]`, `[unique]`, `[weakness]`.

Markup SHALL be drawn from the sprite. Markup the sprite does not know SHALL show the text fallback. Raw brackets MUST NOT be shown.

#### Scenario: Zoomed card text

- **WHEN** the player zooms Roland Banks
- **THEN** his elder sign ability shows the elder sign icon inline, and his reaction ability starts with the reaction symbol from the sprite

#### Scenario: Per-investigator value

- **WHEN** a card's text contains `2[per_investigator]`
- **THEN** it shows "2" followed by the per-investigator symbol from the sprite

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

### Requirement: Transparent icon art

Every PNG icon the game still uses (damage, horror, doom, lead, the connector plaques, the chaos bag) SHALL have a transparent background: no white or light box around round tokens or plaques. The asset script SHALL produce them that way from the source art, so re-running it gives the same result.

#### Scenario: Token on a dark panel

- **WHEN** a doom token sits on the dark agenda panel
- **THEN** only the round token is visible, with no white square around it

### Requirement: Icon sprite

The game SHALL draw its icons from one SVG sprite, `public/icons/sprite.svg`, generated by an import script from the vector icon sources in `inspired/svg-icons`. The sprite SHALL contain every glyph the former icon fonts had (the union of ArkhamCards' IcoMoon configurations, which includes every encounter-set and scenario icon they know) plus the icons the game references by name, so a future campaign whose sets and scenarios the icon set knows needs no rebuild of the sprite.

Wherever the sprite has a symbol for a concept, the game SHALL draw it from the sprite instead of a PNG or a font, everywhere it appears (stat bar, tokens, modals, card text, skill test, rail, ribbon, Journal):

- skills: willpower, intellect, combat, agility, wild;
- classes: guardian, seeker, rogue, mystic, survivor, neutral;
- health and sanity;
- slots: hand, two hands, arcane, two arcane, accessory, body, ally;
- action, reaction, free, per-investigator, bless, curse, weakness, unique;
- every chaos token, including skull, cultist, tablet, elder thing, elder sign, auto-fail, bless, curse, frost and the numbers +1 to −8, layered from the sprite's fill, overlay and highlight symbols in the official colours;
- every encounter set and scenario the icon set knows.

Icons SHALL be coloured to match the printed ones: skills in their skill colours, classes in their class colours, health red, sanity blue; a layered icon (a skill box under its white glyph, a token's layers) is drawn as stacked symbols, each in its own colour. Icons SHALL render at any size without loss and MUST NOT flash blank while assets load: the sprite is fetched once and injected into the document before the table is shown.

PNG art SHALL be used for the cardboard tokens (damage, horror, doom, clues, resources, the lead investigator token), the connector plaques and the chaos bag, which is the painted bag image wherever it appears (the top-right button, the bag modal and the token draw). Clue and resource stacks use their 3 and 5 token images; damage, horror and doom are the single icon with a count.

#### Scenario: Skill icons from the sprite

- **WHEN** the stat bar shows Roland's skills
- **THEN** the willpower, intellect, combat and agility icons are sprite symbols in their skill colours, and no font or skill PNG is requested

#### Scenario: Chaos token from the sprite

- **WHEN** a skull token is revealed
- **THEN** it is drawn from the sprite's skull fill, overlay and highlight layers, as numeric tokens are

#### Scenario: Resource stack

- **WHEN** Roland has 5 resources
- **THEN** the `resource-5` token image is shown with the total 5

#### Scenario: Cardboard token kept

- **WHEN** an enemy has 2 damage
- **THEN** the damage token is the PNG art with "2", as before

#### Scenario: No flash

- **WHEN** the game screen opens on a cold load
- **THEN** every icon is drawn on the first frame the table appears; no icon shows blank and then fills in

#### Scenario: Future campaign

- **WHEN** content for "Curse of the Rougarou" is added with encounter set code `curse_of_the_rougarou`
- **THEN** its icon is drawn from the sprite with no extra mapping or rebuild

#### Scenario: The painted chaos bag

- **WHEN** the table is on screen
- **THEN** the chaos bag button in the top-right corner is the painted bag PNG, not a sprite glyph, and the token draw throws the same image

### Requirement: Encounter set and scenario icons

The Journal SHALL show the encounter set's icon on entries that draw or reveal an encounter card, before the card's name. The encounter deck pile SHALL carry the icon of the set of its top card's set, or the scenario's icon when the top is unknown. The ribbon SHALL show the scenario's icon next to its name. Ability buttons on strip cards and in the card modal SHALL show the action, reaction or free symbol of the ability before its label.

#### Scenario: Journal entry

- **WHEN** Roland draws Rotting Remains (set: Striking Fear)
- **THEN** the Journal entry reads "[striking_fear] Rotting Remains" with the set's icon drawn from the sprite

#### Scenario: Ribbon

- **WHEN** The Gathering is in play
- **THEN** the ribbon shows the Gathering's icon before "The Gathering"

#### Scenario: Ability button

- **WHEN** Roland's .45 Automatic offers its fight ability in the strip
- **THEN** the button shows the action symbol before "Fight"

### Requirement: Icon provenance

Every symbol in the sprite SHALL be listed in `content/icons/icons.json` with its source file and the icon set it comes from, and the README SHALL credit the set. `check:content` SHALL fail when a loaded encounter set or scenario has no icon in the sprite, or when the sprite is missing or lists a symbol the manifest does not.

#### Scenario: Missing set icon

- **WHEN** a scenario names an encounter set `made_up_set` that the icon set does not know
- **THEN** `check:content` reports it and fails
