## MODIFIED Requirements

### Requirement: Localization

User-visible card text, names and UI strings SHALL resolve through locale files with English as the default and fallback, string by string: a card field, a UI key, a campaign or scenario field or an encounter-set name the locale lacks reads in English, and the rest of the screen stays in the locale. A locale SHALL be a folder under `content/i18n/<locale>/` named by its BCP 47 tag in lower case; the folder name is the stored locale, the `html[lang]` value and the tag given to `Intl` formatting. Adding a locale MUST only require adding translation files; the import command SHALL produce a locale's card translations for every cycle from the snapshot's `translations/<source>` folder, and campaign text (scenario intros, resolutions, encounter-set names) from ArkhamCards' data.

The content SHALL hold eleven locales: `en`, `ru`, `de`, `es`, `fr`, `it`, `ko`, `pl`, `pt`, `zh-hant` and `zh-hans`. `en` and `ru` are the maintained locales, whose UI strings are written by hand; the other nine carry imported text only and the one hand-written key `lang.name`, the language's name in itself.

A locale's generated text (`cards.generated.json`, `campaigns.generated.json`, `ui.generated.json`) SHALL load when the locale is chosen, like a card pack: before the first screen for the start locale, and before the screen re-renders when the player switches. The hand-written `ui.json` and `cards.json` of every locale ship in the first load, so the locale list and the endonyms are known at once. English, the fallback, is always loaded.

Russian card text SHALL be layered field by field: imported translations, then the print-matched texts (taken from the Russian card images), then hand-written fixes. For every card with a Russian image, the name, subtitle, traits and rules text SHALL match what is printed on that image, with the game's icon and emphasis markup. The feed, details columns, prompts and modals therefore use the same words as the card shown.

#### Scenario: Missing translation falls back

- **WHEN** the locale is `ru` and a card has no Russian name
- **THEN** the English name is shown

#### Scenario: A partial locale

- **WHEN** the locale is `pl` and Roland is at the Study with Machete in hand
- **THEN** the hand shows "Maczeta" with its Polish text, the scenario is titled "Zgromadzenie", and the instruction bar's prompt, which no Polish source holds, reads in English

#### Scenario: Traditional and Simplified Chinese apart

- **WHEN** the locale is `zh-hant` and then `zh-hans` and the Night of the Zealot tile is shown
- **THEN** it reads "狂熱之夜" under `zh-hant` and "狂热之夜" under `zh-hans`, each with `html[lang]` set to that tag

#### Scenario: Text loads with the locale

- **WHEN** the app opens in a browser whose language is German and no locale was saved
- **THEN** the German generated text has loaded before the title screen renders, and the first load did not fetch the Korean or Polish generated files

#### Scenario: Names match the shown card

- **WHEN** the locale is Russian and Roland plays the card whose Russian image reads "Кольт 45-го калибра"
- **THEN** the feed entry and the details column name it "Кольт 45-го калибра", not the imported "Пистолет 45-го калибра"

#### Scenario: Icons kept in rules text

- **WHEN** the details column shows the Russian Machete
- **THEN** its text reads as printed, with the fight action shown as the action icon and the combat bonus as the combat icon

#### Scenario: Russian text for a later cycle

- **WHEN** the locale is Russian and Zoey Samaras' card is looked up
- **THEN** her name, traits and text are the snapshot's Russian ones

### Requirement: Reused translations

Translations SHALL be imported from existing community sources into our locale files, not written by hand:

- from the ArkhamCards data, campaign names, scenario names, encounter set names, campaign log section titles, campaign narrative text, flow steps and interlude names, and UI labels that match a `<source>.po` entry;
- from ArkhamDB's localized data, card names, subtitles, traits and text.

Each locale SHALL name its sources in one map in the import: the `.po` file, the suffix of the `all_campaigns_*` and `encounter_sets_*` files, and the ArkhamDB translations folder (`zh-hant` reads `zh`, `zh`, `zh`; `zh-hans` reads `zh-cn`, `zh_cn`, `zh-cn`; every other locale reads its own tag). The import SHALL be a repeatable script that only writes files under `content/i18n/<locale>/`, creating the folder when it is new, importing every locale in the map with `--all` or one with `--locale`, and treating a source file or folder the locale lacks as empty rather than failing. Hand-written translations in those files MUST be kept when the script is re-run. At runtime the game MUST NOT read from `inspired/`.

`check:content` SHALL require every prompt's instruction, the tips and the How to play strings in the maintained locales (`en`, `ru`) only; for every locale it SHALL require `lang.name` in the locale's own `ui.json` and print how many UI keys the locale has from a source and, per cycle, how many cards have its text.

#### Scenario: Russian scenario name

- **WHEN** the locale is `ru` and The Gathering is started
- **THEN** the scenario is titled with its Russian name from the ArkhamCards data

#### Scenario: Russian card text

- **WHEN** the locale is `ru` and the player hovers Machete (01020)
- **THEN** the card's name and text are shown in Russian from the imported data

#### Scenario: Every locale in one run

- **WHEN** `pnpm import:i18n --all` runs
- **THEN** each of the ten non-English locale folders holds `campaigns.generated.json`, `ui.generated.json`, `cards.generated.json`, `packs/*.generated.json` and `campaign-texts/*.json`, the run prints one summary line per locale, and a second run changes no file

#### Scenario: A source a locale lacks

- **WHEN** the import runs for a locale whose ArkhamDB translations folder is absent
- **THEN** the locale's campaign and UI files are written, no card file is written, and the summary says 0 card texts

#### Scenario: Re-run keeps manual fixes

- **WHEN** a translator has hand-edited a string and the import script runs again
- **THEN** the hand-edited string is unchanged

#### Scenario: An imported locale passes the content check

- **WHEN** `pnpm check:content` runs with `content/i18n/de/ui.json` holding only `lang.name`
- **THEN** it reports no missing string for `de`, prints the count of German UI keys and the per-cycle German card coverage, and fails if `lang.name` were absent

### Requirement: Every cycle's cards as data

The content SHALL hold every cycle of the card game that the local ArkhamDB snapshot (`inspired/arkhamdb-json-data`) describes, one pack folder per cycle under `content/packs/<cycle>/`, generated by the import command and never edited by hand (hand-written behaviour stays in each pack's `cards.json`). The game SHALL load the core pack and the packs the loaded scenarios need before the first screen, and the other packs on demand (deck editing, card lookup), so the first load does not grow with the number of packs. `check:content` SHALL validate every pack and report, per cycle and per locale, the card count and the locale's text coverage.

The `nat` pack SHALL be reported complete by the coverage, and Nathaniel Cho's investigator entry true.

#### Scenario: Dunwich cards exist

- **WHEN** the content is loaded
- **THEN** `db.cards["02001"]` (Zoey Samaras) exists with her stats and text, and no Dunwich scenario appears in the campaign list

#### Scenario: First load unchanged

- **WHEN** the title screen opens
- **THEN** only the core pack and the Night of the Zealot encounter sets have been loaded; the other packs load when a deck editor or a lookup asks for them

#### Scenario: Coverage report

- **WHEN** `check:content` runs
- **THEN** it prints, for each cycle and each non-English locale, the number of cards and how many have that locale's text, and fails on any schema or reference error in any pack

#### Scenario: The nat pack is complete

- **WHEN** `npm run coverage` runs
- **THEN** `content/coverage.json` reports pack `nat` with 28 of 28 player cards working and `investigators["60101"]` true, and `docs/campaign-program.md` ticks the `nat` row
