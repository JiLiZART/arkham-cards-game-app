## ADDED Requirements

### Requirement: Fixed-setup investigator entries

An investigator definition SHALL be able to replace `deckSize` and `deckOptions` with `fixedSetup`: `start` (a location card code), `play` (card codes), `hand` (card codes), `resources` (a number). Such an investigator has no deck list, is not offered in the deck builder, and is chosen only by a scenario that names it (the prologue's four neutral investigators 05046–05049). Their cards come from the packs the campaign loads.

#### Scenario: Prologue investigator entry

- **WHEN** `content/investigators/05046.json` is loaded
- **THEN** it validates with `fixedSetup` and no deck options, and the deck builder does not list Gavriella Mizrah

#### Scenario: Scenario chooses them

- **WHEN** Disappearance at the Twilight Estate starts with 3 players
- **THEN** each player picks one of the four prologue investigators, no deck is asked for, and the campaign's own investigators are untouched
