## MODIFIED Requirements

### Requirement: Card record format

Each card SHALL be identified by its ArkhamDB code and SHALL carry the fields needed by the rules: type, faction(s), cost, skill icons, traits, slots, health/sanity, uses, XP level, deck limit, text, and type-specific stats (enemy fight/health/evade/damage/horror/keywords, location shroud/clues/connections, act/agenda thresholds, treachery keywords), plus image reference and encounter set.

A player card with the Seal keyword SHALL carry `{ seal: <token kind or kinds> }` in its keywords, written by the importer from the printed "Seal (…)" line; a card that seals or releases through an ability SHALL say so with the seal and release ops; an enemy's prey SHALL accept "most sealed tokens of a kind". A campaign's chaos bags and its flow's token steps SHALL accept bless and curse.

#### Scenario: Enemy record

- **WHEN** the Ghoul Priest record is loaded
- **THEN** it exposes fight, health (per investigator), evade, damage, horror, keywords Hunter and Retaliate, and victory 2

#### Scenario: A seal keyword

- **WHEN** Protective Incantation (04031, "Seal (curse)") is imported
- **THEN** its keywords hold `{ seal: "curse" }` and the coverage counts the line as working

#### Scenario: Bless in a campaign bag

- **WHEN** a campaign's `chaosBags.standard` lists two bless tokens
- **THEN** the content check accepts it and the scenario starts with those two in the bag and 8 in the pool
