# ADR Review Manifest

- Status: completed
- Review date: 2026-10-27

## Review Summary

ADR review completed for `tap-decks-at-once`. The design keeps the engine's recorded `draw` choice and moves only who answers it (the player or the store) behind an existing setting. This applies ADR-0014 rather than extending it; no new durable architectural decision is introduced.

## In-Force ADRs Reviewed

- ADR-0001 through ADR-0016 (none superseded). The ones the design touches:
  - ADR-0002 Presentation follows the animation clock: the automatic answer lets the engine run ahead of the screen; its events queue behind the ones already waiting, including a card held in the showcase.
  - ADR-0004 Viewing is view state, deciding is game state: the draw stays a game-state choice; the setting is UI state that decides who answers it.
  - ADR-0014 Player windows are engine windows: the wait before a draw remains an engine window and a recorded choice; the UI answering it at once is the same as the phase pause's countdown answering the pause.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
