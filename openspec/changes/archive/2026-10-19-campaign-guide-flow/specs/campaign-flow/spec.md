## ADDED Requirements

### Requirement: Campaign flow as data

A campaign SHALL define its flow (what happens before its first scenario, between its scenarios and after its last) as data in a step language the engine runs: `story` (title and text), `branch` (a condition with the steps each outcome leads to), `input` (a prompt the players answer: a choice among options each with its effects and steps, a counter, a choice of investigator, a choice of cards, a checklist), `effects` (applied without a prompt), `playScenario` (a scenario is played next; its resolution's steps continue the flow), `upgradeDecks` and `end` (the campaign's result). Conditions SHALL read the campaign log (an entry recorded or crossed out, a count against a bound, a card listed, an investigator's count), the campaign data (a scenario completed or its resolution, the difficulty, the number of investigators, an investigator's trauma or a card in a deck) and combine (`all`, `any`, `not`). Effects SHALL record and cross out entries, change counts, list cards, add and remove chaos tokens, add and remove cards in a deck, add a weakness, grant experience and trauma, set the next scenario, skip or replay a scenario, and end the campaign. A hand-written campaign writes its flow in the same language as a generated one; the engine runs both through one interpreter.

#### Scenario: Dunwich's first interlude branches on the log

- **GIVEN** Extracurricular Activity ended with Resolution 4 (the investigators were unconscious for several hours)
- **WHEN** the flow reaches Armitage's Fate
- **THEN** the story "Armitage's Fate 1" is shown, the log records that Dr. Henry Armitage was kidnapped, each investigator earns 2 bonus experience, and the players are not offered Dr. Henry Armitage's card

#### Scenario: Night of the Zealot in the same language

- **WHEN** The Gathering ends with Resolution 1
- **THEN** the hand-written flow records that the house burned, offers Lita Chantler, and names The Midnight Masks as the next scenario, with no code path different from a generated campaign's

### Requirement: Flow cursor and persistence

The campaign state SHALL hold a cursor into its flow (the step being shown or waiting for an answer, and the steps still to run) and every answer given, so that reloading the page returns to the same step with the same prompt, and the campaign's history can be read back. Advancing the flow SHALL be deterministic: the same campaign state and the same answer give the same next state, with random draws (a random basic weakness, a random choice) taken from the campaign's seeded random number generator.

#### Scenario: Reload during an interlude

- **GIVEN** the Survivors interlude is waiting for the players to choose whether to read Earl Sawyer's story
- **WHEN** the page is reloaded
- **THEN** the same prompt is shown, with the story already read still above it

#### Scenario: A save from before the flow

- **WHEN** a save made with a scenario index and a flat log is loaded
- **THEN** the flat entries become the campaign notes section, the cursor stands at the `playScenario` step of the scenario the index named, and play continues

### Requirement: Sectioned campaign log

The campaign log SHALL be kept in sections, each with a label in the game's language: entries (recorded, and crossed out while still shown), counts, per-investigator counts and card lists, as the guide prints them. The log screen SHALL show every section the campaign has, a crossed-out entry struck through, a count with its number, a card list with the cards' names. Scenario scripts and setup conditions SHALL read entries as they do today (`logHas`, `logCount`) without naming the section when it is the notes.

#### Scenario: Doubt and conviction

- **GIVEN** The Path to Carcosa after Curtain Call, where the players chose to doubt
- **WHEN** the log screen is shown
- **THEN** it shows a Doubt count of 1 and a Conviction count of 0 under their own labels

#### Scenario: A crossed-out entry

- **GIVEN** the log records "the investigators rescued Dr. Henry Armitage" and a later step crosses it out
- **WHEN** the log screen is shown
- **THEN** the entry is still shown, struck through, and a branch on it takes the "not recorded" path

### Requirement: The next scenario comes from the flow

The scenario played next SHALL be the one the flow reaches: the guide's order by default, interludes and epilogues in their places, a `next_scenario` effect redirecting it, a skipped scenario left out, a replayed scenario set up again, and a side scenario offered where the guide allows one, with its experience cost paid by each investigator on acceptance. The campaign's result (won, lost, survived) SHALL be the one the flow sets, with the engine's own ending (every investigator killed or insane) still applying.

#### Scenario: Carcosa's branching ending

- **GIVEN** Dim Carcosa ended with Resolution 3
- **WHEN** the flow runs the resolution
- **THEN** the campaign ends with the result the guide names for it, and the campaign screen shows the guide's epilogue text

#### Scenario: A side scenario for experience

- **GIVEN** The Forgotten Age between The Untamed Wilds and The Doom of Eztli, every investigator with 5 experience
- **WHEN** the players accept Carnevale of Horrors from the side scenarios offered
- **THEN** each investigator pays its cost, Carnevale of Horrors is set up next, and The Doom of Eztli follows it

### Requirement: Flow compiled from the campaign guides

The campaign import SHALL compile each official campaign's flow from ArkhamCards' guide into `content/campaigns-generated/<id>/flow.json`: the campaign's setup steps, its scenarios in order with interludes and epilogues, each resolution's steps, and the inputs, branches, conditions and effects they hold, with the English texts; the Russian texts SHALL follow through the i18n import. An input kind the game cannot offer (linked-campaign messages, partners, supplies, tarot, text entry, scarlet keys) SHALL be compiled as the guide's text with its default outcome, marked `unsupported`, and the import SHALL list every such step by campaign. The content check SHALL verify every flow: every step reachable, every `playScenario` naming a scenario of the campaign, every condition naming a section the campaign log defines, every card an existing card. A rerun gives identical files.

#### Scenario: Every official campaign compiles

- **WHEN** `npm run import:campaigns` runs
- **THEN** 22 flows are written, each campaign's interludes appear in its flow in the guide's places, and the summary lists the unsupported steps per campaign

#### Scenario: Resolution branches kept

- **WHEN** Extracurricular Activity's Resolution 4 is compiled
- **THEN** its flow records "unconscious for several hours", "Warren Rice was kidnapped", grants 1 experience, records the failed students and proceeds, in that order, with no effect dropped
