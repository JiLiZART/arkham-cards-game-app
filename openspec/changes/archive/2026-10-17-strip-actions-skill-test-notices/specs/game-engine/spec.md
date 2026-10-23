## MODIFIED Requirements

### Requirement: Skill tests

The engine SHALL resolve skill tests as: determine skill value and difficulty → commit cards from hand (matching icons, wild icons) → reveal a chaos token → apply token modifier and effects → compare total to difficulty (success if ≥) → apply results and committed cards' effects → discard committed cards. An auto-fail token MUST fail regardless of total; total skill MUST NOT drop below 0. The Elder Sign MUST trigger the investigator's Elder Sign ability.

While an investigator's commit window is open, the engine SHALL offer, for each card that investigator committed to this test, an option to take it back. Taking a card back SHALL return it to its owner's hand and remove its icons from the test value, and the same investigator's commit choice is asked again. Once that investigator chooses Done, their committed cards stay committed. Taking back is an ordinary recorded choice, so saved games and action-log replays stay exact. The bot MUST NOT take cards back.

#### Scenario: Investigate success

- **WHEN** Roland (intellect 3) investigates a shroud-2 location and reveals a `-1` token
- **THEN** total 2 ≥ 2, the test succeeds and Roland discovers 1 clue from the location

#### Scenario: Auto-fail

- **WHEN** the tentacle token is revealed
- **THEN** the test fails even if skill exceeds difficulty

#### Scenario: Committed icons

- **WHEN** an investigator commits a card with two matching skill icons to their own test
- **THEN** their skill value increases by 2 for that test

#### Scenario: Take a committed card back

- **WHEN** Roland commits Vicious Blow to a fight test and then takes it back before choosing Done
- **THEN** Vicious Blow is in Roland's hand again, the test value no longer counts its icon, and Roland is asked again what to commit, with Vicious Blow among the options

#### Scenario: No take-back after Done

- **WHEN** Roland commits Vicious Blow and chooses Done
- **THEN** no later choice in that test offers to take Vicious Blow back

#### Scenario: Another investigator's card

- **WHEN** Roland commits Vicious Blow to his test and chooses Done, and Daisy, at his location, is then asked to commit
- **THEN** Daisy is not offered to take back Roland's Vicious Blow
