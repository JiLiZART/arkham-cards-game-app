## Why

The viewer's assets sit in a row at the bottom left, between the piles and the stat dock. The row is sized to fit every card flat: from the fifth card on it wraps, the cards shrink to 56 px, and past that the row scrolls, so a scrollbar appears right where the player is looking and the cards become too small to tell apart. A player with six or eight assets (a normal mid-scenario board) gets the worst of it.

## What Changes

- The asset row becomes an overlapping row, like a hand: the cards keep one fixed size (92 px wide, the threat column's size) and overlap more as there are more of them. The row never wraps and never scrolls.
- A hovered or keyboard-focused asset comes to the front of the row (its enlarged copy and option buttons work as before). An asset with pending options keeps its pulsing ring.
- Token badges (uses, damage, horror, doom, resources) on asset-row cards move to the card's top-left corner, the part of an overlapped card that stays in view. Everywhere else they stay top-right.
- Exhausted assets still lie sideways and overlap like the others.
- The row's place (over the stat dock, as wide as it, under the piles) and the phone layout (one right-edge column) do not change.
- The "Play area strip" requirement is rewritten to describe the desktop layout as it is now: the threat column on the right and the asset row at the bottom left. The current code already shows the assets in the bottom-left row (uncommitted work from this session); the spec still describes the earlier one-column layout.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: "Play area strip" — on the desktop the assets form an overlapping fixed-size row at the bottom left that never wraps or scrolls, with the token badges at the top-left; the engaged enemies and threat area keep the column on the right. Column behaviour (sizing, scrolling, buttons, target outline) is unchanged.

## Impact

- `src/ui/hud/Panels.tsx`: `PlayStrip` (`part="assets"`) stops measuring for wrap and scroll; it computes the overlap step from the row's width and the cards' widths. `rowCardWidth` and `ROW_MIN_W` go away.
- `src/ui/styles.css`: `.play-strip.assets` (no wrap, no overflow, negative margins or absolute slots for the overlap, hover/focus z-order) and `.play-strip.assets .mini-card .tokens`.
- `src/ui/hud/strip.test.ts`: the `rowCardWidth` tests are replaced by tests of the overlap step.
- `src/ui/arrivals.ts` and HoverCard keep working unchanged: slots keep `data-card` and `.play-strip`, so flights and remembered rects are the same.
- `.agents/context/design.md` and `.impeccable/design.json`: one sentence on the overlapping row.
- No engine, content or i18n change.
