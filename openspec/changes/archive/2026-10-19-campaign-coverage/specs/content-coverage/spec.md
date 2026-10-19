## ADDED Requirements

### Requirement: Coverage of packs and campaigns
The content SHALL report, for every card pack, its encounter cards and its player cards (assets, events, skills) and how many of each work in the game, a card working when its behaviour is written (abilities in data or a card script) or its text holds nothing for the engine to run (no text, keywords the engine acts on, a spawn instruction it reads). For every campaign it SHALL report the cards its scenarios use (their encounter sets, side decks, acts and agendas), how many of them work, the ones that don't by card type, and which of its scenarios have a scenario script. A campaign SHALL be complete when every card its scenarios use works and every scenario has a scenario script; a pack SHALL be complete when every one of its cards works.

#### Scenario: Night of the Zealot
- **GIVEN** the content as it is today
- **WHEN** the coverage is computed
- **THEN** Night of the Zealot reports its three scenarios as scripted and lists the cards its scenarios use that still have no behaviour, and is complete only once that list is empty

#### Scenario: The Dunwich Legacy
- **WHEN** the coverage is computed
- **THEN** The Dunwich Legacy reports how many of the cards its eight scenarios use work, the rest counted by type (locations, enemies, treacheries, acts, agendas), and none of its scenarios as scripted

#### Scenario: A pack
- **WHEN** the coverage is computed
- **THEN** the Dunwich deluxe pack reports its encounter cards and its player cards separately, with how many of each work

### Requirement: Committed coverage file
`npm run coverage` SHALL write the report to `content/coverage.json`, sorted so that a rerun on unchanged content gives an identical file, and the file SHALL be committed. The new-game screen SHALL read it with the first download, before any pack is loaded. `npm run check:content` SHALL fail with a message naming the command when the committed file differs from the report computed from the content.

#### Scenario: Behind the content
- **GIVEN** a card's behaviour was written in a pack's `cards.json`
- **WHEN** `check:content` runs before `npm run coverage`
- **THEN** it fails saying the coverage file is behind the content (npm run coverage)

#### Scenario: Read before the packs load
- **WHEN** the new-game screen opens in a fresh browser
- **THEN** every campaign's completeness is known without loading any card pack

### Requirement: The program of per-pack changes
`docs/campaign-program.md` SHALL list every pack the generated campaigns and the player cards come from, in play order (each cycle's deluxe box, its mythos packs, its Return-to box; then the campaign boxes with their investigator boxes; the side scenarios; the investigator starter decks), with the campaign it belongs to, its encounter and player card counts, and the steps a pack's change takes: the engine features its cards need; its encounter and player cards; its scenario script; the real chaos token effects of its scenario; its location connections checked against the printed guide; a bot playthrough reaching a resolution; and for a campaign's last pack, the move of the campaign from `content/campaigns-generated/` to `content/campaigns/`. A pack change SHALL be done when coverage reports the pack (and, for its last pack, the campaign) complete.

#### Scenario: The plan names every pack
- **WHEN** the program document is compared with the packs in the content
- **THEN** every pack with encounter or player cards that don't work appears in it once, with its campaign

### Requirement: One shape for hand-written and generated campaigns
A hand-written campaign's `campaign.json` SHALL carry the same fields a generated one does: the card packs it uses (`packs`), its first scenario's reference card (`card`), its cover, and the chapters (`cards`, each scenario with its reference card, first agenda and first act, the interludes marked). The picker SHALL read the chapters from the file for every campaign, with no list built at run time.

#### Scenario: Night of the Zealot's chapters
- **WHEN** the new-game screen shows Night of the Zealot in the sidebar
- **THEN** its three chapters come from its campaign file, each with its reference card, agenda and act
