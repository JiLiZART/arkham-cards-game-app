## MODIFIED Requirements

### Requirement: Start a campaign

The system SHALL let players start a campaign by choosing campaign, difficulty (Easy or Standard) and 1–4 investigators with decks. A new campaign MUST create an empty campaign log and begin at the campaign's first scenario.

On one device, the new-game screen makes every choice. In an online room, the lobby makes them: the host chooses campaign and difficulty, and each player chooses the investigators and decks of their own seats (see online-play). A campaign saved on a device MAY also be continued in an online room, keeping its log and investigators.

#### Scenario: New Night of the Zealot game

- **WHEN** players pick Night of the Zealot, Standard, Roland and Agnes
- **THEN** The Gathering is set up with the Standard chaos bag and both investigators

#### Scenario: New campaign from an online lobby

- **WHEN** the host picks Night of the Zealot, Standard, one player picks Roland and another picks Agnes, and the host presses Start
- **THEN** The Gathering is set up on both browsers with the Standard chaos bag, both investigators, and the same seed

#### Scenario: Saved campaign continued online

- **GIVEN** a device has a saved Night of the Zealot campaign between The Gathering and The Midnight Masks
- **WHEN** its player opens an online room on it
- **THEN** the room continues at The Midnight Masks with the same campaign log, experience and trauma
