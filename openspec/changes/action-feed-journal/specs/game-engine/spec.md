## MODIFIED Requirements

### Requirement: Event log
The engine SHALL emit an ordered log of game events (card drawn, token revealed, damage dealt, phase change, etc.) that the UI can animate. Each event SHALL carry structured data that describes it without parsing its text:
- the investigator involved (`inv`), if any;
- the card involved (`card`), if any;
- in `data`, every amount and secondary reference the description needs. Examples: `n` for resources, clues, doom, cards and heals; `damage` and `horror` for attacks and damage taken; `skill`, `tokens`, `total`, `difficulty` and `success` for tests; `by` for whoever defeated an enemy; `from` and `at` for moves and spawns.

The text stays as an English fallback. Adding data MUST NOT change game rules, the order of events, or the result of replaying a saved action log.

#### Scenario: Token reveal event
- **WHEN** a chaos token is revealed
- **THEN** an event with the token type, the investigator and the test context is appended to the log

#### Scenario: Resource gain carries its amount
- **WHEN** an effect gives Roland 3 resources
- **THEN** the "resource" event has `inv` Roland and `data.n` = 3

#### Scenario: Attack carries damage and horror
- **WHEN** a Ghoul Minion attacks Daisy for 1 damage and 1 horror
- **THEN** the "attack" event has `inv` Daisy, `card` the Ghoul Minion, and `data` with `damage: 1, horror: 1`

#### Scenario: Replays unchanged
- **WHEN** a saved action log from before this change is replayed
- **THEN** the resulting game state matches the original except for the extra event data
