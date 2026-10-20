# ADR Review Manifest

- Status: completed
- Review date: 2026-10-20

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0005 one layout mode read by components: kept; the column is the desktop's rule in `styles.css`, the camera insets stay keyed by the mode, the phone keeps its own column, and the dock height is a measured value read by CSS, not a media query.
- ADR-0004 viewing is view state, deciding is game state: kept; which card's buttons show follows the view's hover (and focus), the options themselves come from the pending choice.
- ADR-0002 presentation follows the animation clock: unaffected; the buttons stay hidden while an event animates.
- ADR-0001, 0003, 0006 to 0013: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. The strip's place and its buttons' reveal are layout choices within ADR-0004 and ADR-0005.
