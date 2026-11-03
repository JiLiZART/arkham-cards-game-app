## ADDED Requirements

### Requirement: The Dunwich Legacy is complete

`content/coverage.json` SHALL report the campaign `the-dunwich-legacy` and each of its 8 scenarios complete: every card works, every token table is real, every scenario is scripted. A token line whose modifier depends on the game state ("−X, X = …", "−1 (−3 instead if …)") SHALL count as real only when the declared `x` value is one the engine computes; a pattern match on the printed line is not enough. `docs/campaign-program.md` SHALL show the dwl, tmm, tece, bota, uau, wda and litas rows with 0 encounter cards left and their player counts unchanged.

#### Scenario: Coverage after the change

- **WHEN** `pnpm coverage` runs
- **THEN** `campaigns["the-dunwich-legacy"].complete` is true, `scenarios["essex-county-express"]` says tokens real and scripted, and the 8 Dunwich scenarios no longer appear under `unscripted`

#### Scenario: A conditional token not computed

- **GIVEN** a scenario file whose skull declares `x: "broodInPlay"` while the engine has no such value
- **WHEN** `pnpm coverage` runs
- **THEN** the scenario's tokens are reported not real
