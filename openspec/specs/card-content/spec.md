# card-content Specification

## Purpose
Defines how cards, encounter sets, scenarios, campaigns, investigators, decks and translations live on disk as plain data files, how they are imported from public card databases, validated and loaded, and how card behavior is described.

## Requirements

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

Russian card text SHALL be layered field by field: imported translations, then the print-matched texts (taken from the Russian card images), then hand-written fixes. For every card with a Russian image, the name, subtitle, traits and rules text SHALL match what is printed on that image, with the game's icon and emphasis markup. The feed, details columns, prompts and modals therefore use the same words as the card shown.

#### Scenario: Missing translation falls back
- **WHEN** the locale is `ru` and a card has no Russian name
- **THEN** the English name is shown

#### Scenario: Names match the shown card
- **WHEN** the locale is Russian and Roland plays the card whose Russian image reads "Кольт 45-го калибра"
- **THEN** the feed entry and the details column name it "Кольт 45-го калибра", not the imported "Пистолет 45-го калибра"

#### Scenario: Icons kept in rules text
- **WHEN** the details column shows the Russian Machete
- **THEN** its text reads as printed, with the fight action shown as the action icon and the combat bonus as the combat icon

### Requirement: Card images
Each card SHALL resolve to a front (and back, if double-sided) image URL derived from its code and the current locale. When an image fails to load, the UI MUST render a text-based card face from the card data instead.

With the Russian locale, a card SHALL use its Russian image when one was imported, on each side separately. Otherwise it uses the English scan. Other locales use the English scans. Switching the language SHALL switch the card images on screen, hand, map and panels included, without reloading the game.

#### Scenario: Image offline
- **WHEN** the image CDN is unreachable
- **THEN** cards are still rendered with name, cost, stats, icons and text

#### Scenario: Russian image
- **WHEN** the locale is Russian and Roland's Machete is in his hand
- **THEN** the hand shows the Russian Machete card image ("Мачете")

#### Scenario: No Russian image
- **WHEN** the locale is Russian and a card has no imported Russian image
- **THEN** its English scan is shown

#### Scenario: Switch language
- **WHEN** the player switches from Russian to English during a game
- **THEN** the hand, the strip, the map and the act/agenda panel show the English scans

### Requirement: Reused translations
Translations SHALL be imported from existing community sources into our locale files, not written by hand:
- from the ArkhamCards data, campaign names, scenario names, encounter set names, campaign log section titles, campaign narrative text, and UI labels that match a `ru.po` entry;
- from ArkhamDB's localized API, card names, subtitles, traits and text.

The import SHALL be a repeatable script that only writes files under `content/i18n/<locale>/`. Hand-written translations in those files MUST be kept when the script is re-run. At runtime the game MUST NOT read from `inspired/`.

#### Scenario: Russian scenario name
- **WHEN** the locale is `ru` and The Gathering is started
- **THEN** the scenario is titled with its Russian name from the ArkhamCards data

#### Scenario: Russian card text
- **WHEN** the locale is `ru` and the player hovers Machete (01020)
- **THEN** the card's name and text are shown in Russian from the imported data

#### Scenario: Re-run keeps manual fixes
- **WHEN** a translator has hand-edited a string and the import script runs again
- **THEN** the hand-edited string is unchanged

### Requirement: Russian card import
A local import tool SHALL build the Russian images and print texts from `inspired/CARDS_ru` (preferred) and the card images embedded in `inspired/PDF_ru` (fallback). It SHALL:
- identify each image's card code by OCR of its name and text, checked against the card's type and printed stats;
- write a manifest that maps each code and side to its source file, with the match confidence;
- accept review overrides that pin or reject a match, so a rerun keeps the decisions;
- list unmatched and low-confidence images, with a contact sheet that shows each Russian image beside the card's English scan for review;
- output 50%-size WebP images for the cards in the current content.

The import is reproducible: rerunning it on the same inputs and overrides produces the same manifest and images. Its outputs are committed; the game and the deploy never read `inspired/`.

#### Scenario: Two sides of a location
- **WHEN** the import meets "Кабинет.jpg" and "Кабинет 2.jpg"
- **THEN** it maps the first to the Study's unrevealed side and the second to its revealed side

#### Scenario: Same name, different level
- **WHEN** the import meets "Физическая тренировка.jpg" and "Физическая тренировка 2.JPG"
- **THEN** each is matched to the card whose level and text it shows, not by its file name

#### Scenario: Card missing from the community set
- **WHEN** an act has no image in `CARDS_ru`
- **THEN** its image comes from the PDF scans, and the manifest records the PDF as its source

#### Scenario: Low confidence
- **WHEN** an image's OCR doesn't clearly match one card
- **THEN** it is not used until a review override pins it, and it appears on the review contact sheet
