## ADDED Requirements

### Requirement: Return to The Dunwich Legacy is complete

A scenario whose cards include a setup card beside its reference card (a Return-to scenario: the base scenario card and the box's setup card) SHALL count the setup card as real when it prints no token lines, and its token effects SHALL be real when the reference card's are. `content/coverage.json` SHALL report `return-to-the-dunwich-legacy` and each of its 8 scenarios complete, and `docs/campaign-program.md` the rtdwl row with 0 encounter cards left.

#### Scenario: A setup card without token lines

- **WHEN** `pnpm coverage` runs on Return to Extracurricular Activity with card 02041 and setup card 51012
- **THEN** the scenario's tokens are reported real, from 02041's table, and 51012 counts as a working scenario card

#### Scenario: The campaign complete

- **WHEN** `pnpm coverage` runs
- **THEN** `campaigns["return-to-the-dunwich-legacy"].complete` is true and none of its scenarios is `unscripted`
