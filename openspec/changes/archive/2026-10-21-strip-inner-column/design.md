## Context

The desktop HUD (`src/ui/hud/Hud.tsx`) is fixed panels over the map. On the right today: `.play-strip` is a column at the window's edge (`right: 8px; width: var(--col-w) = 143px; top: 76px; bottom: var(--dock-h)`, the dock's measured height from a `ResizeObserver` in `Hud`), and `.right-col` (the chaos bag over the feed, `width: 300px; bottom: 320px`) sits to its left at `right: calc(16px + var(--col-w))`. `.right-dock` (camera buttons, Undo, the action rail; 160 px wide) is bottom-right under the strip. The camera keeps `DESKTOP_INSETS.right = 470` free (`src/ui/layoutMode.ts`): the strip, the feed and their margins.

`PlayStrip` (`src/ui/hud/Panels.tsx`) renders the column (threats, divider, assets), and for one card at a time, the hovered or keyboard-focused one with options (`stripButtonsFor`), a `.strip-actions` block of buttons fixed to the slot's left (`right = innerWidth - slot.left`), kept 200 ms after the hover leaves so the pointer can cross onto it (`kept`, `onButtons`). `HoverCard` (`src/ui/hud/HoverCard.tsx`) shows the enlarged copy from the view's `hovered` and `hoverRect` (ADR-0004); for strip cards it passes `rightLimit = slot.left - 8 - STRIP_BUTTONS_W` to `placeHover` (`src/ui/hover.ts`) so the copy and the details end left of the buttons. The copy's layer is `.hover-card { z-index: 80 }` and never takes the pointer. On touch, `tapCard` (`src/ui/touch.ts`) peeks a card through the same hover state, so the copy appears on the phone too.

A strip card with options glows with the hand's static ring (`.mini-card.legal`). During a skill test `stripDuringTest` returns `compact` (a strip card has a fast option: the strip stays) or `aside` (it slides right and fades); `.st-placed` (the test screen's placed cards) bounds its width by `--col-w` so it clears the strip. `.compact` has no CSS rule today.

## Goals / Non-Goals

**Goals:**

- Desktop order: panels, map, strip, bag and feed at the edge; the camera's free area unchanged.
- The strip's column runs down to the hand fan's resting cards (170 px), not to the dock.
- A strip card's buttons sit in the centre of its enlarged copy, on desktop and phone, with the pointer able to cross onto them.
- Cards with options pulse; hand cards unchanged; reduced motion keeps a static ring.

**Non-Goals:**

- No change to which options a card offers (`useOptionsByCard`), to the strip's order or card sizes, to the phone's column, or to the skill-test screen's stages.
- No change to the hover copy's size or to the details column's rows.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
 +---------------------------------------------------------------------------------------------+
 | top bar                                                                                       |
 +--------------------+-------------------------------------------+-------------+-------------+
 | scenario panel     |                                           | .play-strip | .right-col  |
 | piles              |            map (camera insets:            |  column     | chaos bag   |
 |                    |    left 200, right 470, bottom 170)       | threats     | feed        |
 |                    |                                           | ---------   |             |
 |                    |                        [ enlarged copy ]<-- assets     |             |
 |                    |                        [  [Fight]      ]  |  (scrolls)  |             |
 |                    |                        [  [Evade]      ]  |             +-------------+
 | stat bar           |               hand fan                    +-------------+ .right-dock |
 +--------------------+-------------------------------------------+-------------+-------------+

 PlayStrip (Panels.tsx)              view state (view.ts)        HoverCard (HoverCard.tsx)
 +---------------------------+       +-------------------+       +------------------------------------+
 | order: threats, |, assets | hover | hover {id, rect}  |  rect | box = placeHover(rect, ...)        |
 | --sw = columnCardWidth    |------>| (mouse, touch     |------>| copy + details (pointer-events none)|
 | slot focus -> setHover    | focus |  peek, focus)     |       | .strip-actions for the shown card's |
 | mode from stripDuringTest |       +-------------------+       |  options, centred on box, z > 80,   |
 +---------------------------+                                   |  kept while the pointer is on them  |
                                           cardClick.ts -------->|  (useOptionsByCard)                 |
                                                                 +------------------------------------+
