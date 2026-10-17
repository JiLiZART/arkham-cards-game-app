## Purpose

Defines the official-looking icons and table art the game shows for stats, tokens, chaos tokens, skills, classes and slots, where those assets come from, and how the screen falls back when an icon is missing.

## ADDED Requirements

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
Card text and prompts that contain icon markup (`[willpower]`, `[intellect]`, `[combat]`, `[agility]`, `[wild]`, `[skull]`, `[cultist]`, `[tablet]`, `[elder_thing]`, `[elder_sign]`, `[auto_fail]`, `[guardian]`, `[seeker]`, `[rogue]`, `[mystic]`, `[survivor]`) SHALL render those icons inline at text size. Markup without an icon (for example `[action]`, `[reaction]`, `[fast]`) MUST still render as a readable symbol, never as raw brackets.

#### Scenario: Zoomed card text
- **WHEN** the player zooms Roland Banks
- **THEN** his elder sign ability shows the elder sign icon inline, and his reaction ability starts with a reaction symbol

### Requirement: Missing icon fallback
If an icon image fails to load, the UI SHALL show a text or symbol fallback in the same place, and the layout MUST stay intact.

#### Scenario: Icon file missing
- **WHEN** the doom token image cannot be loaded
- **THEN** a "Doom" text badge with the number is shown instead and nothing shifts
