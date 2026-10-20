## Context

`PlayStrip` (`src/ui/hud/Panels.tsx`) renders the viewer's assets, then a divider, then their threat area and engaged enemies, as a fixed row (`.play-strip`: `bottom: 228px; left: 436px; right: 184px`, `--sw` from `stripCardWidth`, 124 px down to 84 px). Every card with options renders its buttons above it (`.strip-actions`, absolutely positioned, one column per card). The camera keeps `DESKTOP_INSETS = { top: 86, right: 320, bottom: 300, left: 200 }` free for the HUD (`src/ui/layoutMode.ts`); the row's cards and buttons reach well above 300 px, into the map. On the right: `.right-col` (`top: 76px; right: 8px; bottom: 320px; width: 300px`: the chaos bag, then the feed) and `.right-dock` (`right: 12px; bottom: 14px; width: 160px`: camera buttons, Undo, the action rail). The phone already shows the strip as a right-edge column with a handle (`.game.phone .play-strip.column`).

During a skill test, `stripDuringTest(testing, ids, byCard)` returns `normal | compact | aside`: compact set `--sw` to 84 px, aside slid the row down out of view. The subject's size and top follow the window's height (`--st-h`, `--st-top` on `.game`) only so it clears the compact row.

Hovering a card calls `setHover(id, rect)` (view state, ADR-0004); `HoverCard` draws the enlarged copy and details from `placeHover(rect, detailsH, vw, vh)` (`src/ui/hover.ts`). On touch, `tapCard` peeks on the first tap (`setHover`) and chooses on the second.

In-force ADRs: 0001 to 0013. ADR-0004 (viewing is view state) and ADR-0005 (one layout mode read by components, geometry keyed by it) apply; ADR-0002 (presentation follows the animation clock) is unaffected.

## Goals / Non-Goals

**Goals:** the map's bottom row never under the strip; any number of cards usable; buttons that never overlap; a strip card's hover copy that doesn't cover its buttons; the skill-test screen keeps its rules with the strip in its new place.

**Non-Goals:** the phone's strip (already a column); the hand fan, the stat bar, the action rail; what options a card has.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
 +---------------------------------------------------------------------------------------------+
 | top bar                                                                                       |
 +--------------------+-------------------------------------------+-------------+-------------+
 | scenario panel     |                                           | .right-col  | .play-strip |
 | piles              |            map (camera insets:            | chaos bag   |  column     |
 |                    |    left 200, right 470, bottom 170)       | feed        | threats     |
 |                    |                                           |             | ---------   |
 |                    |                   [buttons][card]<--hover-------------|-- assets    |
 |                    |                                           |             |  (scrolls)  |
 | stat bar           |               hand fan                    |             +-------------+
 |                    |                                           |             | .right-dock |
 +--------------------+-------------------------------------------+-------------+-------------+

 PlayStrip (Panels.tsx)                  view state (view.ts)          hover.ts
 +-----------------------------+         +-------------------+         +--------------------------+
 | order: threats, |, assets   |  hover  | hover {id, rect}  |  rect   | placeHover(rect, ...,    |
 | --sw = columnCardWidth(...) |-------->| (mouse or touch   |-------->|   { rightLimit })        |
 | buttons for the hovered or  |<--------|  peek)            |         | copy + details end left  |
 |  focused card only, at left |         +-------------------+         | of the buttons           |
 | mode from stripDuringTest   |                                       +--------------------------+
 +-----------------------------+
```

## Decisions

1. **One column, always, at the right edge.** `.play-strip` on the desktop becomes `top: 76px; right: 8px; width: var(--col-w); bottom: var(--dock-h)`, `flex-direction: column`, `overflow-y: auto` (the scrollbar thin, overscroll contained). `--col-w` is the sideways width of the largest card plus padding (92 × 1.4 + 12 ≈ 141 px). `--dock-h` is the action dock's measured height plus a gap, set on `.game` by a `ResizeObserver` on `.right-dock` in `Hud`, so the column ends above the rail however many buttons it has. `.right-col` moves left: `right: calc(16px + var(--col-w))`. *Alternative:* a column only when crowded: rejected by the user (two layouts, a jump mid-game).

2. **Order: threats first.** The engaged enemies and threat-area cards render first, then the divider, then the assets (today it is the reverse). *Why:* Fight and Evade are the options used most, and the top of the column is never scrolled away.

3. **`columnCardWidth(room, upright, sideways, dividers)`** replaces `stripCardWidth`'s row maths: the height a card takes is `1.4w` upright and `w` sideways, plus gaps and dividers; the width is the largest in [72, 92] that fits `room` (the column's height), else 72 and the column scrolls. Pure, with a test.

4. **Buttons for one card, on hover or focus, at its left.** `PlayStrip` reads the view's hover id (`useView(s => s.hover?.id)`), set by the mouse (`onMouseEnter`) and by the touch peek (`tapCard`), plus the slot that has keyboard focus. Only that card's `.strip-actions` render, `position: absolute; right: 100%; top: 50%; translate: 0 -50%`, with an 8 px padding on their right so the pointer crosses no gap. The hover handlers move from the card to its slot, so moving from the card onto its buttons doesn't end the hover. Cards with options keep their `legal` glow. A one-option card's click still chooses. *Alternative:* a single option always visible: rejected, many one-option cards bring back the overlap.

5. **The copy and details go left of the buttons.** `placeHover` gains an optional `rightLimit`: the copy and details column are placed to end at or before it (clamped inside the window). For a strip card, `HoverCard` passes the slot's left edge minus the buttons' measured width (or 0 when the card has no options) and a margin.

6. **The skill test keeps its rule, sideways.** `stripDuringTest` stays; `compact` no longer changes the card width (the column is already clear of the centre), it only means "shown during the test, dimmed except the offered cards"; `aside` slides the column out to the right (`translate: 130% 0`), no pointer. The subject's height-based sizing goes: `.st-center` back to 240×336, `.st-middle` top 140 px, `.st-placed` top 196 px; `.st-placed` gets `width: min(290px, calc(50vw - 230px - var(--col-w) - 24px))` so the placed cards never reach the column on a 1280 px window.

7. **Camera insets.** `DESKTOP_INSETS.right` grows to 470 (the column, the feed band and margins) and `bottom` shrinks to 170 (the hand fan's peek and the stat bar), verified in the browser at 1600×900 and 1280×800 so a focused location is fully visible.

8. **Finish `test-screen-strip-clear` first.** Its remaining task (the test run, blocked only by a test since removed) is run and the change archived, so its version of the Play area strip and Skill-test screen requirements is the one this change modifies.

## Risks / Trade-offs

- [The map loses about 150 px of width on the right] → it gains about 130 px of height at the bottom, and the bottom row is where the player's location usually is; the camera centres in what is left.
- [A scrolled column can hide an asset with an option] → its glow is visible when scrolled to; the action rail and the instruction bar still name the option; the threats, the usual options, are at the top.
- [Hover-only buttons on a mouse are one move further away] → a single-option card still chooses on click, and the buttons appear at once on hover.
- [`--dock-h` from a ResizeObserver] → a layout value computed in `Hud`, read by CSS, the way the layout mode already keys geometry (ADR-0005).

## Migration Plan

UI only; no save or engine change. Rollback: revert.

## Open Questions

None.
