## ADDED Requirements

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
