## MODIFIED Requirements

### Requirement: Data-driven card effects
Card behavior SHALL be declared in data using a fixed vocabulary of triggers (e.g. on play, on reveal, after successful investigate, forced at end of round), conditions and effects (e.g. deal damage, discover clue, gain resources, draw cards, modify skill, spawn enemy, place doom, add/remove token). Cards whose behavior cannot be expressed this way SHALL be able to reference a code script keyed by card code. Unknown effect names MUST fail validation.

An ability's cost SHALL be able to take damage from its controller, as it can take horror, and a heal SHALL be able to target an Ally asset as well as an investigator: one at the controller's location, or one the controller controls, as the card prints it. A heal from among several investigators ("heal 2 damage from among investigators at your location") SHALL let the player place each point.

These cards' abilities SHALL be declared, each spending its uses as printed and discarding the card when it has none left where the card says so: Flesh Ward (cancel 1 damage or horror just dealt by an enemy attack), Clarity of Mind (level 0 and 3), Smoking Pipe, Painkillers, Strange Solution, First Aid (level 3), Healing Words (level 0 and 3), Sinha's Medical Kit, Extra Rations and Canteen.

#### Scenario: Declarative card
- **WHEN** Emergency Cache is played
- **THEN** its data-declared effect "gain 3 resources" resolves without any card-specific script

#### Scenario: Scripted card
- **WHEN** a card declares `script: true` and a script file for its code exists
- **THEN** the engine runs that script for the card's ability

#### Scenario: A cost that takes damage
- **GIVEN** Smoking Pipe in play with 3 supplies and its controller with 1 horror
- **WHEN** they use it
- **THEN** they take 1 damage as its cost, it exhausts, it has 2 supplies, and they heal 1 horror

#### Scenario: Healing an Ally
- **GIVEN** First Aid (level 3) in play and an Ally asset with 1 damage and 1 horror at its controller's location
- **WHEN** they use First Aid and choose the Ally
- **THEN** the Ally heals 1 damage and 1 horror, and First Aid has one supply fewer

#### Scenario: Out of uses
- **GIVEN** Extra Rations with 1 supply
- **WHEN** its controller spends the last supply
- **THEN** they heal 1 damage and Extra Rations is discarded

#### Scenario: Spread among investigators
- **GIVEN** Healing Words (level 3) and two investigators at the location with 1 damage each
- **WHEN** it is used
- **THEN** the player places the first point and then the second, and both heal 1 damage
