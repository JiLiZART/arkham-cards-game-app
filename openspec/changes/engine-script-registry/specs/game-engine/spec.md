## ADDED Requirements

### Requirement: Scripts are found and called through one registry

The engine SHALL find card and scenario scripts through one registry module, the only engine code that reads the loaded scripts; every other engine module, the UI and the replay tools SHALL go through it, and only the content loader, which fills the scripts, and tests MAY read them directly. A script function or a script condition named by a card's data SHALL be the card's own when its script has one, else the current scenario's, by one rule in the registry. Every hook the engine fires SHALL be named in one typed list with its own signature, so that a script defining a hook under a name that isn't in the list, or with the wrong signature, SHALL fail the typecheck. A hook that gives the engine a result (where an enemy spawns instead, how much horror is left to heal) SHALL return it rather than change its argument. Script functions and hooks SHALL be called only through the engine's script adapter. Replaying a recorded game SHALL give the same state and event log as before the registry.

#### Scenario: A misspelt hook

- **WHEN** a scenario script defines `hooks.checkObjective` instead of `hooks.checkObjectives`
- **THEN** `pnpm typecheck` fails

#### Scenario: The scenario's function as fallback

- **GIVEN** a card whose data runs the script function `ritual` that its own script doesn't define, during a scenario whose script does
- **WHEN** the effect resolves
- **THEN** the scenario's `ritual` runs

#### Scenario: A condition by the same rule

- **GIVEN** a card condition naming a script condition that only the scenario's script defines
- **WHEN** the condition is checked for the card
- **THEN** the scenario's condition decides it

#### Scenario: A hook returns its result

- **GIVEN** The Midnight Masks, whose script sends the Ghoul Priest to Your House
- **WHEN** the Ghoul Priest spawns with no location of its own
- **THEN** the script's `spawnRedirect` returns Your House and the Ghoul Priest spawns there

#### Scenario: Reading the scripts around the registry

- **WHEN** an engine module reads `game.db.scripts[code]` directly
- **THEN** the boundary test fails, naming the module

#### Scenario: Nothing changes

- **WHEN** the recorded corpus is replayed after every lookup moves to the registry
- **THEN** every recording reaches its stored final state and event log, and the list of scripts no recording runs is unchanged
