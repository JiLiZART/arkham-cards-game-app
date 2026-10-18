# ADR Review Manifest

- Status: completed
- Review date: 2026-10-18

## Review Summary

ADR review completed for this change. ADR-0001 to ADR-0006 were read; none supersedes another, so all six are in force. The change's decisions are tactical fixes inside existing commitments: the stat bar and hand count are component and asset choices; the help-window predicate narrows within ADR-0004's model without changing where viewing or deciding live; clue and resource art moving back to PNG stays inside ADR-0003's stated exception for cardboard tokens (its decision, one generated sprite for drawn icons, stands); the trailing discard step is an ordinary engine step. No decision establishes a new long-term pattern, boundary or contract, so no new ADR is recorded and none is superseded.

## In-Force ADRs Reviewed

- `adr/0001-cc0-audio-assets-with-provenance-manifest.md` (not affected)
- `adr/0002-presentation-follows-the-animation-clock.md` (not affected)
- `adr/0003-icons-ship-as-a-generated-svg-sprite.md` (clues and resources join the cardboard-token PNG exception; the decision stands)
- `adr/0004-viewing-is-view-state-deciding-is-game-state.md` (the help-window predicate narrows; viewing stays view state)
- `adr/0005-one-layout-mode-read-by-components.md` (the restored dock reads the layout mode to hide on phones)
- `adr/0006-card-data-and-text-from-the-vendored-arkhamdb-snapshot.md` (not affected)

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
