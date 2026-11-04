## MODIFIED Requirements

### Requirement: Card record format

Each card SHALL be identified by its ArkhamDB code and SHALL carry the fields needed by the rules: type, faction(s), cost, skill icons, traits, slots, health/sanity, uses, XP level, deck limit, text, and type-specific stats (enemy fight/health/evade/damage/horror/keywords, location shroud/clues/connections, act/agenda thresholds, treachery keywords), plus image reference and encounter set.

An enemy's `spawn` SHALL be a spawn expression (a location name, a trait, empty, nearest or farthest to the drawer or to a card, connected to the drawer, unrevealed if able, or a choice among these) and its `prey` SHALL accept "nearest to a card matching a filter". A `story` card SHALL carry what happens after it is resolved (flip back, remove, stay). An asset SHALL be able to carry the `vehicle` keyword. A card whose code ends in `b` SHALL be the other face of the card without the `b`, never a card of its own in a deck or pile. A location SHALL be able to carry abilities triggered after it is revealed and a card a `wouldBeDefeated` replacement ability.

#### Scenario: Enemy record

- **WHEN** the Ghoul Priest record is loaded
- **THEN** it exposes fight, health (per investigator), evade, damage, horror, keywords Hunter and Retaliate, and victory 2

#### Scenario: A spawn expression

- **WHEN** Waterfront Civilian (13027) is loaded with `spawn: { trait: "Arkham", empty: true }`
- **THEN** the content check accepts it and `implemented.ts` counts its spawn line as resolved

#### Scenario: A b face

- **WHEN** the content holds 03065 and 03065b
- **THEN** the loader exposes 03065b as the second face of 03065, and a scenario listing the set with both codes creates one card
