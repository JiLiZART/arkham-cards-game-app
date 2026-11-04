## MODIFIED Requirements

### Requirement: Flow compiled from the campaign guides

The campaign import SHALL compile each official campaign's flow from ArkhamCards' guide into `content/campaigns-generated/<id>/flow.json`: the campaign's setup steps, its scenarios in order with interludes and epilogues, each scenario's setup steps, each resolution's steps, and the inputs, branches, conditions and effects they hold, with the English texts; the Russian texts SHALL follow through the i18n import. The order of play SHALL be the guide's `set_scenarios` effect when the campaign setup reaches one, else the guide's scenario list followed by the scenarios no step names; a question whose answers differ only in such an order is not asked. A step that names another resolution SHALL expand that resolution's steps in place; a resolution the guide hides SHALL not be an ending the scenario offers. A step id beginning with `$` SHALL be resolved in the campaign's shared steps (the guide's `core` scenario), then in the scenario's own. A guide-version test SHALL compile as true. An interlude or epilogue SHALL be in the flow only when the order holds it or a step sends play to it. An input kind the game cannot offer (linked-campaign messages, partners, supplies, tarot, text entry, scarlet keys) SHALL be compiled as the guide's text with its default outcome, marked `unsupported`, and the import SHALL list every such step by campaign. The content check SHALL verify every flow: every step reachable, every interlude reached, every `playScenario` naming a scenario of the campaign, every condition naming a section the campaign log defines, every card an existing card. A rerun gives identical files.

#### Scenario: Every official campaign compiles

- **WHEN** `npm run import:campaigns` runs
- **THEN** 22 flows are written, each campaign's interludes appear in its flow in the guide's places, and the summary lists the unsupported steps per campaign

#### Scenario: Resolution branches kept

- **WHEN** Extracurricular Activity's Resolution 4 is compiled
- **THEN** its flow records "unconscious for several hours", "Warren Rice was kidnapped", grants 1 experience, records the failed students and proceeds, in that order, with no effect dropped

#### Scenario: Carcosa's order

- **WHEN** The Path to Carcosa is compiled
- **THEN** `flow.order` is the prologue, Curtain Call, The Last King, Interlude I, Echoes of the Past, The Unspeakable Oath, Interlude II, A Phantom of Truth, The Pallid Mask, Black Stars Rise, Dim Carcosa and the epilogue, and no reprint question is asked

#### Scenario: A resolution that continues to another

- **WHEN** The House Always Wins is compiled
- **THEN** its `none` resolution holds Resolution 1's steps (a bone to pick, Dr. Morgan kidnapped, the cheated check, the experience), not an empty list

#### Scenario: A shared tail

- **WHEN** Written in Rock is compiled
- **THEN** each of R1 to R5 ends with Resolution 6's steps (the Prismatic Shard question, the River help check, experience, deck upgrade, Areas Surveyed, the next scenario and the advance of time), and the scenario file offers no R6 ending

#### Scenario: The day advances

- **GIVEN** a Feast of Hemlock Vale campaign that finished Written in Rock on Day 1
- **WHEN** its resolution runs
- **THEN** the hidden day count is 2, the current-day section shows Night 1, and The First Evening is the next scenario

#### Scenario: Dream-Eaters' upgrade

- **GIVEN** The Dream-Quest after Dark Side of the Moon
- **WHEN** its resolution runs
- **THEN** the players upgrade their decks

#### Scenario: Only the side scenario's own interludes

- **WHEN** Red Tide Rising is compiled
- **THEN** its flow has no interlude, and Fortune and Folly's flow holds its checkpoint, reached from Part I
