## MODIFIED Requirements

### Requirement: Damage, horror and defeat
The engine SHALL assign damage and horror to investigators and their assets with health/sanity (player chooses assignment), defeat an investigator whose damage ≥ health or horror ≥ sanity, record physical/mental trauma, and remove the investigator from the scenario. If all investigators are defeated or resign the scenario MUST end with the matching resolution.

When an enemy attack deals damage or horror to an investigator, the engine SHALL open a reaction window for that investigator before any point is assigned, naming the attacking enemy and how much damage and horror were dealt. An effect SHALL be able to prevent part of what was dealt: a number of points of damage, of horror, or of either (the player choosing which when both were dealt). Prevented points are not assigned to anyone; when every point is prevented, nothing is assigned.

Each option of the assignment prompt SHALL say what it does: "Assign 1 damage to <card>" (or horror), for the investigator and for each asset that can soak it, and for an asset that point would defeat, "(defeated)" after it. The labels SHALL be in the game's language.

#### Scenario: Investigator defeated
- **WHEN** Daisy (sanity 9) takes her 9th horror
- **THEN** she is defeated, her cards leave play, her clues drop at her location, and she gains 1 mental trauma

#### Scenario: Flesh Ward cancels a point
- **GIVEN** Nathaniel Cho with Flesh Ward in play, ready, with 4 charges
- **WHEN** a Ghoul Minion's attack deals him 1 damage and 1 horror
- **THEN** before anything is assigned he may use Flesh Ward; he chooses horror; Flesh Ward exhausts and keeps 3 charges; only the 1 damage is assigned

#### Scenario: Not from an attack
- **GIVEN** Flesh Ward in play, ready
- **WHEN** a treachery's revelation deals Nathaniel 1 horror
- **THEN** no window for Flesh Ward opens and the horror is assigned as usual

#### Scenario: Soaking says it defeats the asset
- **GIVEN** Flesh Ward in play (health 1) and an enemy attack dealing 1 damage that Flesh Ward did not prevent
- **WHEN** the assignment prompt asks who takes the damage
- **THEN** the options read "Assign 1 damage to Nathaniel Cho" and "Assign 1 damage to Flesh Ward (defeated)"
