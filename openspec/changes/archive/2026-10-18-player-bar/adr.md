# ADR Review Manifest

- Status: completed
- Review date: 2026-10-17

## Review Summary

ADR review completed for this change. ADR-0001, ADR-0002 and ADR-0003 were reviewed; none is affected. One durable decision is introduced: the investigator being viewed is view state while the deciding investigator stays game state, which every later change that draws a player's things must follow.

## In-Force ADRs Reviewed

- `adr/0001-cc0-audio-assets-with-provenance-manifest.md` (not affected)
- `adr/0002-presentation-follows-the-animation-clock.md` (not affected)
- `adr/0003-icons-ship-as-a-generated-svg-sprite.md` (not affected)

## New Durable ADRs Created

- `adr/0004-viewing-is-view-state-deciding-is-game-state.md`: `view.viewing` overrides whose table is shown; the engine's deciding investigator is untouched; choices are offered only on the decider's view.
