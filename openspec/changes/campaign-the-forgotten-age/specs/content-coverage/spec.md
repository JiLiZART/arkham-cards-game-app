## ADDED Requirements

### Requirement: The Forgotten Age is complete

`content/coverage.json` SHALL report `the-forgotten-age` and each of its 10 scenarios complete (every card working, tokens real, a scenario script), and `docs/campaign-program.md` the rows tfa, tof, tbb, hote, tcoa, tdoy and sha with 0 encounter cards left. A scenario reached only from the epilogue (Turn Back Time) SHALL count in the campaign's scenarios.

#### Scenario: The campaign complete

- **WHEN** `pnpm coverage` runs
- **THEN** `campaigns["the-forgotten-age"].complete` is true, none of its scenarios is `unscripted`, and `scenarios["turn-back-time"]` is listed under it
