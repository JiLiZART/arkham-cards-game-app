## ADDED Requirements

### Requirement: Script functions receive a resolved run

A card or scenario script function SHALL be called with the engine context and a run, and nothing else. The run SHALL carry the investigator it resolves for (the context's investigator, else the lead investigator), the step being resolved, the rest of the effect context, and its arguments typed as unknown. Reading the run's source card when the step has none SHALL throw an error naming the script and the function. Only the engine's script adapter SHALL build a run and call a script function, whether from a Script step, a chaos token's script or a scenario's setup. The run's choice verbs SHALL build the options from the cards' or investigators' names, ask the run's investigator, take a single option without asking unless told not to, and give the script the chosen value; script code after a choice verb SHALL run only once the choice is made. A script whose investigator has been eliminated SHALL resolve nothing, by the same rule that applies to data effects. No script function type SHALL use `any`. Replaying a recorded game SHALL give the same state and event log as before the run.

#### Scenario: The investigator is always set

- **GIVEN** a scenario script function queued with an empty context
- **WHEN** its Script step resolves
- **THEN** the run's investigator is the lead investigator

#### Scenario: A missing source fails where it is read

- **GIVEN** a script function that reads its run's source card
- **WHEN** it runs from a step with no source
- **THEN** the error names the script's code and the function, not a later lookup of `undefined`

#### Scenario: A choice that waits

- **GIVEN** Mind Wipe resolving with two non-Elite enemies at Roland's location
- **WHEN** its script asks Roland to choose an enemy
- **THEN** the game waits on Roland's choice and nothing after the choice in the script has run
- **AND WHEN** Roland chooses the Ghoul Minion
- **THEN** the script continues with the Ghoul Minion and blanks its text

#### Scenario: A single option is taken

- **GIVEN** Mind Wipe resolving with one non-Elite enemy at Roland's location
- **WHEN** its script asks Roland to choose an enemy
- **THEN** no choice is pending and the script continues with that enemy

#### Scenario: An eliminated investigator

- **GIVEN** a Script step for Roland queued behind an attack of opportunity that defeats him
- **WHEN** the step resolves
- **THEN** the script function is not called

#### Scenario: Arguments are not `any`

- **WHEN** a script function passes its run's arguments to a function expecting a card id without narrowing them
- **THEN** `pnpm typecheck` fails

#### Scenario: Nothing changes

- **WHEN** the recorded corpus is replayed after every script moves to the run
- **THEN** every recording reaches its stored final state and event log
