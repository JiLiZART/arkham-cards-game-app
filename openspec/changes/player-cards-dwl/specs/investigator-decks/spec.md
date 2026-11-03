## ADDED Requirements

### Requirement: The Dunwich investigators work

Zoey Samaras (02001), Rex Murphy (02002), Jenny Barnes (02003), Jim Culver (02004) and "Ashcan" Pete (02005) SHALL have their printed abilities and elder sign effects: Zoey gains 1 resource when she engages an enemy, her elder sign +1 and +1 damage this attack; Rex discovers an extra clue when he succeeds by 2 or more while investigating, his elder sign 0 and a reroll or a choice; Jenny gains 1 extra resource at upkeep, her elder sign X equal to her resources; Jim treats skulls as 0 and may treat his elder sign as a skull; Pete starts each scenario with Duke in play and may discard a card to ready an asset. `content/coverage.json` SHALL report `investigators["02001"]` to `["02005"]` true.

#### Scenario: Jim's skull

- **GIVEN** Jim Culver on a skill test in The Miskatonic Museum on Standard
- **WHEN** a skull is revealed
- **THEN** its modifier is 0, and the scenario's skull effect still applies

#### Scenario: Pete starts with Duke

- **WHEN** a scenario starts with "Ashcan" Pete
- **THEN** Duke is in play under his control and not in his opening hand or deck

#### Scenario: Zoey's engagement

- **WHEN** an enemy engages Zoey Samaras
- **THEN** she gains 1 resource, once per enemy engagement
