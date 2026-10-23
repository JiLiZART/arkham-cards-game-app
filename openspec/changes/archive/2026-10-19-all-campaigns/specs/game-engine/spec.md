## ADDED Requirements

### Requirement: Final act or agenda ends the scenario

When the last act of the act deck advances, or the last agenda of the agenda deck advances, and no card or scenario script has already ended the game, the scenario SHALL end with the resolution named on that card's back ("→R2" gives R2) when the scenario has it; otherwise the last act gives the scenario's first numbered resolution and the last agenda gives no resolution. Scripted endings keep working as before.

#### Scenario: Unscripted last act

- **GIVEN** a generated scenario on its last act, whose back reads "(→R1)"
- **WHEN** the investigators advance it
- **THEN** the scenario ends with Resolution 1

#### Scenario: Unscripted last agenda

- **GIVEN** a generated scenario whose last agenda's back names no resolution
- **WHEN** doom advances it
- **THEN** the scenario ends with no resolution

#### Scenario: Scripted ending unchanged

- **WHEN** The Gathering's last act advances
- **THEN** its script's resolution is used, as before
