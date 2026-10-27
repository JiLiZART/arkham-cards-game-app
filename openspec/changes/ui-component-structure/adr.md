# ADR Review Manifest

- Status: completed
- Review date: 2026-10-27

## Review Summary

ADR review completed for this change. The design introduces one durable decision: UI components own their styles in CSS Modules, one folder per component, with global CSS limited to tokens and shared primitives. It is coherent with every in-force ADR; nothing is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0015, all accepted, none superseded. Directly relevant:
  - ADR-0002 (presentation follows the animation clock): flights must land on the same places, so lookups move to data attributes.
  - ADR-0005 (one layout mode read by components): kept; modules reach `.game.phone` with `:global(...)` and add no breakpoints.
  - ADR-0010 (dev-only tooling behind the DEV flag): `dev/` stays a separate area.

## New Durable ADRs Created

- [ADR-0016: UI components own their styles in CSS Modules, one folder per component; global CSS is tokens and shared primitives only](../../../adr/0016-ui-components-own-their-styles-in-css-modules.md)
