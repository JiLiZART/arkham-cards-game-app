## ADDED Requirements

### Requirement: A scenario script composed over another's hooks

The script API SHALL offer `compose(base, extra)` for a scenario script built over another scenario's hooks (a Return-to scenario over its base): setup hooks run the base's then the extra's; objective and ending hooks ask the extra's first and fall back to the base's; every other hook runs both in base-then-extra order. The result is a hooks object the script registry accepts, and a composed script's hooks SHALL be a superset of its base's.

#### Scenario: A Return scenario's setup

- **GIVEN** a base script whose setup puts the Study in play and a composed script whose extra setup swaps the Attic for a random one of two
- **WHEN** the composed scenario starts
- **THEN** the Study is in play and one of the two Attics is set aside, the base's setup having run first

#### Scenario: Objectives asked of the extra first

- **GIVEN** a base `checkObjectives` that advances the act on 2 clues and an extra one that answers for a location the base does not know
- **WHEN** both could answer
- **THEN** the extra's answer is taken and the base's is not asked
