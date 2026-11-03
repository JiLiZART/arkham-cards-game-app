# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 and ADR-0050 are in force (no `Supersedes` links in `adr/`).

- ADR-0013 a card works when every printed line is accounted for: kept; the 125 cards and 6 investigators count once their abilities or scripts are in data.
- ADR-0012 completeness measured and committed: kept; `content/coverage.json` and `docs/campaign-program.md` move with the change.
- ADR-0006 card data from the snapshot: kept; behaviour in `cards.json` and scripts, generated files untouched.
- ADR-0014 player windows are engine windows: followed by the `committed` and `wouldSucceed` windows.
- ADR-0021 engine state is a JSON-plain store: kept; Time Warp adds only a choice counter and an action start mark to it.
- ADR-0018 online play replays a host-ordered move log: kept; Time Warp's rewind is resolved inside the engine's `replay`, so every peer reaches the same state from the same moves.
- ADR-0028 and ADR-0034 script registry and explicit script API: followed by the card scripts.
- ADR-0004 viewing is view state, deciding is game state: Lola's role and Time Warp's action start mark are game state.
- Others (0001–0003, 0005, 0007–0011, 0015–0020, 0022–0027, 0029–0033, 0035, 0036, 0050): unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. Time Warp reuses the existing replay-based Undo and is recorded in the design, not as an ADR; the vocabulary additions follow ADR-0013's pattern.
