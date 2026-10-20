## 0. Before

- [x] 0.1 Finish `test-screen-strip-clear`: run its task 3.2 (tests, lint, typecheck, build, `check:content`, validate) and tick it, then archive it with its specs synced.

## 1. The column

- [x] 1.1 `columnCardWidth(room, upright, sideways, dividers)` (92 down to 72, then scroll) replacing `stripCardWidth`; tests (few cards: 92; many: between; too many: 72; sideways cards count their own height).
- [x] 1.2 `PlayStrip`: threats, divider, assets; `--sw` from `columnCardWidth` and the column's height; desktop CSS: the column at the right edge, `--col-w`, scrolling; `.right-col` moved left; `--dock-h` from a `ResizeObserver` on `.right-dock`; a test of the order.
- [x] 1.3 `DESKTOP_INSETS` right 470, bottom 170; the camera tests updated.

## 2. Buttons on hover

- [x] 2.1 Only the hovered (mouse or touch peek) or focused card's buttons render, at its left, the hover kept on the slot; the glow on cards with options kept; a one-option card's click still chooses; tests of which card shows buttons (a pure helper over the hover id, the focused id and the options).
- [x] 2.2 `placeHover` with `rightLimit`; `HoverCard` passes it for strip cards (left of the buttons); tests (the copy and details end before the limit, inside the window).

## 3. The skill test

- [x] 3.1 `compact` keeps the column's width; `aside` slides it out to the right; the subject back to 240×336 at top 140 (`--st-h` / `--st-top` removed), `.st-placed` top 196 and narrowed to clear the column; `stripDuringTest` tests unchanged.

## 4. Verification

- [ ] 4.1 Browser at 1600×900 and 1280×800: Roland with 8 assets and 2 engaged enemies: the enemies at the top, cards 72 px, the column scrolls, the camera's focus shows his location clear of the HUD; hovering a card shows only its buttons at its left and its enlarged copy further left; a click on a button works (the pointer crosses from the card to the button without losing it); a skill test with Physical Training: the column shown, the subject 240×336; the draw with the column slid out; the phone at 852×393 unchanged; 0 console errors; screenshots.
- [ ] 4.2 `npm test`, lint, typecheck, build, `check:content` by exit code; `openspec validate strip-column --type change --strict`.
