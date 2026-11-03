## ADDED Requirements

### Requirement: Tarot readings in the flow

The flow SHALL have a `tarotReading` step with a mode: `chaos` (one random card per investigator, randomly upright or reversed), `balance` (one card each, the lead chooses upright or reversed for all, the others the opposite), `choice` (one of the four spreads by name) or `random` (one card, used by the prologue's fate randomizer); the step records each investigator's card and orientation in a `tarot` section of the campaign log for the next scenario. The next scenario's setup SHALL apply each recorded card's effect (resources, draws, chaos tokens, experience adjustments, or a scenario rule the card names), and the log entry is cleared when that scenario ends. A campaign without the step has no readings.

#### Scenario: Chaos reading before a scenario

- **GIVEN** Return to The Circle Undone with the tarot variant on
- **WHEN** the flow reaches the reading before The Witching Hour
- **THEN** each investigator is shown their card and orientation, the log records them, and the scenario setup applies them (The Tower reversed: that investigator starts with 2 fewer cards)

#### Scenario: Reading cleared

- **WHEN** The Witching Hour ends
- **THEN** the `tarot` section is empty, and the next reading step writes fresh entries
