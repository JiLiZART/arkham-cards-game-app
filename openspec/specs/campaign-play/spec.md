# campaign-play Specification

## Purpose
Runs a campaign as a sequence of scenarios defined in data: scenario setup, resolutions, campaign log, experience and trauma between scenarios, starting with Night of the Zealot.

## Requirements

### Requirement: Start a campaign
The system SHALL let players start a campaign by choosing campaign, difficulty (Easy or Standard) and 1–4 investigators with decks. A new campaign MUST create an empty campaign log and begin at the campaign's first scenario.

#### Scenario: New Night of the Zealot game
- **WHEN** players pick Night of the Zealot, Standard, Roland and Agnes
- **THEN** The Gathering is set up with the Standard chaos bag and both investigators

### Requirement: Data-defined scenario setup
Each scenario SHALL define in data: encounter sets, set-aside cards, starting locations in play, starting location for investigators, act and agenda decks, chaos token effects per difficulty, and setup steps that may depend on the campaign log. The engine MUST perform setup from this data alone.

#### Scenario: The Gathering setup
- **WHEN** The Gathering starts
- **THEN** only the Study is in play, all investigators start there, and the set-aside locations and Ghoul Priest are out of the encounter deck

#### Scenario: Log-dependent setup
- **WHEN** The Midnight Masks starts and the log records "Your house has burned to the ground"
- **THEN** the Rivertown setup variant is used instead of Your House

### Requirement: Resolutions
Each scenario SHALL define its resolutions (including "no resolution was reached") in data: the story text and the flow steps that follow it (log entries to record, cards added to decks, experience bonuses, trauma, choices for the players, and the next scenario). When the scenario ends the engine MUST apply the matching resolution by running its steps through the campaign flow on the campaign screen: the text is read, each prompt answered, and the flow then reaches the next scenario or the campaign's end. A hand-written scenario may keep its resolution's effects as a plain list; they run as one `effects` step.

#### Scenario: Resolution applied
- **WHEN** The Gathering ends with Resolution 1
- **THEN** the log records the house was burned, Lita Chantler is added as an earnable card, and play proceeds to The Midnight Masks

#### Scenario: A resolution with a choice
- **WHEN** The House Always Wins ends with Resolution 2 and the players are asked who Dr. Francis Morgan joins
- **THEN** the campaign screen shows the resolution text, then the investigators as a choice, and the chosen investigator's deck gains the card

### Requirement: Experience and trauma
At the end of each scenario the system SHALL award each surviving investigator XP equal to the victory display total plus resolution bonuses, carry trauma forward (starting damage/horror next scenario), and mark investigators killed or insane when trauma reaches health/sanity.

#### Scenario: XP award
- **WHEN** the victory display holds 3 victory points and the resolution grants +2
- **THEN** each investigator gains 5 XP

### Requirement: Campaign log persistence
The campaign log, investigators' decks, XP and trauma SHALL persist locally between sessions, and the in-progress scenario state SHALL be resumable after reload.

#### Scenario: Reload mid-scenario
- **WHEN** the browser is reloaded during The Midnight Masks
- **THEN** the game resumes at the same state

### Requirement: Night of the Zealot content
The system SHALL ship Night of the Zealot (The Gathering, The Midnight Masks, The Devourer Below) with all encounter sets, scenario reference cards for Easy and Standard, and all resolutions playable end to end.

#### Scenario: Full campaign
- **WHEN** players complete all three scenarios
- **THEN** a final campaign summary with log, XP and trauma is shown

### Requirement: Deck upgrades between scenarios
Between scenarios the campaign log SHALL offer Upgrade decks for each investigator: the deck area of the deck step (Deck configuration) opens on the campaign's deck with the investigator's unspent experience above it, and adding cards costs experience by the rules: a new card costs its level (at least 1), replacing a card with a higher-level version of the same title costs the level difference, an Exceptional card costs double, and Myriad copies come together for one price. The builder SHALL show the experience left, refuse what can't be paid, and keep the deck size and rules. Saving SHALL update the campaign's deck and experience; the next scenario uses the new deck.

#### Scenario: Upgrade a card
- **GIVEN** Roland has 5 experience after The Gathering
- **WHEN** the player replaces .45 Automatic with .45 Automatic (level 2) and adds nothing else
- **THEN** 2 experience is spent, 3 remain, and The Midnight Masks starts with the new card in Roland's deck

#### Scenario: Not enough experience
- **WHEN** Roland has 1 experience and the player tries a level 3 card
- **THEN** the builder refuses and says 3 experience are needed

### Requirement: Campaign tiles
The new-game screen's campaign step SHALL be a picker: filters across the top (kind: campaigns, Return to, side scenarios; rules: complete, partly implemented; length: one scenario, two to four, five or more; a search box matching campaign and scenario names), a grid of tiles below, and a sidebar for the campaign in focus. Each tile SHALL show the first chapter's art as its preview (the first agenda of the first scenario played, a landscape card), the campaign name and the number of scenarios. The grid and the sidebar SHALL each scroll on their own, with no scroll area inside another. A tap on a tile SHALL select the campaign and open it in the sidebar; on a phone the sidebar opens over the grid. The sidebar SHALL show the campaign name, the number of scenarios, for a generated campaign the partly-implemented note, the campaign's prologue from the campaign guide in the game's language (an epigraph for most campaigns; a side scenario uses its scenario's intro) with a "More" control that shows the whole prologue when it is longer than a paragraph, and then every scenario in campaign order, numbered and named, with its first agenda and first act (the chapter's art, as the act and agenda viewer shows a scenario in play), with interludes listed by name between them. Tapping one of those cards SHALL open it at full size in a dialog, both sides, so its text can be read; the dialog closes with Close or Escape. The card codes and names SHALL be available before the campaign's scenarios are loaded, so the sidebar fills at once; its images load from the card image source.

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
