## ADDED Requirements

### Requirement: Return to The Forgotten Age is complete

`content/coverage.json` SHALL report `return-to-the-forgotten-age` and each of its 10 scenarios complete, Return to The Depths of Yoth among them, each setup card counted as real with no token lines and the tokens real from the base card's table, and `docs/campaign-program.md` the rttfa row with 0 encounter cards left.

#### Scenario: The campaign complete

- **WHEN** `pnpm coverage` runs
- **THEN** `campaigns["return-to-the-forgotten-age"].complete` is true, `scenarios["return-to-the-depths-of-yoth"]` is listed under it, and none of its scenarios is `unscripted`
