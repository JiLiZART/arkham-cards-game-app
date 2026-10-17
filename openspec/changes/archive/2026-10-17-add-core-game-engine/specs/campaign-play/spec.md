## Purpose

Runs a campaign as a sequence of scenarios defined in data: scenario setup, resolutions, campaign log, experience and trauma between scenarios, starting with Night of the Zealot.

## ADDED Requirements

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
