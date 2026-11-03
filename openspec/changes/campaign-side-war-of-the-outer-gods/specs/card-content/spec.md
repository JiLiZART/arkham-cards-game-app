## ADDED Requirements

### Requirement: The wog pack's cards

Every card of pack `wog` (86001–86055) SHALL have its behaviour: in `content/packs/side/cards.json` where the vocabulary expresses it (the locations' resource-cost moves and test-for-clue actions, the "decide" treacheries 86026 and 86039, the swarm-count treacheries 86030 and 86031, the Ancient Ones' health per investigator), and in the scenario script or a card script otherwise (the three agenda decks and their backs, act 86011's doom copying, Hub Dimension 86024, Warring on 86025, 86027, 86029, 86037, 86038/a, 86043, 86044/a, 86049/a, the wards of 86016, 86020 and 86022, the mutations of 86042–86044, Swarming on 86048–86050, Predator's Call 86028, Ravages of War 86032, While They Sleep 86033, Inescapable Maw 86036, Pocket Portal 86052, Cloak 86051, 86053–86055). "Per group" on a card SHALL read as the table (ADR-0082).

#### Scenario: Warring enemies fight

- **GIVEN** a green and a blue enemy at the same location, neither engaged
- **WHEN** the enemy phase resolves
- **THEN** each attacks the other for its printed damage and no investigator is attacked by them

#### Scenario: A ward

- **GIVEN** Ritual Site 86016 with 2 wards
- **WHEN** an investigator uses its action to remove a ward
- **THEN** the location has 1 ward and the printed effect on the green agenda resolves
