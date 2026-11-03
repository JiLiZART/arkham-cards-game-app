## ADDED Requirements

### Requirement: Every Return to The Dunwich Legacy encounter card works

Every card the 8 Return scenarios use beyond the base campaign's SHALL have its behaviour: the 60 encounter cards of the rtdwl pack (the 6 replacement sets Beyond the Threshold, Resurgent Evils, Secret Doors, Erratic Fear, Creeping Cold and Yog-Sothoth's Emissaries, and the 8 Return scenario sets), in data in `content/packs/return/cards.json` or in `content/packs/return/scripts/<code>.ts`, including the story assets The Engineer (51031) and Naomi O'Bannion (51052). The vocabulary SHALL express what they add: an attachment to a location with the most investigators and a prohibition on leaving it (51065 Secret Door); a choice per point failed between a discard and damage (51066); a difficulty equal to the clues you hold with horror or a dropped clue per point (51070); an attachment that stays on an enemy while it is out of play (51023 Dark Bidding); a double agility test whose failure defeats (51029); an act under which a location's objectives are ignored (51055); an enemy that gains Elite (51046); a card that grants Hunter and prey to a trait (51040).

#### Scenario: A replacement set card in data

- **WHEN** Resurgent Evils (51064) is drawn
- **THEN** it resolves from its declaration in `content/packs/return/cards.json` with no script

#### Scenario: Dark Bidding follows the Hunting Horror

- **GIVEN** Dark Bidding attached to the Hunting Horror
- **WHEN** the Hunting Horror leaves play into the void and returns
- **THEN** Dark Bidding is still attached to it
