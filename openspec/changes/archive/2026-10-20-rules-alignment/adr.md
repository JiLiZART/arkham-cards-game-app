# ADR Review Manifest

- Status: completed
- Review date: 2026-10-20

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0014 are in force (no `Supersedes` links in `adr/`; ADR-0013 amends ADR-0012, which stays in force).

- ADR-0014 player windows are engine windows: kept and used; advancing the act becomes an option of the player window, as the Grimoire's act rules say.
- ADR-0013 a card works when every printed line is accounted for: unaffected; no card's data changes.
- ADR-0004 viewing is view state, deciding is game state: kept; every new choice (advance the act, the helper's single commit) is a recorded pending choice.
- ADR-0006 card data from the vendored snapshot: kept; unique and victory are read from the snapshot's fields.
- ADR-0001 to 0003, 0005, 0007 to 0012: unaffected.

## New Durable ADRs Created

- `adr/0015-the-arkham-grimoire-is-the-engines-rules-reference.md`: the Grimoire is the engine's rules reference; every deliberate deviation is stated in the game-engine spec with its reason, and anything else that disagrees is a bug.
