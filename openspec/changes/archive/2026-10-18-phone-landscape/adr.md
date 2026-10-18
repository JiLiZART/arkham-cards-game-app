# ADR Review Manifest

- Status: completed
- Review date: 2026-10-17

## Review Summary

ADR review completed for this change. ADR-0001 to ADR-0004 were reviewed; ADR-0004 is followed (the bar's view switching is the same on the phone), the others are not affected. One durable decision is introduced: layout adapts through one layout mode that components read, binding every later HUD change.

## In-Force ADRs Reviewed

- `adr/0001-cc0-audio-assets-with-provenance-manifest.md` (not affected)
- `adr/0002-presentation-follows-the-animation-clock.md` (not affected)
- `adr/0003-icons-ship-as-a-generated-svg-sprite.md` (not affected)
- `adr/0004-viewing-is-view-state-deciding-is-game-state.md` (followed)

## New Durable ADRs Created

- `adr/0005-one-layout-mode-read-by-components.md`: one `useLayoutMode()` and one root class; geometry functions keyed by the mode; no per-component media queries.
