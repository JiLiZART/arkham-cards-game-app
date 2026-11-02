## ADDED Requirements

### Requirement: Engine tests drive games through the scenario driver

Engine tests SHALL start, advance and play games through the scenario driver in `src/engine/kits/` (starting at the first turn, rigging the chaos bag, answering neutrally until the turn prompt or a reaction window, and taking an action by intent) and SHALL assert on what a player or the UI can see: the pending prompt (its kind, investigator and options), the event log, and the core's lookups. A test MUST NOT read or write the step stack (`queue`, `pending.step`) or assign the skill test's state; only the driver, `mutate` and the step stack's own tests under `src/engine/steps/__tests__/` may. A check in the boundary test SHALL list the engine test files that still do, and SHALL fail when a file not on the list does.

#### Scenario: Waiting for a reaction window

- **GIVEN** a game where Roland is about to defeat a Ghoul Minion with a reaction card in hand
- **WHEN** the test calls `untilWindow(r, "enemyDefeated")`
- **THEN** the pending prompt offers the reaction, and the test never reads `pending.step`

#### Scenario: Rigging the chaos bag

- **WHEN** a test starts a game with `bag: ["skull"]`
- **THEN** every token revealed is a skull, and the test needs no `as never` cast

#### Scenario: Reading the result of a skill test

- **WHEN** Roland investigates the Study and the test ends
- **THEN** `lastTest(r)` gives its skill, difficulty and whether it succeeded, read from the event log

#### Scenario: A new test reaching into the queue

- **WHEN** a test file not on the boundary test's list asserts on `game.s.queue.at(-1)`
- **THEN** `pnpm test` fails, naming the file

#### Scenario: The list only shrinks

- **WHEN** a file on the list no longer names the step stack
- **THEN** the boundary test fails until the file is taken off the list
