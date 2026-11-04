## ADDED Requirements

### Requirement: Return to The Path to Carcosa is complete

Each Return scenario SHALL list its box's setup card in `setupCards` beside the base reference card, so the setup card counts as real with no token lines as `scenario-import-fixes` defines, and its token effects SHALL be real when the base card's are; a content check SHALL fail when a Return scenario's token table differs from its base scenario's. `content/coverage.json` SHALL report `return-to-the-path-to-carcosa` and each of its 8 scenarios complete, and `docs/campaign-program.md` the rtptc row with 0 encounter cards left.

#### Scenario: A setup card without token lines

- **WHEN** `pnpm coverage` runs on Return to Curtain Call with card 03043 and setup card 52014
- **THEN** the scenario's tokens are reported real, from 03043's table, and 52014 counts as a working scenario card

#### Scenario: A drifted token table

- **GIVEN** Return to The Last King's Standard skull differs from The Last King's
- **WHEN** `pnpm check:content` runs
- **THEN** it fails naming the scenario and the difficulty

#### Scenario: The campaign complete

- **WHEN** `pnpm coverage` runs
- **THEN** `campaigns["return-to-the-path-to-carcosa"].complete` is true and none of its scenarios is `unscripted`
