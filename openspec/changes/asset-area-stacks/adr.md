# ADR Review Manifest

- Status: completed
- Review date: 2026-10-27

## Review Summary

ADR review completed for this change. No ADR in `adr/` carries a `Supersedes:` field, so all fifteen are in force. The design (an overlapping, fixed-size asset row laid out by one pure step function and CSS) is a tactical layout choice inside the HUD: it changes no boundary, contract, technology or pattern, and future changes are not bound by it beyond the spec's requirement.

## In-Force ADRs Reviewed

- ADR-0001 through ADR-0015 (none superseded). The ones the design touches:
  - ADR-0002 Presentation follows the animation clock: flights still read slot rects after layout; nothing new animates off the event clock.
  - ADR-0004 Viewing is view state, deciding is game state: hover and peek stay in the view store.
  - ADR-0005 One layout mode read by components: the phone/desktop split stays the `useLayoutMode()` read in `PlayStrip`; no new media query decides behaviour.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
