## MODIFIED Requirements

### Requirement: Campaign tiles

The new-game screen's campaign step SHALL be a picker: filters across the top (kind: campaigns, Return to, side scenarios; rules: complete, partly implemented, as the content's coverage reports them; length: one scenario, two to four, five or more; a search box matching campaign and scenario names), a grid of tiles below, and a sidebar for the campaign in focus. Each tile SHALL show the first chapter's art as its preview (the first agenda of the first scenario played, a landscape card), the campaign name, the number of scenarios and, for a campaign coverage does not report complete, the partly-implemented badge. The grid and the sidebar SHALL each scroll on their own, with no scroll area inside another. A tap on a tile SHALL select the campaign and open it in the sidebar; on a phone the sidebar opens over the grid. The sidebar SHALL show the campaign name, the number of scenarios, for a campaign that is not complete the partly-implemented note with how far it is ("n of m cards work") and the scenarios still without a scenario script, the campaign's prologue from the campaign guide in the game's language (an epigraph for most campaigns; a side scenario uses its scenario's intro) with a "More" control that shows the whole prologue when it is longer than a paragraph, and then every scenario in campaign order, numbered and named, with its first agenda and first act (the chapter's art, as the act and agenda viewer shows a scenario in play), with interludes listed by name between them. Tapping one of those cards SHALL open it at full size in a dialog, both sides, so its text can be read; the dialog closes with Close or Escape. The card codes and names SHALL be available before the campaign's scenarios are loaded, so the sidebar fills at once; its images load from the card image source.

#### Scenario: The Dunwich Legacy in Russian

- **WHEN** the locale is Russian and The Dunwich Legacy is tapped
- **THEN** its tile shows the art of Extracurricular Activity's first agenda and "Наследие Данвича", and the sidebar shows the Russian epigraph from "Ужас Данвича", the number 8, and the eight scenarios in order with their Russian names, each with its first agenda and act, Armitage's Fate and The Survivors named between them

#### Scenario: Read a chapter's card

- **WHEN** the player taps Extracurricular Activity's agenda in the sidebar
- **THEN** a dialog shows Quiet Halls at full size, its front and its back, and Close returns to the picker with the campaign still selected

#### Scenario: Read the whole prologue

- **WHEN** the player taps "More" in the sidebar of a campaign whose prologue is several paragraphs
- **THEN** the full prologue is shown, and the selection does not change

#### Scenario: Filter and search

- **WHEN** the player chooses "side scenarios" and types "carn"
- **THEN** only Carnevale of Horrors is in the grid, and clearing the search shows every side scenario

#### Scenario: How far a campaign is

- **WHEN** The Dunwich Legacy is tapped
- **THEN** the sidebar says how many of the cards its scenarios use work out of how many, and that its eight scenarios have no scenario script yet

### Requirement: Every official campaign can be played

The new-game screen SHALL list every campaign in the content, with Night of the Zealot first. A campaign the content's coverage does not report complete SHALL be marked on that screen as partly implemented, with a line saying that its campaign guide (interludes, choices, the log) is played but cards without written behaviour show their text and have no effect; a campaign coverage reports complete SHALL carry no such mark, whether it is hand-written or generated. Starting a campaign, and restoring a saved one, SHALL first load the card packs the campaign names; while they load the screen shows that it is loading, and a pack that fails to load is reported without leaving a half-started game. Scenarios follow the campaign's flow: the guide's order, its interludes and epilogues, its branches and the side scenarios the players accept.

#### Scenario: Start The Dunwich Legacy

- **GIVEN** the title screen in a fresh browser
- **WHEN** the player starts The Dunwich Legacy on Standard with Zoey Samaras
- **THEN** the Dunwich packs load, the prologue is read, the players choose which of Extracurricular Activity and The House Always Wins to play first, and that scenario begins with its locations, act and agenda on the table and the Dunwich Standard chaos bag

#### Scenario: Marked as partly implemented

- **WHEN** The Path to Carcosa is selected on the new-game screen
- **THEN** a note says its guide is played but its card rules are only partly implemented; a campaign coverage reports complete shows no such note

#### Scenario: Restore after reload

- **GIVEN** a Dunwich scenario in progress
- **WHEN** the page is reloaded
- **THEN** the Dunwich packs load and the game is back on the same round and choice

#### Scenario: Russian campaign text

- **WHEN** the locale is Russian and The Dunwich Legacy is chosen
- **THEN** the campaign name, the scenario intro, the interludes and the resolutions are in Russian
