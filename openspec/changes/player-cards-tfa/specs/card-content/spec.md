## ADDED Requirements

### Requirement: The Forgotten Age cycle player cards

Every player card of the tfa, tof, tbb, hote, tcoa, tdoy, sha and rttfa packs SHALL have its behaviour, in data in the pack's `cards.json` where the vocabulary fits and in `scripts/<code>.ts` otherwise, except the story assets and relics the campaign changes write (04051, 04061, 04147, 04148, 04191, 04244, 04256, 04303, 04343, 53037). The vocabulary SHALL express: playing a card from the discard pile; an event that attaches to an asset; an extra action restricted to evading; a test difficulty equal to an enemy's evade value; an enemy placed on top of the encounter deck; a commit restriction with wild icons per card in hand; extra Ally slots; direct damage that may be assigned to assets; an evade with willpower followed by a move; cancelling a symbol token; an attack at a connecting location that ignores Aloof and Retaliate; a parley that shuffles the enemy into the encounter deck; preventing up to N damage and horror that would defeat; an automatic evade after a successful attack; the condition "drew a treachery this round"; wild icons per action taken this phase; a bonus equal to the matching icons on an asset; secrets placed among assets; a test taken from a scenario card's ability; a committed skill returned to hand; shroud lowered per revealed connecting location; an enemy's fight lowered; an attachment to an enemy; an amount of connecting locations; X from the ammo spent; X equal to the shroud; a skill bonus per damage or horror on the investigator. Seal and Researched SHALL be used as other changes define them. The weakness chains (Dark Pact, Doomed, Offer You Cannot Refuse) and Ancient Stone's identification SHALL carry across scenarios through the campaign deck and log. `content/coverage.json` SHALL report the eight packs' player cards complete and `docs/campaign-program.md` their player columns at 0 left.

#### Scenario: Improvised Weapon from the discard

- **GIVEN** Improvised Weapon in Finn's discard pile and 1 resource
- **WHEN** he plays it from the discard pile
- **THEN** he attacks with +1 combat, the card is removed from the game after, and from his hand it would cost 0 and go to the discard pile

#### Scenario: Trusted attaches

- **WHEN** Leo plays Trusted on Mitch Brown
- **THEN** Trusted is attached to Mitch Brown, whose health and sanity are 1 higher, and it leaves play when he does

#### Scenario: Marksmanship at range

- **GIVEN** an Aloof enemy at a connecting location
- **WHEN** Leo plays Marksmanship and attacks it with +2 combat
- **THEN** the attack is allowed without engaging, ignores Aloof, and the enemy does not retaliate

#### Scenario: Doomed to The Bell Tolls

- **GIVEN** Doomed in Calvin's deck, drawn and resolved in two scenarios
- **WHEN** The Bell Tolls is drawn in a later scenario
- **THEN** Calvin is killed, and the campaign log says so

#### Scenario: Codex of Ages seals the elder sign

- **WHEN** Father Mateo plays The Codex of Ages
- **THEN** an elder sign token is sealed on it and is not in the bag; discarding the Codex to resolve the sealed token returns it
