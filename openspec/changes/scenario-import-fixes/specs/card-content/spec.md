## MODIFIED Requirements

### Requirement: Campaigns imported from the campaign guides

A command SHALL generate `content/campaigns-generated/<id>/campaign.json`, its `scenarios/*.json` and its `flow.json` from ArkhamCards' campaign guides (`inspired/ArkhamCards/assets/generated/all_campaigns.txt`) for every official campaign whose scenarios' encounter sets and cards exist in the snapshot; fan-made campaigns and scenarios with unknown sets are skipped and listed. Per scenario it SHALL take the scenario reference card, the encounter sets, the acts and agendas of the scenario's sets in stage order (a scenario with agendas and no acts, or acts and no agendas, is written with the empty deck), the locations put into play and the starting location (from the location layout, or from the setup text by card name; a scenario whose setup names no location starts at the first location of its gathered sets and is listed), the cards set aside (by name), the layout, the chaos-token modifiers per difficulty (read from the scenario reference card; a value it cannot read becomes −2 and is listed), and the resolutions with their text and the flow steps they lead to. When the guide's gathering step says to take only the treachery cards of a set, the set is gathered and its other cards are listed in a `remove` setup step. A card code ending in `b` whose front (the code without `b`) is in the same pool is the back face of that card and is never placed, set aside or removed on its own. A Return-to scenario SHALL list the box's setup card (the `scenario`-type cards of its own set that are not the reference card) in `setupCards`. Location connections are not in any source: neighbouring locations in the guide's layout are connected, and a scenario without a layout connects every location in play. Per campaign it SHALL take the chaos bag of each difficulty (from the campaign's difficulty choice, else from the scenario's own; the core set's bags only when neither names one; tokens the engine does not know, such as frost, are left out and listed), the scenarios in the guide's order with their reference card codes and names (for the picker, before the scenarios load), the interludes and epilogues, the log sections with their labels, the flow (campaign setup, each scenario's setup steps, interludes, resolutions, side scenarios) and the packs its cards come from. Campaign log keys SHALL be camelCase (`house_standing` → `houseStanding`), with a per-campaign alias table for a key whose hand-written base campaign uses another word. Generated files carry `"generated": true`; a hand-written campaign with the same id is never overwritten. Reruns give identical files.

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

#### Scenario: Only the Midnight Masks treacheries

- **WHEN** Echoes of the Past is imported
- **THEN** its sets include `arkham`, its setup holds a `remove` step naming 01120, 01121a, 01121b, 01122, 01123 and 01124 to 01134, and the encounter deck at setup holds 2 False Lead and 3 Hunting Shadow and no Arkham location

#### Scenario: A side scenario's own bag

- **WHEN** Red Tide Rising is imported
- **THEN** `side-red-tide-rising/campaign.json` carries the bags of its `choose_difficulty` step, the Hard bag reading 0, 0, −1, −1, −2, −2, −3, −4, −5, −6 with its symbol tokens, not Night of the Zealot's

#### Scenario: An agenda-only scenario

- **WHEN** The Drowned City is imported
- **THEN** `sepulchre-of-the-sleeper.json` exists with card 11673, agendas 11674 onward and `acts: []`

#### Scenario: A random starting location

- **WHEN** Return to The Forgotten Age is imported
- **THEN** `return-to-the-depths-of-yoth.json` exists with card 04277 and a starting location from its gathered sets, and the import's notes list it as a random start

#### Scenario: One card, two faces

- **WHEN** The Midwinter Gala (or any scenario naming Central Lot) is imported
- **THEN** 72008 is put into play and 72008b is not a location of the scenario

#### Scenario: A Return-to setup card

- **WHEN** Return to the Night of the Zealot is imported
- **THEN** `return-to-the-gathering.json` has `card: "01104"` and `setupCards: ["50011"]`

#### Scenario: camelCase keys

- **WHEN** Return to the Night of the Zealot is imported
- **THEN** its flow records `houseStanding`, `ghoulPriestAlive`, `pastMidnight` and `cultistsGotAway`, the last through the campaign's alias table, and `content/i18n/ru/campaign-texts/return-to-the-night-of-the-zealot.json` is keyed the same way

## ADDED Requirements

### Requirement: Vengeance on cards

A card record SHALL carry its vengeance value (`vengeance`) when ArkhamDB gives one, imported like `victory`.

#### Scenario: A Forgotten Age enemy

- **WHEN** the tfa pack is imported
- **THEN** 04062 carries `vengeance: 5` and 04078 `vengeance: 1`, and a card without the field in the snapshot has none

### Requirement: The blood chaos token

`blood` SHALL be a chaos token the schema accepts in a campaign's bags, in a scenario's token tables and in flow effects that add or remove tokens. Drawn in a scenario whose table gives it no entry, it SHALL resolve as a modifier of 0 with no effect.

#### Scenario: Children of Blood's bag changes

- **WHEN** Children of Blood is imported
- **THEN** River of Blood's "add 1 blood token" step compiles to an `addChaosToken` effect with token `blood`, not to a text-only step

#### Scenario: A blood token without an entry

- **GIVEN** a bag holding a `blood` token and a scenario whose table has no `blood` entry
- **WHEN** it is revealed in a skill test
- **THEN** the test's modifier is 0 and nothing else happens
