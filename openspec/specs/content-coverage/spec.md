# content-coverage Specification

## Purpose

TBD - created by archiving change campaign-coverage. Update Purpose after archive.

## Requirements

### Requirement: Coverage of packs and campaigns

The content SHALL report, for every card pack, its encounter cards and its player cards (assets, events, skills, weaknesses) and how many of each work in the game. A card SHALL work when every line of its printed text is accounted for: by its abilities in data or a card script, or by a field the engine acts on for that kind of line (a `Prey -` line by `prey`, an "investigated using [skill] instead" line by `investigateSkill`, a `Uses (n …)` line by `uses`, a "Max n committed per skill test" line by `maxCommitted`, a `Spawn -` line by the spawn the engine reads, a line of keywords by keywords the engine acts on), or by having no text at all. A line with nothing behind it SHALL leave the card not working, whatever other lines are covered. A scenario reference card SHALL work when every symbol token line on its front (Easy and Standard) and its back (Hard and Expert) is covered by that difficulty's token entry for that token: the modifier for a bare modifier, `x` for "-X", an `onFail` effect for "If you fail", an `onReveal` effect or a condition for an effect on reveal, a reveal-another rule for "reveal another token", and the token entries for all four difficulties SHALL be written. A reference card that several scenarios play with (a Return-to scenario uses its base scenario\'s card) SHALL work, in a pack\'s and the catalog\'s count, only when it is real for each of them; a scenario, and the campaign it belongs to, SHALL be judged by that scenario\'s own token entries. For every campaign it SHALL report the cards its scenarios use (their encounter sets, side decks, acts, agendas and reference cards), how many of them work, the ones that don't by card type, and which of its scenarios have a scenario script. A campaign SHALL be complete when every one of its scenarios is complete; a pack SHALL be complete when every one of its cards works.

#### Scenario: Night of the Zealot

- **GIVEN** the content once this change is in
- **WHEN** the coverage is computed
- **THEN** Night of the Zealot reports every card its scenarios use as working, its three reference cards included, and is complete

#### Scenario: Behaviour in data counts

- **GIVEN** the Ghoul Priest, whose text is "Prey - Highest [combat]." and "Hunter. Retaliate.", with `prey` set to highest combat
- **WHEN** the coverage is computed
- **THEN** the Ghoul Priest works

#### Scenario: A line with nothing behind it

- **GIVEN** an enemy with `prey` set whose text also has a Forced ability that is neither in its abilities nor in a script
- **WHEN** the coverage is computed
- **THEN** the enemy does not work

#### Scenario: Placeholder tokens

- **GIVEN** a generated scenario whose token entries carry only modifiers, while its reference card says "[cultist] -1. If you fail, take 1 horror."
- **WHEN** the coverage is computed
- **THEN** its reference card does not work, and its campaign is not complete

#### Scenario: A card shared with a Return-to scenario

- **GIVEN** The Gathering with its tokens written on all four difficulties, and Return to The Gathering, which plays with the same reference card, with its token tables empty
- **WHEN** the coverage is computed
- **THEN** The Gathering and Night of the Zealot are complete, the reference card counts as not working in its pack, and Return to The Gathering is not complete

#### Scenario: A missing difficulty

- **GIVEN** a scenario with token entries for Easy and Standard only
- **WHEN** the coverage is computed
- **THEN** its reference card does not work, because the back's Hard and Expert lines are not covered

#### Scenario: The Dunwich Legacy

- **WHEN** the coverage is computed
- **THEN** The Dunwich Legacy reports how many of the cards its eight scenarios use work, the rest counted by type (locations, enemies, treacheries, acts, agendas, scenario reference cards), and none of its scenarios as scripted

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

`docs/campaign-program.md` SHALL list every pack the generated campaigns and the player cards come from, in play order (each cycle's deluxe box, its mythos packs, its Return-to box; then the campaign boxes with their investigator boxes; the side scenarios; the investigator starter decks), with the campaign it belongs to, its encounter and player card counts, and the steps a pack's change takes: the engine features its cards need; its encounter and player cards; its scenario script; the real chaos token effects of its scenario; its location connections checked against the printed guide; a bot playthrough reaching a resolution; and for a campaign's last pack, the move of the campaign from `content/campaigns-generated/` to `content/campaigns/`. A campaign box (a pack holding a whole campaign's scenarios) SHALL be listed one row per scenario, each with its counts, so that every row is a change no larger than one scenario's work. A pack change SHALL be done when coverage reports the pack (and, for its last pack, the campaign) complete; a campaign box's scenario change SHALL be done when coverage reports that scenario complete.

#### Scenario: The plan names every pack

- **WHEN** the program document is compared with the packs in the content
- **THEN** every pack with encounter or player cards that don't work appears in it once, with its campaign

#### Scenario: A campaign box by scenario

- **WHEN** the program document is compared with the scenarios of Edge of the Earth
- **THEN** every one of its scenarios that is not complete has a row of its own under the Edge of the Earth campaign box

### Requirement: One shape for hand-written and generated campaigns

A hand-written campaign's `campaign.json` SHALL carry the same fields a generated one does: the card packs it uses (`packs`), its first scenario's reference card (`card`), its cover, and the chapters (`cards`, each scenario with its reference card, first agenda and first act, the interludes marked). The picker SHALL read the chapters from the file for every campaign, with no list built at run time.

#### Scenario: Night of the Zealot's chapters

- **WHEN** the new-game screen shows Night of the Zealot in the sidebar
- **THEN** its three chapters come from its campaign file, each with its reference card, agenda and act

### Requirement: Coverage of scenarios

The content SHALL report, for every scenario, the campaign it belongs to, the cards it uses (its encounter sets, side decks, acts, agendas and reference card) and how many of them work with the rest by card type, whether its token effects are real (its reference card works), whether it has a scenario script, and whether it is complete: every card it uses works and it has a scenario script. A card of an encounter set several scenarios share SHALL count in each of them. The report SHALL be in `content/coverage.json` under `scenarios`, keyed by scenario id.

#### Scenario: The Gathering

- **WHEN** the coverage is computed
- **THEN** the report for The Gathering names Night of the Zealot, counts the cards of its encounter sets, its acts, its agendas and its reference card, says its tokens are real and that it is scripted, and is complete

#### Scenario: A generated scenario

- **WHEN** the coverage is computed
- **THEN** the report for Extracurricular Activity says its tokens are not real, that it has no scenario script, and that it is not complete

#### Scenario: A shared set

- **GIVEN** the Ancient Evils set, used by all three Night of the Zealot scenarios
- **WHEN** the coverage is computed
- **THEN** its card counts in each of the three scenario reports, and once in the campaign's
