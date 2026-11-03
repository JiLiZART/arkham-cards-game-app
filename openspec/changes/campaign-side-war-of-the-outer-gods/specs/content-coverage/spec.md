## ADDED Requirements

### Requirement: War of the Outer Gods is complete

The coverage SHALL report scenario `war-of-the-outer-gods` complete: every card of `war_of_the_outer_gods`, `children_of_paradise`, `swarm_of_assimilation` and `death_of_stars` works, its tokens are real on all four difficulties and it has a scenario script. Pack `wog` SHALL be reported with 0 encounter and 0 player cards left, and `docs/campaign-program.md` SHALL tick its row.

#### Scenario: Coverage after the change

- **WHEN** `pnpm coverage` runs
- **THEN** `content/coverage.json` reports `scenarios["war-of-the-outer-gods"].complete` true and pack `wog` with every card working
