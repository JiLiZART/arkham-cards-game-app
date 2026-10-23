## Context

- `Showcase.tsx` renders `view.showcase` (drawn card ids, set by the fan's arrival logic) or a deck pick (`deckPick(game, viewer)`), holds the stage as `"showcase"`, flies each new card from the deck pile's box (`domPlace("deck", RESOLVE_BOX)`) to its place with `centreTransform` and a `rotateY` flip on `.sc-flip`, and sends cards on with `noteLocalMove` so the fan flies them from where they stood. `.sc-cards` wraps and scrolls; `.sc-front`/`.sc-back` each carry a box-shadow; `.sc-buttons` holds "To hand" or the pick's non-card options.
- Hover: showcased cards call `setHover`, but `HoverCard` returns null for hand-zone cards (drawn cards are already in the hand), so nothing shows. The fan's `HandDetails` renders a `DetailsColumn` placed by `placeDetails`.
- `flights.ts` has `flyDraw` (deck → show spot → fan, used when there is no showcase) and `flyIn`; the fan's `launch` uses them.
- The deck pile (`Pile` in `Panels.tsx`) is an `<button class="pile-card">` with `data-pile="deck"` on its wrapper; its count comes from state, which already dropped when the showcase opens.
- Sounds: `moment("flip")` when the showcase holds; `moment("draw")` when a card lands in the fan; `moment("button")` on To hand (goes with the button).
- In-force ADRs: 0001, 0002. 0002 applies: the showcase opens when the draw's cards are shown, which is already after the events before them have played (the stage), nothing changes there.

## Goals / Non-Goals

**Goals:**

- One flight, `riseAndArc`, for drawn cards and deck picks.
- A showcase that is a reading place: big, static, no scroll, no button, details on hover.

**Non-Goals:**

- Changing when the showcase appears or what holds the stage; the phone layout beyond the shrink rule; the opening hand.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

Assumptions: lightweight rigor; names as in `src/ui/hud`.

```
+---------------------------------------------------------------------------------+
| Browser app                                                                     |
|                                                                                 |
|  game store: hand changes / deckPick prompt      view store: showcase ids, stage|
|          |                                                 |                    |
|          v                                                 v                    |
|  +---------------+   from: deck pile box    +-------------------------------+   |
|  | Pile (deck)   |------------------------->| Showcase                      |   |
|  | data-pile=deck|                          |  cards (340px, rows rule)     |   |
|  +---------------+                          |  help line / text links       |   |
|                                             |  backdrop tap, Space/Enter    |   |
|  +---------------+   riseAndArc(el, from)   |  hover/focus -> DetailsColumn |   |
|  | flights.ts    |<-------------------------|  noteLocalMove on leave       |   |
|  | riseAndArc    |                          +---------------+---------------+   |
|  | flyIn, flyDraw|                                          | cards leave        |
|  +---------------+                                          v                    |
|                                             +-------------------------------+   |
|  +---------------+   DetailsColumn          | HandFan: flies each card from |   |
|  | HandDetails   |------------------------->|  where it stood (unchanged)   |   |
|  +---------------+                          +-------------------------------+   |
+---------------------------------------------------------------------------------+
```

## Decisions

### 1. `riseAndArc` in `flights.ts`, used by drawn cards and picks

Two keyframe groups on the card element: a rise (translate up one card height from the pile's box, face down, ~220 ms) then an arc to the rest transform with scale from the pile's size to the card's (~500 ms, `cubic-bezier(.2,.8,.2,1)`), the flip (`rotateY 180→0` on `.sc-flip`) running over the arc's first half. Per-card delay 150 ms. Deck picks today "just appear"; they use the same call so the two cases don't drift. Reduced motion: no animation (as now). Alternative: extend `flyDraw`; rejected, it is the fan's flight (deck → show spot → fan) for the no-showcase case and has its own timing.

### 2. Layout by count, no scroll

`.sc-cards` becomes a CSS grid: `--n` cards, column count `min(n, 4)`, card width `min(340px, (100vw − 120px) / cols − gap)`, and for `n > 8` the width is further divided by `ceil(n / 8)`; `overflow: hidden`. The shadow moves from the faces to `.sc-card` (the flip faces keep `backface-visibility: hidden` only). Alternative: keep wrap + scroll; rejected by the user.

### 3. Dismissal

The backdrop (`.showcase`) gets the `toHand` click handler for drawn cards; clicks on a card already dismiss; Space/Enter stay. For picks the backdrop does nothing (a pick needs a choice). `moment("button")` goes with the button; the fan's `draw` moment still plays as each card lands.

### 4. Help line and text links

`.sc-help` under the grid: `showcase.take` for draws; for picks `showcase.choose` or `showcase.chooseOrNone`, with the non-card options rendered as `<button class="link">` inside the line (none → "take nothing", done → "done", other labels as given). The instruction bar above keeps the prompt.

### 5. Details column

On hover/focus of `.sc-card`, `Showcase` renders `DetailsColumn` for the card, placed by `placeDetails` against the card's rect with a side preference (right, else left for the last column); it does not call `setHover`, so `HoverCard` stays out of it. Touch: `pointerdown` held 350 ms shows it until release. Alternative: teach `HoverCard` about showcased hand cards; rejected, it would show the enlarged copy, which the user doesn't want here.

### 6. The pile gives the card up

No new state: the pile's count already dropped. The rise starts from the pile's live box (`domPlace("deck")`), so it reads as leaving the pile; the pile's top face is a card back and the rising card is face down, so no mismatch.

## Risks / Trade-offs

- [The rise collides with the pile column's neighbours] -> z-index 300 on the flying card (as `flyIn` already sets); the rise is one card height, clear of the discard pile above.
- [340 px cards on a 1366 px laptop with 4 cards] -> the width rule caps at `(100vw − 120px) / 4 − gap` ≈ 290 px there; still larger than today.
- [Details column overlapping the help line or the bar] -> `placeDetails` already clamps to the viewport; the column's max height is the card's height.
- [`drive-calm.js` presses `.sc-buttons .primary`] -> the script taps the first card instead (it already does on the first showcase) and Enter after; updated in the same change.

## Migration Plan

UI only. Rollback: git.

## Open Questions

- Whether the backdrop tap should also work for picks when a none option exists (tap outside = take nothing). Default: no; outside taps do nothing during a pick.
