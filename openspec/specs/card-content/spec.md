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

An ability's cost SHALL be able to take damage from its controller, as it can take horror, and a heal SHALL be able to target an Ally asset as well as an investigator: one at the controller's location, or one the controller controls, as the card prints it. A heal from among several investigators ("heal 2 damage from among investigators at your location") SHALL let the player place each point.

These cards' abilities SHALL be declared, each spending its uses as printed and discarding the card when it has none left where the card says so: Flesh Ward (cancel 1 damage or horror just dealt by an enemy attack), Clarity of Mind (level 0 and 3), Smoking Pipe, Painkillers, Strange Solution, First Aid (level 3), Healing Words (level 0 and 3), Sinha's Medical Kit, Extra Rations and Canteen.

The vocabulary SHALL express the Guardian fight cards: a play ability carries an action designator and can be marked as provoking no attack of opportunity, or as playable during any player window; a fight can name its target (the triggering enemy), succeed automatically, and chain a second attack on success; an effect can pull a non-Elite enemy from within a range to your location, engage it and attack it; engage any number of enemies at your location with effects per enemy; ready a controlled asset by filter; grant an additional action restricted to one designator; search the deck and discard pile for a card and play it; move to the triggering location; discover clues at your location or a connecting one; target another investigator at your location, or an enemy engaged with you; add to damage being dealt to an enemy; take an amount from the tokens on the card itself; a cost paid from the card's uses or the pool; conditions on the first action of a turn, on the card dealing the damage, on a move from your location, and on the printed health of enemies you defeated this turn; and an enemy that takes at most 1 damage at a time.

Every card of the `nat` pack SHALL have its behaviour: Nathaniel Cho, Randall Cho, Tommy Malloy, Self-Destructive, Boxing Gloves (0, 3), Flesh Ward, Grete Wagner (0, 3), Relentless, Safeguard, Clean Them Out, Counterpunch (0, 2), "Get over here!" (0, 2), Glory, Monster Slayer, One-Two Punch (0, 5), Stand Together, Evidence! (1), Galvanize, Lesson Learned, Mano a Mano, Overpower (2), Dynamite Blast (3), Taunt (3) and Physical Training (4); Dynamite Blast (3) by the core Dynamite Blast's script, the rest in data.

#### Scenario: Declarative card

- **WHEN** Emergency Cache is played
- **THEN** its data-declared effect "gain 3 resources" resolves without any card-specific script

#### Scenario: Scripted card

- **WHEN** a card declares `script: true` and a script file for its code exists
- **THEN** the engine runs that script for the card's ability

#### Scenario: A cost that takes damage

- **GIVEN** Smoking Pipe in play with 3 supplies and its controller with 1 horror
- **WHEN** they use it
- **THEN** they take 1 damage as its cost, it exhausts, it has 2 supplies, and they heal 1 horror

#### Scenario: Healing an Ally

- **GIVEN** First Aid (level 3) in play and an Ally asset with 1 damage and 1 horror at its controller's location
- **WHEN** they use First Aid and choose the Ally
- **THEN** the Ally heals 1 damage and 1 horror, and First Aid has one supply fewer

#### Scenario: Out of uses

- **GIVEN** Extra Rations with 1 supply
- **WHEN** its controller spends the last supply
- **THEN** they heal 1 damage and Extra Rations is discarded

#### Scenario: Spread among investigators

- **GIVEN** Healing Words (level 3) and two investigators at the location with 1 damage each
- **WHEN** it is used
- **THEN** the player places the first point and then the second, and both heal 1 damage

#### Scenario: Clean Them Out

- **GIVEN** Nathaniel with 0 resources, engaged with a Ghoul Minion
- **WHEN** he plays Clean Them Out
- **THEN** he has 2 resources before the attack's skill test begins, and the test is a fight against the Ghoul Minion

#### Scenario: One-Two Punch

- **GIVEN** Nathaniel engaged with a Ghoul Priest
- **WHEN** he plays One-Two Punch (0) and the first attack (+1 combat) succeeds
- **THEN** he may attack the Ghoul Priest again at +2 combat for 2 damage, or stop

#### Scenario: "Get over here!"

