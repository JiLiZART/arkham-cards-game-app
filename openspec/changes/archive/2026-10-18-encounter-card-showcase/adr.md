# ADR Review Manifest

- Status: completed
- Review date: 2026-10-18

## Review Summary

ADR review completed for this change. ADR-0001 to ADR-0006 were read; none supersedes another, so all six are in force. The change keeps the event player as the clock (ADR-0002): the held card is still the playing event, and the overlay is its presentation. The engine change is an event name, not a new step; no durable architectural commitment is introduced or revisited, so no new ADR is recorded.

## In-Force ADRs Reviewed

- `adr/0001-cc0-audio-assets-with-provenance-manifest.md` (not affected)
- `adr/0002-presentation-follows-the-animation-clock.md` (the hold is a held `current` event; coherent)
- `adr/0003-icons-ship-as-a-generated-svg-sprite.md` (not affected)
- `adr/0004-viewing-is-view-state-deciding-is-game-state.md` (the overlay is public; not affected)
- `adr/0005-one-layout-mode-read-by-components.md` (not affected)
- `adr/0006-card-data-and-text-from-the-vendored-arkhamdb-snapshot.md` (not affected)

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