```

## Decisions

1. **Swap the two right-hand columns in CSS only.** `.game` gains `--feed-w: 300px`; `.play-strip { right: calc(16px + var(--feed-w)); bottom: 170px }`, `.right-col { right: 8px; width: var(--feed-w) }`. The dock stays bottom-right under the feed (the feed's `bottom: 320px` already clears it). The `--dock-h` observer in `Hud` goes: nothing reads it. `DESKTOP_INSETS` stays `{ right: 470, bottom: 170 }`: 16 + 300 + 143 = 459 ≤ 470, and the strip's bottom equals the bottom inset. The test in `layoutMode.test.ts` asserts the sum.
   - Alternative, a CSS grid for the right side: more structure than two fixed boxes need.

2. **During a skill test the compact strip slides to the window's edge.** `.game.testing .play-strip.compact { right: 8px }` (the strip already transitions `translate`/`opacity`; add `right` to the transition). The feed under it is beneath the test overlay anyway. `.st-placed` keeps its `--col-w` bound, so the placed cards keep their 290 px at 1600×900 instead of shrinking to about 90 px if the bound included the feed. `.aside` keeps its slide-right-and-fade.

3. **The hover layer owns the buttons.** `HoverCard` renders `.strip-actions` for the shown card when it is in the strip and `useOptionsByCard` has options for it, as a sibling of the copy, positioned by a pure helper `centreOn(box, w, h, vw, vh)` → `{x, y}` (the buttons' top-left so their centre is the copy's centre, clamped 8 px inside the window; a thumbnail's copy on the phone is narrower than the buttons). `z-index: 81`, `pointer-events: auto`. The 200 ms grace and `onButtons` move from `PlayStrip` to `HoverCard`: the shown id is `hovered ?? kept`, and `kept` holds the last strip card with options for 200 ms after `hovered` clears, or for as long as the pointer or focus is on the buttons. `placeHover` loses `rightLimit`; `STRIP_BUTTONS_W` goes. The copy stays `pointer-events: none`; only the buttons take the pointer.
   - `stripButtonsFor(hovered, byCard)` stays as the pure rule (drop `focused`: focus now feeds the hover state, below). Tests follow.
   - Alternative, keep the buttons in `PlayStrip` and read the copy's box from the view state: a second owner of the box and a render-order dependency. Rejected.

4. **Keyboard focus shows the copy.** `.strip-slot`'s `onFocus` calls `setHover(id, rect)` and `onBlur` `setHover(null)`: a focused card gets the copy and its buttons like a hovered one; `PlayStrip` drops its `focused` state. Tab order: card, then its buttons (the buttons render after the strip in the DOM through `HoverCard`, which follows `PlayStrip` in `Hud`).

5. **The pulse is a strip-only CSS animation.** `.strip-slot .mini-card.legal { animation: strip-pulse 1.6s ease-in-out infinite alternate }` between today's ring (`0 0 0 3px #7fe08a, 0 0 14px #7fe08acc`) and a wider, brighter one (`0 0 0 4px #9ff0a8, 0 0 26px #7fe08a`); `@media (prefers-reduced-motion: reduce)` sets `animation: none`. The scenario panel's `.mini-card.legal` (act, agenda) and the hand's `.fan-card.legal` are untouched.

6. **Phone.** The column, handle and `--sw` rules stay. The dead rule `.game.phone .play-strip.column.open .strip-action` (the buttons were never inside the strip) becomes `.game.phone .strip-action { min-height: 44px }`. A tap's peek already sets the hover state, so decision 3 gives the phone its centred buttons with no phone-specific code (ADR-0005: the mode's rules stay in CSS).

## Risks / Trade-offs

- The hover copy of a 72 px card is 144 px wide; "Fight"/"Evade" buttons with icons are about 110–150 px: they may be as wide as the copy. Acceptable; `centreOn` keeps them in the window.
- The pointer crossing from the card to the buttons passes over the copy (no pointer) and the gap between slot and buttons: covered by the 200 ms grace, as today.
- The strip now reaches down to 170 px: a hovered hand card rising (z 60) passes over it. Transient; the fan already does this over the map.
- The feed's float items now sit at the window's edge, farther from the map they narrate. Accepted by the request.

## Migration Plan

CSS and UI only; no save, content or engine change. Ship in one commit; revert is a revert.

## Open Questions

None. No in-force ADR needs supersession: ADR-0004 (hover is view state) and ADR-0005 (one layout mode, rules in CSS) are followed.