- **GIVEN** a non-Elite enemy at a connecting location and Nathaniel unengaged
- **WHEN** he plays "Get over here!" (0) and chooses it
- **THEN** the enemy is at his location, engaged with him, and he attacks it; an Elite enemy is not offered

#### Scenario: Randall Cho's choice

- **GIVEN** Randall Cho entering play, Nathaniel with 3 damage and Boxing Gloves in his discard pile
- **WHEN** he chooses to search
- **THEN** he is offered the Weapon assets of his deck and discard pile, plays Boxing Gloves paying its cost, and his deck is shuffled; had he chosen to heal, he would have 0 damage

#### Scenario: Evidence! counts the turn's defeats

- **GIVEN** Nathaniel defeated a Ghoul Minion (health 2) earlier this turn
- **WHEN** he defeats an Acolyte (health 1) and plays Evidence! (1)
- **THEN** he discovers 1 clue; had the second enemy had 2 or more health, he would discover 2

#### Scenario: Safeguard follows

- **GIVEN** Nathaniel with Safeguard ready and Daisy at his location
- **WHEN** Daisy moves to a connecting location
- **THEN** Nathaniel may exhaust Safeguard to move there too; when Daisy moves from another location he is not offered it

#### Scenario: Stand Together

- **GIVEN** Nathaniel and Daisy at a location, Roland elsewhere
- **WHEN** Nathaniel plays Stand Together
- **THEN** he chooses Daisy (Roland and himself are not offered) and both gain 2 resources

#### Scenario: Nathaniel's elder sign

- **GIVEN** Nathaniel attacking with Clean Them Out in his discard pile
- **WHEN** he reveals the elder sign and succeeds
- **THEN** the token counts +1 and he returns Clean Them Out to his hand; on an investigation the token counts +1 and nothing returns

### Requirement: Content validation

Content SHALL be validated against a schema at load time and by a standalone check command. Validation MUST report file path and field for every error, and MUST detect references to missing card codes, encounter sets, locations or scenarios.

#### Scenario: Missing card reference

- **WHEN** a deck lists card code `01999` that does not exist
- **THEN** validation fails naming the deck file and the missing code

### Requirement: Import from public card databases

A command SHALL build card data for a given cycle, or every cycle, from the local ArkhamDB JSON snapshot in `inspired/arkhamdb-json-data` (packs, encounters, cycles), and write/merge it into `content/packs/<cycle>/cards.generated.json`, preserving hand-written effect definitions and overrides already present in `cards.json`. Fetching from ArkhamDB's API or the arkham.build cache SHALL remain available as an alternative source for one pack.

#### Scenario: Re-import keeps effects

- **WHEN** the import is re-run for the core set after effects were added to a card
- **THEN** stats/text are refreshed and the effect definitions remain unchanged

#### Scenario: Import every cycle

- **WHEN** the import runs with `--all`
- **THEN** every cycle in the snapshot gets its pack folder, and a cycle whose data fails the schema is reported with the card codes at fault

### Requirement: Localization

User-visible card text, names and UI strings SHALL resolve through locale files with English as the default and fallback. Adding a locale MUST only require adding translation files; the import command SHALL produce a locale's card translations for every cycle from the snapshot's `translations/<locale>` folder, and campaign text (scenario intros, resolutions, encounter-set names) from ArkhamCards' data.

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

#### Scenario: Russian text for a later cycle

- **WHEN** the locale is Russian and Zoey Samaras' card is looked up
- **THEN** her name, traits and text are the snapshot's Russian ones

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

A local import tool SHALL build the Russian images and print texts from `inspired/CARDS_ru` (preferred) and the card images embedded in the Russian print PDFs in `inspired/Arkham_Horror_LCG` (fallback), every PDF tagged with the cycle it prints so that OCR matching is scoped to that cycle's cards. It SHALL:

- identify each image's card code by OCR of its name and text, checked against the card's type and printed stats, within the PDF's cycle;
- write a manifest that maps each code and side to its source file, with the match confidence;
- accept review overrides that pin or reject a match, so a rerun keeps the decisions;
- list unmatched and low-confidence images, with a contact sheet that shows each Russian image beside the card's English scan for review;
- output 50%-size WebP images for every matched card of every cycle, all committed.

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

