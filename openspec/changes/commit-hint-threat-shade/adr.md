# ADR Review Manifest

- Status: completed
- Review date: 2026-10-27

## Review Summary

ADR review completed for `commit-hint-threat-shade`. The design adds a details row and an instruction wording derived from engine state already in the store, and a CSS shade inside one component's module. These are tactical UI changes within the commitments already recorded; no durable architectural decision is introduced.

## In-Force ADRs Reviewed

- ADR-0001 through ADR-0016 (none superseded). The ones the design touches:
  - ADR-0002 Presentation follows the animation clock: nothing new animates; the shade moves with the row's existing transition.
  - ADR-0004 Viewing is view state, deciding is game state: the Commit row reads the pending choice and the test from the game store; nothing is added to the view store.
  - ADR-0005 One layout mode read by components: the shade is desktop-only through the existing `.phone` root state, no new media query.
  - ADR-0016 UI components own their styles in CSS Modules: the shade lives in `PlayStrip.module.css`, the dimmed text in `HandDetails.module.css`; no cross-component class is styled.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
