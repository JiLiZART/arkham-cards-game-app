# ADR Review Manifest

- Status: completed
- Review date: 2026-10-20

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0004 viewing is view state, deciding is game state: kept; whether the strip is shown during a test is derived from the offered options (game state) and the screen being up (view state), with no new state.
- ADR-0005 one layout mode read by components: kept; the subject's height-based size is in the desktop rules of `styles.css`, the phone's column follows the same step-aside rule, no component adds a media query.
- ADR-0002 presentation follows the animation clock: unaffected; the step-aside follows the pending options, which are already gated by the event queue.
- ADR-0001, 0003, 0006 to 0013: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. The strip's behaviour during a test is a UI rule within ADR-0004 and ADR-0005.
