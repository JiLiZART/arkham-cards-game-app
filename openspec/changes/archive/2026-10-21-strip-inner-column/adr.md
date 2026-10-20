# ADR Review Manifest

- Status: completed
- Review date: 2026-10-20

## Review Summary

ADR review completed for this change. All fifteen repository ADRs are in force (no `Supersedes` links exist). The design's decisions (the two right-hand columns swapped in CSS, the compact strip sliding to the edge during a test, the hover layer owning a strip card's option buttons, keyboard focus feeding the hover state, a strip-only pulse, the phone inheriting the centred buttons through the shared hover state) are tactical placements inside boundaries already set by ADR-0004 and ADR-0005.

## In-Force ADRs Reviewed

- ADR-0004 viewing is view state, deciding is game state: followed; the copy and its buttons show from the view's hover (mouse, touch peek, now keyboard focus too), the options come from the pending choice, and a button click goes through `choose`.
- ADR-0005 one layout mode read by components: followed; the swap, the strip's extent and the pulse are desktop rules in `styles.css`, the phone keeps its column and gets the buttons with no phone-specific component code, the camera insets stay keyed by the mode.
- ADR-0002 presentation follows the animation clock: unaffected; buttons hide while an event animates, as other options do.
- ADR-0001, 0003, 0006 to 0015: unaffected (audio, icons, content, campaign flow, coverage, windows, rules reference).

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
