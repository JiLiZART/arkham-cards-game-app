## Purpose

Defines how cards, encounter sets, scenarios, campaigns, investigators, decks and translations live on disk as plain data files, how they are imported from public card databases, validated and loaded, and how card behavior is described.

## ADDED Requirements

### Requirement: Content lives in data files
All game content SHALL be stored as files under a single `content/` directory, organized so that a campaign, its scenarios and its encounter sets live together, and player cards live grouped by pack. No card stats, scenario setup or campaign flow MUST be hard-coded in engine code.

#### Scenario: Add a new campaign
- **WHEN** a developer adds a new campaign folder with valid campaign, scenario and card files
- **THEN** the campaign appears in the campaign selection without any engine code change (except optional per-card effect scripts)

### Requirement: Card record format
Each card SHALL be identified by its ArkhamDB code and SHALL carry the fields needed by the rules: type, faction(s), cost, skill icons, traits, slots, health/sanity, uses, XP level, deck limit, text, and type-specific stats (enemy fight/health/evade/damage/horror/keywords, location shroud/clues/connections, act/agenda thresholds, treachery keywords), plus image reference and encounter set.

#### Scenario: Enemy record
- **WHEN** the Ghoul Priest record is loaded
- **THEN** it exposes fight, health (per investigator), evade, damage, horror, keywords Hunter and Retaliate, and victory 2

### Requirement: Data-driven card effects
Card behavior SHALL be declared in data using a fixed vocabulary of triggers (e.g. on play, on reveal, after successful investigate, forced at end of round), conditions and effects (e.g. deal damage, discover clue, gain resources, draw cards, modify skill, spawn enemy, place doom, add/remove token). Cards whose behavior cannot be expressed this way SHALL be able to reference a code script keyed by card code. Unknown effect names MUST fail validation.

#### Scenario: Declarative card
- **WHEN** Emergency Cache is played
- **THEN** its data-declared effect "gain 3 resources" resolves without any card-specific script

#### Scenario: Scripted card
- **WHEN** a card declares `script: true` and a script file for its code exists
- **THEN** the engine runs that script for the card's ability

### Requirement: Content validation
Content SHALL be validated against a schema at load time and by a standalone check command. Validation MUST report file path and field for every error, and MUST detect references to missing card codes, encounter sets, locations or scenarios.

#### Scenario: Missing card reference
- **WHEN** a deck lists card code `01999` that does not exist
- **THEN** validation fails naming the deck file and the missing code

### Requirement: Import from public card databases
A command SHALL fetch card data for a given pack or encounter set from ArkhamDB (or the arkham.build card cache) and write/merge it into `content/`, preserving hand-written effect definitions and overrides already present in those files.

#### Scenario: Re-import keeps effects
- **WHEN** the import is re-run for the core set after effects were added to a card
- **THEN** stats/text are refreshed and the effect definitions remain unchanged

### Requirement: Localization
User-visible card text, names and UI strings SHALL resolve through locale files with English as the default and fallback. Adding a locale MUST only require adding translation files.

#### Scenario: Missing translation falls back
- **WHEN** the locale is `ru` and a card has no Russian name
- **THEN** the English name is shown

### Requirement: Card images
Each card SHALL resolve to a front (and back, if double-sided) image URL derived from its code. When an image fails to load, the UI MUST render a text-based card face from the card data instead.

#### Scenario: Image offline
- **WHEN** the image CDN is unreachable
- **THEN** cards are still rendered with name, cost, stats, icons and text
