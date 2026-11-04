## MODIFIED Requirements

### Requirement: Card record format

Each card SHALL be identified by its ArkhamDB code and SHALL carry the fields needed by the rules: type, faction(s), cost, skill icons, traits, slots, health/sanity, uses, XP level, deck limit, text, and type-specific stats (enemy fight/health/evade/damage/horror/keywords, location shroud/clues/connections, act/agenda thresholds, treachery keywords), plus image reference and encounter set.

A keyword with an argument SHALL be structured data on the card: `{ patrol: <spawn expression> }`, `{ swarming: <amount> }`, `{ bonded: <code> }`; `hidden`, `relentless`, `predator: <trait>`, `veiled`, `exile` and `researched: { log }` are keywords too. The importer SHALL write them from the printed keyword line where it can parse it, and a line it cannot parse SHALL leave the card not working until `cards.json` or a script says it.

#### Scenario: Enemy record

- **WHEN** the Ghoul Priest record is loaded
- **THEN** it exposes fight, health (per investigator), evade, damage, horror, keywords Hunter and Retaliate, and victory 2

#### Scenario: A patrol target as data

- **WHEN** Factory Worker (13063, "Patrol (nearest location with no Elite enemies)") is imported
- **THEN** its keywords hold `{ patrol: { at: "nearest", to: "you", filter: { noElite: true } } }` and the coverage counts the line as working

#### Scenario: A bonded card

- **WHEN** Soothing Melody (05314) is loaded
- **THEN** it carries `bonded: "05313"`, and the catalog and the deck builder show it under Hallowed Mirror, not as a deck card
