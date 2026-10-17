# ADR-0005: Layout adapts through one layout mode that components read, not per-component media queries

- Status: accepted
- Date: 2026-10-17

## Context and Problem Statement

The table's HUD mixes CSS layout with pixel geometry computed in code (the camera's insets, the fan's card sizes and lifts, overlay placement). Supporting a phone in landscape means every one of these must agree on which layout is in force. Per-component media queries would let CSS and code disagree at a breakpoint.

## Considered Options

- One `useLayoutMode()` hook (desktop | phone) derived from viewport size and orientation, a root class per mode for CSS, and geometry functions keyed by the mode; components read the mode when they need pixels.
- Media queries in CSS plus `matchMedia` checks scattered in components.
- Separate phone components for the HUD.

## Decision Outcome

Chosen option: "one layout mode", because the camera, the fan and the overlays compute pixels and must use the same switch as the CSS; one hook and one root class keep them in step, and adding a third mode later (tablet, portrait) is one more value.

### Consequences

- Good, because a breakpoint change is one place.
- Good, because drive scripts can set the viewport and assert the mode.
- Bad, because every component that lays itself out in pixels must take the mode as input; a forgotten one is wrong on the phone.
- Bad, because the root class makes CSS specificity heavier (`.game.phone .x` everywhere).
