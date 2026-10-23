## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Transparent icon art

Every PNG icon the game still uses SHALL have a transparent background: no white or light box around round tokens or plaques. The asset script SHALL produce them that way from the source art, so re-running it gives the same result.

#### Scenario: Token on a dark panel

- **WHEN** the clue and resource token stacks are shown on the dark stat panel
- **THEN** only the round tokens are visible, with no white square around them
