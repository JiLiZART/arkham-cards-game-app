## MODIFIED Requirements

### Requirement: Data-defined scenario setup

Each scenario SHALL define in data: encounter sets, set-aside cards, removed cards, starting locations in play, starting location for investigators, act and agenda decks (either may be empty), chaos token effects per difficulty, its setup cards beside its reference card (a Return-to scenario's box card), and setup steps that may depend on the campaign log. The engine MUST perform setup from this data alone. A `setAside` step SHALL set aside every copy of each listed code unless it gives a `count`; a `remove` step SHALL take every copy of each listed code out of the game. When the campaign was created with an option that replaces or adds encounter sets, gathering a scenario's sets SHALL swap each listed set for its replacement and add each listed addition, and SHALL not gather a set the scenario already lists a replacement of.

#### Scenario: The Gathering setup

- **WHEN** The Gathering starts
- **THEN** only the Study is in play, all investigators start there, and the set-aside locations and Ghoul Priest are out of the encounter deck

#### Scenario: Log-dependent setup

- **WHEN** The Midnight Masks starts and the log records "Your house has burned to the ground"
- **THEN** the Rivertown setup variant is used instead of Your House

#### Scenario: Every copy set aside

- **GIVEN** a scenario whose encounter sets hold four copies of Poisoned (04102) and whose setup sets 04102 aside
- **WHEN** the scenario starts
- **THEN** all four copies are set aside and none is in the encounter deck

#### Scenario: One copy set aside

- **GIVEN** a `setAside` step for 03326a with `count: 1` and two copies in the sets
- **WHEN** the scenario starts
- **THEN** one copy is set aside and one stays where the sets put it

#### Scenario: Removed cards

- **GIVEN** Echoes of the Past's `remove` step naming the Midnight Masks locations, acts, agenda and reference card
- **WHEN** the scenario starts
- **THEN** none of them is in the encounter deck, set aside or in play

## ADDED Requirements

### Requirement: Campaign options chosen at creation

A campaign SHALL be able to declare options (`CampaignDef.options`: an id, a label key, the encounter sets replaced by another (`replaceSets`) and the sets added (`addSets`)). The new-campaign screen SHALL show each option as a toggle, off by default. The chosen options SHALL be kept in the campaign state and its save, SHALL NOT change for the rest of the campaign, and SHALL be shown read-only between scenarios. The content check SHALL verify that every set an option names exists.

#### Scenario: An option applied

- **GIVEN** a campaign declaring an option that replaces `ancient_evils` with `resurgent_evils` and adds `return_to_the_rainforest`, created with the option on
- **WHEN** a scenario gathering Ancient Evils and the Rainforest starts
- **THEN** the encounter deck holds Resurgent Evils and Return to the Rainforest and no Ancient Evils card

#### Scenario: An option off

- **GIVEN** the same campaign created with the option off
- **WHEN** any of its scenarios starts
- **THEN** the encounter deck holds the base sets and no card of the replacement or added sets

#### Scenario: Fixed for the campaign

- **GIVEN** a campaign in progress
- **WHEN** the player looks at the campaign between scenarios
- **THEN** each option shows the value chosen at creation and cannot be changed

#### Scenario: A Return-to scenario listing the replacement already

- **GIVEN** a Return-to scenario whose sets list `resurgent_evils` and a campaign created with the option replacing `ancient_evils` by it
- **WHEN** the scenario starts
- **THEN** Resurgent Evils is gathered once
