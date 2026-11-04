## ADDED Requirements

### Requirement: A scenario's setup steps run before it

A campaign flow SHALL be able to hold, per scenario (`before[<scenario id>]`), the steps the guide puts in that scenario's setup that are not the table's setup: stories, questions the players answer, branches on the log or the difficulty, and effects such as chaos tokens added or entries recorded. When the order of play reaches the scenario (by the order, a `nextScenario` or a replay), the engine SHALL run these steps before the scenario is set up, so a token they add is in the bag and an entry they record is read by the setup's `when`. The import SHALL compile them from the guide's scenario `setup` list, leaving out encounter sets, location layouts, rule reminders and the play step. The content check SHALL count them as reached and verify each names a scenario of the campaign.

#### Scenario: Essex County Express's difficulty token

- **GIVEN** a The Dunwich Legacy campaign on Hard
- **WHEN** the flow reaches The Essex County Express
- **THEN** a −4 token is added to the campaign's bag before the scenario is set up, and stays for the rest of the campaign

#### Scenario: Undimensioned and Unseen's choice

- **WHEN** the flow reaches Undimensioned and Unseen
- **THEN** the players are asked whether to calm or warn the townsfolk, the log records `calmedTownsfolk` or `warnedTownsfolk`, and the scenario is then set up

#### Scenario: A scenario without setup steps

- **WHEN** the flow reaches a scenario whose guide setup holds only the gathering, the layout and the play step
- **THEN** the scenario is set up at once with no step shown
