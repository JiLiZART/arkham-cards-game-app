# ADR-0017: On the phone layout, a details pane opens as a bottom sheet; the desktop keeps its popovers and sidebars

- Status: accepted
- Date: 2026-10-28

## Context and Problem Statement

The desktop shows details beside or over the thing they belong to: the investigator sheet is a popover anchored under the top-bar avatar, the wizard's campaign and investigator details are a sidebar next to the tiles. On a phone held sideways (393 px tall) an anchored popover runs off the bottom edge and a sidebar takes the width the tiles need. Modals already take the whole phone screen (ADR-0005's `.game.phone dialog.modal`), but a details pane is glanced at next to a choice, not a step of its own. Where does a details pane go on the phone, so every future one lands in the same place?

## Considered Options

- A shared bottom sheet: a panel from the bottom edge to about 70 % of the height over a scrim, a drag handle, Close, scrolling inside; the caller owns its open state and renders the same content it shows on the desktop.
- The full-screen modal the phone already uses for card details and menus.
- Per-pane fixes: clamp the popover to the viewport, let the sidebar collapse.

## Decision Outcome

Chosen option: "a shared bottom sheet", because it keeps the thing the details describe (the bar, the tiles) partly in view, gives one gesture to learn, and makes a component that reads `useLayoutMode()` (ADR-0005) and swaps its desktop pane for the sheet in one place. The full-screen modal hides the context and reads as a new screen. Per-pane fixes leave three behaviours to explain and the next pane to fix again.

The sheet is view state (ADR-0004): it holds nothing the game needs, and a caller reopens it with the current values. It lives in `src/ui/components/BottomSheet` with its own module (ADR-0016); callers do not style its frame.

### Consequences

- Good, because one component answers "where does this open on the phone" for every pane to come.
- Good, because the desktop is untouched: callers branch on the mode and keep their popover or sidebar.
- Bad, because every pane now has two renderings to keep in step, and a pane that forgets the branch is wrong on the phone (the cost ADR-0005 already named).
- Bad, because a sheet over a scrim blocks the map and the bar while open, so a pane that must stay interactive beside the table (the hand drawer) cannot use it.
