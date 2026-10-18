## Context

`MiniCard` in the scenario panel spreads `hoverProps(id)`, which drives the enlarged copy and the details column for the act, the agenda and the reference. `PlayerBar.tap` answers a choice, hands off to someone who can act, toggles the sheet for the investigator on screen, or sets the view; the sheet is local state anchored under the avatar. `touch.ts` knows the last pointer type (`isTouch()`).

## Goals / Non-Goals

**Goals:** no enlargement over the table from the panel; one meaning for a click in the bar; the sheet a hover away for teammates.

**Non-Goals:** the sheet's contents; the hand-off and choice behaviours of avatars (changed by `avatar-handoff`); the stat bar.

## Decisions

1. **Panel:** `MiniCard` gets a `hover={false}` prop used by the three scenario cards; the highlight stays through the existing `legal`/`:hover` styles. The hover enlarge's bullet list loses the act and agenda.
2. **Bar:** `tap` loses the sheet branch for a mouse; `setViewing(a.inv === decider ? null : a.inv)` runs for any avatar that isn't an answer or a can-act. The sheet opens from a hover timer: `onPointerEnter` on an avatar that isn't the one on screen starts a 500 ms timer (cleared on leave, on a click, and when the pointer type is touch); it opens the sheet for that investigator, anchored under that avatar; `onPointerLeave` of both the avatar and the sheet closes it after a 150 ms grace so the pointer can travel into the sheet. The `Sheet` component gains an `inv` that may differ from the one on screen (it already takes `inv`). On touch (`isTouch()`), the old toggle on the shown investigator's avatar stays.
3. **Timers** live in the component (view-only state, ADR-0004); `HOVER_SHEET_MS = 500` exported and tested through a pure `sheetFor(hovered, shown, elapsed)` helper.

## Risks / Trade-offs

- [Hover sheets can feel jumpy when crossing the bar] → the 500 ms delay and the leave grace; the sheet never opens for the avatar on screen.
- [The own ability button on the phone] → unchanged: the tap on the shown avatar opens the sheet on touch.

## Migration Plan

None.

## Open Questions

None.
