# ADR Review Manifest

- Status: completed
- Review date: 2026-10-17

## Review Summary

ADR review completed for this change. ADR-0001 to ADR-0005 were reviewed; ADR-0003's icon-coverage check gains the new cycles' encounter sets (it is followed), the others are not affected. One durable decision is introduced: card data and card text come from the vendored ArkhamDB JSON snapshot.

## In-Force ADRs Reviewed

- `adr/0001-cc0-audio-assets-with-provenance-manifest.md` (not affected)
- `adr/0002-presentation-follows-the-animation-clock.md` (not affected)
- `adr/0003-icons-ship-as-a-generated-svg-sprite.md` (followed: new encounter sets must have icons)
- `adr/0004-viewing-is-view-state-deciding-is-game-state.md` (not affected)
- `adr/0005-one-layout-mode-read-by-components.md` (not affected)

## New Durable ADRs Created

- `adr/0006-card-data-and-text-from-the-vendored-arkhamdb-snapshot.md`: the local `arkhamdb-json-data` snapshot is the source for card data and card translations; the API remains for one-off refreshes; campaign text stays with ArkhamCards.
