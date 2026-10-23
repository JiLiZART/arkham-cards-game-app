## ADDED Requirements

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
