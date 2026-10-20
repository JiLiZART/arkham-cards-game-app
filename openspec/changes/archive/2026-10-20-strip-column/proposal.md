## Why

With several allies, other assets and two engaged enemies in play, the play strip covers the bottom of the map: the player can't see the location they stand on. The strip is a fixed row 228 px above the bottom, its cards 124 px wide and shrinking only to 84 px, while the camera keeps just 300 px at the bottom for the HUD, so the cards already reach 100 px into the map and their buttons 40 px more. Each card also shows its option buttons above it, about 130 px wide, so once the cards are narrower than their buttons the buttons land on each other, which the strip's own requirement forbids.

## What Changes

- **The strip is a column at the window's right edge on the desktop**, from under the top bar down to just above the action rail. The chaos bag and the feed move left by the column's width, and the camera's right inset grows by the same amount; the bottom inset no longer has to make room for cards.
- **The engaged enemies and threat-area cards come first, at the top, above a divider**, then the assets, so the cards most often acted on (Fight, Evade) stay visible.
- **Cards shrink, then the column scrolls.** Cards are 92 px wide when there is room and shrink to 72 px; past that the column scrolls (wheel, drag, touch). Exhausted cards stay turned sideways.
- **Option buttons appear only on hover or keyboard focus**, for one card at a time, stacked to the card's left, inside the window. A card with options keeps its glow so it can be found without hovering. A card with exactly one option still chooses it on click. On touch the first tap shows the buttons (the existing peek) and a tap on a button chooses it.
- **The enlarged copy and details column of a strip card go to the left of its buttons**, so they never cover them.
- **During a skill test**, the column keeps the rule it has as a row: shown only while one of its cards has an option, otherwise slid out to the right with no pointer. With the strip gone from the bottom, the test's subject card is back to its fixed 240×336 size and top on every desktop window, instead of shrinking with the window's height.
- The phone keeps its right-edge column and its handle; only its stepped-aside slide is unchanged.
- First, `test-screen-strip-clear` is finished and archived: it rewrote the same two requirements, and this change's deltas build on its version.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: Play area strip (a right-edge column, threats first, shrink then scroll, buttons on hover beside the card), Hover enlarge (a strip card's copy and details left of its buttons), Skill-test screen (the column steps out to the right; the subject keeps 240×336 and its top on every desktop window).

## Impact

- `src/ui/hud/Panels.tsx` (`PlayStrip`: order, the column's card width, the hovered or focused card's buttons, scroll), `src/ui/styles.css` (the column, `.right-col` shifted, the hover buttons, the stepped-aside slide, the subject's fixed size restored), `src/ui/layoutMode.ts` (`DESKTOP_INSETS`), the hover copy's placement for strip cards (`src/ui/hover.ts` / `HoverCard`).
- Tests: the column's card width (replacing `stripCardWidth`'s row maths), the order, the insets.
- No engine, content or save change.
