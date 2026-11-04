## ADDED Requirements

### Requirement: Return to The Dunwich Legacy content

The content SHALL hold Return to The Dunwich Legacy as a hand-written campaign under `content/campaigns/return-to-the-dunwich-legacy/` with the 8 Return scenarios in the base order. Each SHALL set up as its base scenario does and then as its Return-to setup card (51012, 51015, 51020, 51025, 51032, 51041, 51047, 51053) says, use the replacement encounter sets of the box in place of the sets they replace, play the full act and agenda decks with their Return-to versions, use its base scenario's chaos token table, run its base scenario's script extended by the box's rules, and end in the base scenario's resolutions.

#### Scenario: Return to Extracurricular Activity

- **GIVEN** Return to The House Always Wins completed first
- **WHEN** Return to Extracurricular Activity starts
- **THEN** either the Orne Library or Warren Observatory (51013) is in play, never both, the Enthralled Security Guard (51014) is at the Administration Building, and a skull on Standard reads −1 with the top 3 cards discarded on a failure, as in the base scenario

#### Scenario: Return to The House Always Wins

- **WHEN** Return to The House Always Wins starts
- **THEN** one of the two Clover Club Lounges is in play, the Clover Club Stage (51017) is set aside, and Erratic Fear is set aside where the base scenario sets Striking Fear aside

#### Scenario: Return to The Essex County Express

- **WHEN** Return to The Essex County Express starts
- **THEN** the agenda deck is 51026, 51027, 02161, 02162, 02163, 02164, the six cars come from the ten of both boxes and the engine from four, the Engineer (51031) is set aside, and The Conductor spawns at the leftmost car and moves right when its car leaves play

#### Scenario: Return to Blood on the Altar

- **WHEN** Return to Blood on the Altar starts
- **THEN** each of the six village locations is one of three copies chosen at random, one of the six is then removed, no Naomi's Crew card lies beneath a location, and Hired Gun (51040) is in play only if the log records a bone to pick

#### Scenario: Return to Undimensioned and Unseen

- **WHEN** a Brood of Yog-Sothoth is put into play
- **THEN** it is one of the four Return-to Brood (51042–51045) chosen at random among those set aside, and the base Brood (02255) are not in the game

#### Scenario: Return to Lost in Time and Space

- **GIVEN** the log records that the ritual was completed
- **WHEN** Return to Lost in Time and Space starts
- **THEN** the agenda deck is 02312, 02313, 51054, 02315, the act deck is 02316, 51055, 02318, 02319, and Realms Beyond (51057) is in play with Yog-Sothoth spawned there

### Requirement: Replacement encounter sets as a base-campaign option

A new The Dunwich Legacy campaign SHALL offer the option to use the Return to The Dunwich Legacy replacement encounter sets, through the campaign option mechanism `scenario-import-fixes` defines: chosen at creation, off by default, fixed for the campaign. With the option on, each scenario SHALL gather each replacement set in place of the set it replaces: Beyond the Threshold for The Beyond, Resurgent Evils for Ancient Evils, Erratic Fear for Striking Fear, Creeping Cold for Chilling Cold, Secret Doors for Locked Doors, and Yog-Sothoth's Emissaries for Agents of Yog-Sothoth.

#### Scenario: Option on

- **GIVEN** a The Dunwich Legacy campaign created with the replacement sets option on
- **WHEN** Extracurricular Activity starts
- **THEN** the encounter deck holds the cards of Beyond the Threshold, Resurgent Evils, Secret Doors and Yog-Sothoth's Emissaries, and none of The Beyond, Ancient Evils, Locked Doors or Agents of Yog-Sothoth

#### Scenario: Option off

- **GIVEN** a The Dunwich Legacy campaign created with the option off
- **WHEN** any of its scenarios starts
- **THEN** the encounter deck holds the base sets and no card from the six replacement sets

#### Scenario: Option fixed for the campaign

- **GIVEN** a The Dunwich Legacy campaign in progress
- **WHEN** the player looks at the campaign between scenarios
- **THEN** the option shows the value chosen at creation and can't be changed
