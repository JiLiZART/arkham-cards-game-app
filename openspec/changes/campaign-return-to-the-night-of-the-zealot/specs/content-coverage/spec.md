## ADDED Requirements

### Requirement: Return to the Night of the Zealot is complete

`content/coverage.json` SHALL report `return-to-the-night-of-the-zealot` and each of its 3 scenarios complete: every card they use works, the setup cards 50011, 50025 and 50032a counted as real scenario cards beside the base reference cards, the token effects real from the base tables, and no scenario `unscripted`. `docs/campaign-program.md` SHALL show the rtnotz row with 0 encounter cards left.

#### Scenario: The setup card beside the base card

- **WHEN** `pnpm coverage` runs on Return to The Gathering with card 01104 and setup card 50011
- **THEN** the scenario's tokens are reported real from 01104's table and 50011 counts as a working scenario card

#### Scenario: The campaign complete

- **WHEN** `pnpm coverage` runs
- **THEN** `campaigns["return-to-the-night-of-the-zealot"].complete` is true, none of its scenarios is `unscripted`, and the rtnotz encounter count left is 0
