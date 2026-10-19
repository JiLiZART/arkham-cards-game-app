## MODIFIED Requirements

### Requirement: Resolutions
Each scenario SHALL define its resolutions (including "no resolution was reached") in data: the story text and the flow steps that follow it (log entries to record, cards added to decks, experience bonuses, trauma, choices for the players, and the next scenario). When the scenario ends the engine MUST apply the matching resolution by running its steps through the campaign flow on the campaign screen: the text is read, each prompt answered, and the flow then reaches the next scenario or the campaign's end. A hand-written scenario may keep its resolution's effects as a plain list; they run as one `effects` step.

#### Scenario: Resolution applied
- **WHEN** The Gathering ends with Resolution 1
- **THEN** the log records the house was burned, Lita Chantler is added as an earnable card, and play proceeds to The Midnight Masks

#### Scenario: A resolution with a choice
- **WHEN** The House Always Wins ends with Resolution 2 and the players are asked who Dr. Francis Morgan joins
- **THEN** the campaign screen shows the resolution text, then the investigators as a choice, and the chosen investigator's deck gains the card

### Requirement: Campaign tiles
The new-game screen's campaign step SHALL be a picker: filters across the top (kind: campaigns, Return to, side scenarios; rules: complete, partly implemented; length: one scenario, two to four, five or more; a search box matching campaign and scenario names), a grid of tiles below, and a sidebar for the campaign in focus. Each tile SHALL show its first scenario's reference card art as a preview, the campaign name and the number of scenarios. A tap on a tile SHALL select the campaign and open it in the sidebar; on a phone the sidebar opens over the grid. The sidebar SHALL show the campaign name, the number of scenarios, for a generated campaign the partly-implemented note, the campaign's prologue from the campaign guide in the game's language (an epigraph for most campaigns; a side scenario uses its scenario's intro) with a "More" control that shows the whole prologue when it is longer than a paragraph, and then every scenario's reference card in campaign order, front and back, numbered and named, laid out like the act and agenda viewer, with interludes listed by name between them. The card codes and names SHALL be available before the campaign's scenarios are loaded, so the sidebar fills at once; its images load from the card image source.

#### Scenario: The Dunwich Legacy in Russian
- **WHEN** the locale is Russian and The Dunwich Legacy is tapped
- **THEN** its tile shows the Extracurricular Activity card art and "Наследие Данвича", and the sidebar shows the Russian epigraph from "Ужас Данвича", the number 8, and the eight scenario reference cards in order with their Russian names, Armitage's Fate and The Survivors named between them

#### Scenario: Read the whole prologue
- **WHEN** the player taps "More" in the sidebar of a campaign whose prologue is several paragraphs
- **THEN** the full prologue is shown, and the selection does not change

#### Scenario: Filter and search
- **WHEN** the player chooses "side scenarios" and types "carn"
- **THEN** only Carnevale of Horrors is in the grid, and clearing the search shows every side scenario

### Requirement: Every official campaign can be played
The new-game screen SHALL list every campaign in the content, with Night of the Zealot first. A campaign generated from the campaign guides SHALL be marked on that screen as partly implemented, with a line saying that its campaign guide (interludes, choices, the log) is played but cards without written behaviour show their text and have no effect. Starting a campaign, and restoring a saved one, SHALL first load the card packs the campaign names; while they load the screen shows that it is loading, and a pack that fails to load is reported without leaving a half-started game. Scenarios follow the campaign's flow: the guide's order, its interludes and epilogues, its branches and the side scenarios the players accept.

#### Scenario: Start The Dunwich Legacy
- **GIVEN** the title screen in a fresh browser
- **WHEN** the player starts The Dunwich Legacy on Standard with Zoey Samaras
- **THEN** the Dunwich packs load, the prologue is read, the players choose which of Extracurricular Activity and The House Always Wins to play first, and that scenario begins with its locations, act and agenda on the table and the Dunwich Standard chaos bag

#### Scenario: Marked as partly implemented
- **WHEN** The Path to Carcosa is selected on the new-game screen
- **THEN** a note says its guide is played but its card rules are only partly implemented; Night of the Zealot shows no such note

#### Scenario: Restore after reload
- **GIVEN** a Dunwich scenario in progress
- **WHEN** the page is reloaded
- **THEN** the Dunwich packs load and the game is back on the same round and choice

#### Scenario: Russian campaign text
- **WHEN** the locale is Russian and The Dunwich Legacy is chosen
- **THEN** the campaign name, the scenario intro, the interludes and the resolutions are in Russian
