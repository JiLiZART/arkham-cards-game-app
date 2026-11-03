## ADDED Requirements

### Requirement: Partner choice at scenario setup

A scenario setup step `choosePartner` SHALL ask each investigator, in order, to choose one partner whose status is alive (or safe, or resolute) and not MIA, or none; a partner already chosen by another investigator is not offered. The chosen partner enters play under that investigator with its recorded damage and horror; when its status is resolute the Resolute copy named in the step is used instead; when the step names a group with `extraUse`, a partner of that group enters with one more use. In a bot or replay the choice is an ordinary option.

#### Scenario: Two investigators choose

- **GIVEN** nine alive partners
- **WHEN** Ice and Death I sets up with two investigators
- **THEN** the first is offered nine partners and "No partner", the second eight, and each chosen partner is in play under its chooser

#### Scenario: Resolute copy

- **GIVEN** Danforth recorded resolute
- **WHEN** an investigator chooses him in To the Forbidden Peaks
- **THEN** the Resolute Danforth (08588) enters play, not 08715

### Requirement: Camp setup and starting resources

Setup steps `startAtCamp` (the location the log names as camp) and `startingResources { count }` (a log count instead of five) SHALL exist, and a setup step MAY build a side deck from an encounter set minus the copies in investigator decks.

#### Scenario: Ice and Death II at the camp

- **GIVEN** the log records the camp as Frozen Shores (08503) with shelter 2
- **WHEN** Ice and Death II sets up from scratch
- **THEN** every investigator starts at Frozen Shores with 2 resources

### Requirement: Changes kept for the campaign

At the end of a scenario the chaos tokens a card added or removed, and the cards a card added to or removed from an investigator's deck for the campaign, SHALL be applied to the campaign's bag and decks, after the setup additions the scenario already keeps.

#### Scenario: Frost carried over

- **GIVEN** a Standard bag with one frost
- **WHEN** two cards add a frost during Ice and Death I and the scenario ends
- **THEN** the next scenario's bag holds three frost

#### Scenario: Tekeli-li leaves the deck

- **GIVEN** an investigator whose deck gained a Tekeli-li during a scenario and resolved it
- **WHEN** the scenario ends
- **THEN** the campaign deck does not hold that Tekeli-li

### Requirement: Frost in the campaign bags

The imported `edge-of-the-earth` campaign SHALL hold frost in its bags: none on Easy, one on Standard, two on Hard, three on Expert.

#### Scenario: Standard bag

- **WHEN** Edge of the Earth starts on Standard
- **THEN** Ice and Death I's bag holds one frost token
