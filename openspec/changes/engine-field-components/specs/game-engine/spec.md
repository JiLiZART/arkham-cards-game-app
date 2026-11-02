## MODIFIED Requirements

### Requirement: Entities, component tables and piles

The game state SHALL hold its cards and investigators in a store: the entities in creation order, one table per component, and every pile in one map keyed by the pile's name (`deck:<investigator>`, `hand:<investigator>`, `discard:<investigator>`, `encounterDeck`, `encounterDiscard`, `actDeck`, `agendaDeck`, `sideDeck:<name>`). A card's identity (its id and card code) SHALL sit in the `card` table, and each of its other fields (owner, controller, zone, exhausted, revealed, damage, horror, clues, doom, uses, resources, location, engaged investigator, attached card) in a table of its own keyed by the card's id. An investigator's record SHALL sit in the `investigator` table, keyed by the investigator's code. Facts the scenario keeps about one card, one investigator, or an enemy and an investigator (an enemy that doesn't ready, a surging treachery, an asset leaving play, a cost change, the card beneath a location, set-aside weaknesses, experience earned, Joe Diamond's hunch deck, the round an enemy last attacked or can't attack) SHALL each sit in a table of their own, keyed by that entity. A field table SHALL hold an entry only when the value differs from its default (0, false or none); a card's zone SHALL always have one. A card SHALL sit in at most one pile, the one its zone and owner name, and moving it SHALL take it out of that pile alone. The store SHALL stay plain JSON. Looking a card or an investigator up SHALL give a view that always shows the current values.

#### Scenario: One pile per card

- **WHEN** a card moves from Roland's hand to his discard pile
- **THEN** it is in `discard:01001`, it is no longer in `hand:01001`, and no other pile holds it

#### Scenario: A view that doesn't go stale

- **WHEN** code holds Roland's view, Roland gains 2 resources and draws a card
- **THEN** the same view shows the new resources and the card in his hand

#### Scenario: A card's view that doesn't go stale

- **WHEN** code holds the view of a Ghoul Minion and an attack deals it 2 damage
- **THEN** the same view shows 2 damage

#### Scenario: Only values that are set are stored

- **GIVEN** a Ghoul Minion with 2 damage
- **WHEN** it is healed of both
- **THEN** the damage table has no entry for it, and its view shows 0 damage

#### Scenario: A fact about an entity has its own table

- **WHEN** an effect says the Ghoul Minion doesn't ready in the next upkeep
- **THEN** the store's table for enemies that don't ready holds the Ghoul Minion, and the scenario's flags don't

#### Scenario: An old save

- **WHEN** a save written by engine version 5 or 6 is opened
- **THEN** its setup and choices are replayed into the new store and play continues from the same point
