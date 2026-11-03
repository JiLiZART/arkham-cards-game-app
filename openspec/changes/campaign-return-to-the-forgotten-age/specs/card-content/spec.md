## ADDED Requirements

### Requirement: Every Return to The Forgotten Age encounter card works

Every card the 10 Return scenarios use beyond the base campaign's SHALL have its behaviour: the 67 encounter cards of the rttfa pack (the 4 replacement sets Cult of Pnakotus, Doomed Expedition, Temporal Hunters and Venomous Hate, Return to the Rainforest, and the 10 Return scenario sets), in data in `content/packs/return/cards.json` or in `content/packs/return/scripts/<code>.ts`, including Veda Whitsley (53037). Each new location SHALL carry its connection symbol and the symbols it connects to. The vocabulary SHALL express what they add: an exploration deck of one location per symbol out of two with the rest removed; an evade whose cost is crossing off a supply (53047 Feathered Serpent); an explore as a reaction to a successful investigate, fight or evade (53039, 53043); an explore paid with 10 or more resources or 4 matching skill icons (53040–53042); a treachery attached to a location that is worth vengeance (53074 Resentful Wilds); doom divided evenly among cards (53073); copies of an enemy drawn from the victory display (53078 Vengeful Serpent); a location that blocks healing (Coyoacán 53044).

#### Scenario: Feathered Serpent evaded with a supply

- **GIVEN** Ursula engaged with the Feathered Serpent and holding a rope
- **WHEN** she uses its evade with the supply
- **THEN** her rope is crossed off and the Serpent is exhausted with no test

#### Scenario: Resentful Wilds counts

- **GIVEN** Resentful Wilds attached to Path of Thorns
- **WHEN** the scenario ends with Path of Thorns revealed and clue-less
- **THEN** the vengeance in the victory display includes Resentful Wilds' 1

#### Scenario: Vengeful Serpent

- **GIVEN** one Vengeful Serpent in the victory display
- **WHEN** another is drawn
- **THEN** the one in the victory display is drawn too, as its text says, and both count as vengeance cards with 0 points
