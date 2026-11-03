## ADDED Requirements

### Requirement: Every Forgotten Age encounter card works

Every card the 10 scenarios of The Forgotten Age use beyond the core set SHALL have its behaviour: the 239 encounter cards of the tfa, tof, tbb, hote, tcoa, tdoy and sha encounter sets and the 9 story assets and relics (04051, 04061, 04147, 04148, 04191, 04244, 04256, 04303, 04343), in data in `content/packs/tfa/cards.json` or in `content/packs/tfa/scripts/<code>.ts`. The vocabulary SHALL express what they add: a group effect resolved once per investigator with a choice each (04082 Low on Supplies, 04087, 04092, 04101, 04341); maximum hand size modifiers (04239, 04240, 04243, 04252); an investigator who cannot move or disengage and an enemy that cannot be defeated (04089, 04209b); a test whose difficulty drops each time it is failed (04089 Entombed); a skill bonus per vengeance in the victory display, per doom on the card, or per clue on a location (04083, 04085, 04095, 04337); a keyword gained while a condition holds (04084, 04187, 04257, 04258); an enemy that attacks each investigator at a connecting location (04086); pillar tokens as resources on Mouth of K'n-yan; an attached location face down under a relic (04321–04323). Each location SHALL carry its connection symbol and the symbols it connects to.

#### Scenario: Low on Supplies

- **GIVEN** three investigators, one with a provisions supply
- **WHEN** Low on Supplies is drawn
- **THEN** each investigator in turn either crosses off a provisions or takes its damage and horror, and the card is discarded once all three have chosen

#### Scenario: Serpent from Yoth grows with vengeance

- **GIVEN** 2 vengeance in the victory display
- **WHEN** Serpent from Yoth is in play
- **THEN** it has the keywords its text grants at 1 and 2 vengeance and not the one at 3

#### Scenario: Eztli Guardian's attack

- **GIVEN** Eztli Guardian at the Entryway, Ursula at the Entryway and Leo at a connecting Ancient Hall
- **WHEN** it attacks during the enemy phase
- **THEN** both Ursula and Leo take its damage
