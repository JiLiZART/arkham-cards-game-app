## ADDED Requirements

### Requirement: The Dunwich cycle player cards

Every player card of the dwl, tmm, tece, bota, uau, wda, litas and rtdwl packs SHALL have its behaviour, in data in the pack's `cards.json` where the vocabulary fits and in `scripts/<code>.ts` otherwise, except the neutral story assets and set-aside weaknesses the campaign changes write (02040, 02059, 02060, 02061, 02079, 02080, 02138, 02139, 02140, 02178, 02179, 02215, 02217, 02218, 02219, 02254, 51031, 51052). The vocabulary SHALL express: uses bought with X resources; a heal or a clue discovery at a connecting location; a fight or investigate with a base skill value and a move after it; assets that cannot ready; an attack that deals no damage to other investigators on a failure; moving to an investigator's location; a test taken by the healed investigator; a trigger when an enemy would spawn; losing actions from one's own card; moving an enemy; a cost in actions and a cost in doom on the card; a starting-resources modifier; a damage bonus as an amount; doubled uses; redirecting an attack's damage; an extra clue by margin; the conditions "a resign ability in play", hand size and alone at a location; commit restrictions; a heal equal to an enemy's horror; a target not engaged with you; return to hand by margin; skipping upkeep income; icons that count when committed by another investigator; prevent X and gain X; removing doom; a heal on a committed skill's success; a parley difficulty modifier; defeating an enemy outright; returning a committed skill to hand. Exile, Researched, `discardDeckTop` and `loseActions` SHALL be used as other changes define them. `content/coverage.json` SHALL report the eight packs' player cards complete and `docs/campaign-program.md` their player columns at 0 left.

#### Scenario: Duke's investigate

- **GIVEN** "Ashcan" Pete with Duke ready at a location with 2 clues and a connecting location with 1
- **WHEN** he uses Duke to investigate and chooses the connecting location
- **THEN** he moves there, the test uses intellect 4, Duke exhausts, and a success discovers 1 clue there

#### Scenario: Blackjack misses

- **GIVEN** Zoey attacking with Blackjack an enemy engaged with Rex
- **WHEN** the test fails
- **THEN** Rex takes no damage

#### Scenario: Rite of Seeking ends the turn

- **WHEN** Rex investigates with Rite of Seeking and reveals a cultist
- **THEN** after the test he loses his remaining actions and his turn ends

#### Scenario: Fire Extinguisher is exiled

- **WHEN** Fire Extinguisher's second ability is used
- **THEN** every enemy at the location is evaded, the card is exiled, and it is not in the deck at the next scenario

#### Scenario: Acidic Ichor after Researched

- **GIVEN** a log that records the solution was identified and Strange Solution: Acidic Ichor in the deck
- **WHEN** its fight is used
- **THEN** the test uses combat 6 and deals 3 damage, and a deck without the log entry cannot buy the card

#### Scenario: Coverage

- **WHEN** `pnpm coverage` runs
- **THEN** packs dwl, tmm, tece, bota, uau, wda, litas and rtdwl report every player card working, the 18 story assets counted under their campaign changes