#### Scenario: A Dunwich PDF

- **WHEN** the import reads "02_01_Мескатонский_музей.pdf"
- **THEN** its images are matched only against the Dunwich Legacy cycle's cards, and the Miskatonic Museum's cards get Russian images under their codes

### Requirement: Every cycle's cards as data

The content SHALL hold every cycle of the card game that the local ArkhamDB snapshot (`inspired/arkhamdb-json-data`) describes, one pack folder per cycle under `content/packs/<cycle>/`, generated by the import command and never edited by hand (hand-written behaviour stays in each pack's `cards.json`). The game SHALL load the core pack and the packs the loaded scenarios need before the first screen, and the other packs on demand (deck editing, card lookup), so the first load does not grow with the number of packs. `check:content` SHALL validate every pack and report, per cycle, the card count and the Russian text coverage.

The `nat` pack SHALL be reported complete by the coverage, and Nathaniel Cho's investigator entry true.

#### Scenario: Dunwich cards exist

- **WHEN** the content is loaded
- **THEN** `db.cards["02001"]` (Zoey Samaras) exists with her stats and text, and no Dunwich scenario appears in the campaign list

#### Scenario: First load unchanged

- **WHEN** the title screen opens
- **THEN** only the core pack and the Night of the Zealot encounter sets have been loaded; the other packs load when a deck editor or a lookup asks for them

#### Scenario: Coverage report

- **WHEN** `check:content` runs
- **THEN** it prints, for each cycle, the number of cards and how many have Russian text, and fails on any schema or reference error in any pack

#### Scenario: The nat pack is complete

- **WHEN** `npm run coverage` runs
- **THEN** `content/coverage.json` reports pack `nat` with 28 of 28 player cards working and `investigators["60101"]` true, and `docs/campaign-program.md` ticks the `nat` row

### Requirement: Campaigns imported from the campaign guides

A command SHALL generate `content/campaigns/<id>/campaign.json`, its `scenarios/*.json` and its `flow.json` from ArkhamCards' campaign guides (`inspired/ArkhamCards/assets/generated/all_campaigns.txt`) for every official campaign whose scenarios' encounter sets and cards exist in the snapshot; fan-made campaigns and scenarios with unknown sets are skipped and listed. Per scenario it SHALL take the scenario reference card, the encounter sets, the acts and agendas of the scenario's sets in stage order, the locations put into play and the starting location (from the location layout, or from the setup text by card name), the cards set aside (by name), the layout, the chaos-token modifiers per difficulty (read from the scenario reference card; a value it cannot read becomes −2 and is listed), and the resolutions with their text and the flow steps they lead to. Location connections are not in any source: neighbouring locations in the guide's layout are connected, and a scenario without a layout connects every location in play. Per campaign it SHALL take the chaos bag of each difficulty (tokens the engine does not know, such as frost, are left out and listed), the scenarios in the guide's order with their reference card codes and names (for the picker, before the scenarios load), the interludes and epilogues, the log sections with their labels, the flow (campaign setup, interludes, resolutions, side scenarios) and the packs its cards come from. Generated files carry `"generated": true`; a hand-written campaign with the same id is never overwritten. Reruns give identical files.

#### Scenario: Extracurricular Activity

- **WHEN** the import runs
- **THEN** `extracurricular-activity.json` names the reference card 02041, the Extracurricular Activity, Sorcery, The Beyond, Bishop's Thralls, Whippoorwills, Ancient Evils, Locked Doors and Agents of Yog-Sothoth sets, puts the six campus locations into play, starts at the Miskatonic Quad, and sets aside the Dormitories and the Alchemy Labs

#### Scenario: Fan-made campaigns skipped

- **WHEN** the import runs
- **THEN** no campaign is written for Alice in Wonderland, and the summary lists it as skipped

#### Scenario: Night of the Zealot kept

- **WHEN** the import runs
- **THEN** `content/campaigns/night-of-the-zealot/` is unchanged

#### Scenario: The flow and the card list

- **WHEN** the import runs
- **THEN** `the-dunwich-legacy/flow.json` holds the prologue's scenario choice, Armitage's Fate and The Survivors as interludes, and every resolution's steps, and `campaign.json` lists the eight scenario reference card codes in order
