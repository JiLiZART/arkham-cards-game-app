## Why

The play strip sits at the window's right edge with the chaos bag and the feed squeezed between it and the map, so the viewer's own cards are the farthest thing from the locations they act on, and a card's option buttons pop out beside it into the feed's band. The strip belongs next to the map, with the bag and the feed at the edge, and a card's actions belong on the card the player is looking at.

## What Changes

- Desktop layout becomes, left to right: the act, agenda and piles; the map; the play strip column; the chaos bag and the feed at the right edge. The strip moves inward (left of `.right-col`), the bag and feed move to the edge. The camera's free area is unchanged (the two columns together still take the same width on the right).
- The strip column runs from under the top bar to just above the hand fan's peek, no longer stopping above the right dock (it is no longer above the dock), so it has more room before it shrinks or scrolls.
- A strip card's option buttons move from beside the card to the centre of the card's enlarged hover copy: hovering (or peeking on touch, or focusing) a card with options shows the copy centred on the card as everywhere else, with the buttons stacked in its middle; the pointer can move onto the buttons and the copy stays. The enlarged copy no longer shifts left past a buttons column.
- Cards with a pending option get a stronger highlight than the hand's static green ring: the ring pulses slowly, so a card with something to do stands out from exhausted and idle cards without hovering. Hand cards keep their static ring.
- The phone keeps its right-edge thumbnail column and handle; it gets the centred buttons (a tap's peek already shows the enlarged copy) and the pulsing ring.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: "Play area strip" (the column's place between the map and the bag/feed, its vertical extent, buttons in the centre of the enlarged copy, the pulsing highlight) and "Hover enlarge" (a strip card's copy is centred on the card like any other, no shift past a buttons column).

## Impact

- `src/ui/styles.css`: `.play-strip` and `.right-col` positions swapped, the strip's bottom, `.strip-actions` centred on the hover copy, the pulsing `.legal` ring for strip cards.
- `src/ui/hud/Panels.tsx` (`PlayStrip`: the buttons' placement from the hover copy's box instead of the slot's left edge), `src/ui/hud/HoverCard.tsx` and `src/ui/hover.ts` (the strip's `rightLimit` goes; the copy's box is shared with the buttons), `src/ui/hud/Hud.tsx` (`--dock-h` no longer bounds the strip).
- Tests: `strip.test.ts`, `hover.test.ts`, `layoutMode.test.ts` (insets unchanged, asserted).
- No engine, content or save change.
