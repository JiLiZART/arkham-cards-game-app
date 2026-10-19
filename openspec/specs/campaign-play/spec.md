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
Each scenario SHALL define its resolutions (including "no resolution was reached") in data: log entries to record, cards added to decks, XP bonuses, and next scenario. When the scenario ends the engine MUST apply the matching resolution.

#### Scenario: Resolution applied
- **WHEN** The Gathering ends with Resolution 1
- **THEN** the log records the house was burned, Lita Chantler is added as an earnable card, and play proceeds to The Midnight Masks

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
Each campaign on the new-game screen SHALL show its first scenario's reference card art as a preview, the campaign name, a description, the number of scenarios and, for a generated campaign, the partly-implemented note. The description SHALL be the campaign's prologue from the campaign guide in the game's language (an epigraph for most campaigns) followed by the names of its scenarios, with a "More" control that shows the whole prologue when it is longer than a paragraph; a campaign without a prologue (a side scenario) SHALL use its scenario's intro. The text SHALL be available before the campaign's scenarios are loaded.

#### Scenario: The Dunwich Legacy in Russian
- **WHEN** the locale is Russian and the new-game screen is open
- **THEN** The Dunwich Legacy's tile shows the Extracurricular Activity card art, "Наследие Данвича", the Russian epigraph from "Ужас Данвича", the names of its 8 scenarios, and the number 8

#### Scenario: Read the whole prologue
- **WHEN** the player taps "More" on the tile of a campaign whose prologue is several paragraphs
- **THEN** the full prologue is shown, and the tile is not selected by that tap

### Requirement: Every official campaign can be played
The new-game screen SHALL list every campaign in the content, with Night of the Zealot first. A campaign generated from the campaign guides SHALL be marked on that screen as partly implemented, with a line saying that cards without written behaviour show their text but have no effect. Starting a campaign, and restoring a saved one, SHALL first load the card packs the campaign names; while they load the screen shows that it is loading, and a pack that fails to load is reported without leaving a half-started game. Scenarios follow the campaign's order; a campaign whose guide lets the players choose the order uses the guide's listed order.

#### Scenario: Start The Dunwich Legacy
- **GIVEN** the title screen in a fresh browser
- **WHEN** the player starts The Dunwich Legacy on Standard with Zoey Samaras
- **THEN** the Dunwich packs load, Extracurricular Activity begins with its locations, act and agenda on the table, and the chaos bag holds the Dunwich Standard tokens

#### Scenario: Marked as partly implemented
- **WHEN** The Path to Carcosa is selected on the new-game screen
- **THEN** a note says its card rules are only partly implemented; Night of the Zealot shows no such note

#### Scenario: Restore after reload
- **GIVEN** a Dunwich scenario in progress
- **WHEN** the page is reloaded
- **THEN** the Dunwich packs load and the game is back on the same round and choice

#### Scenario: Russian campaign text
- **WHEN** the locale is Russian and The Dunwich Legacy is chosen
- **THEN** the campaign name, the scenario intro and the resolutions are in Russian
