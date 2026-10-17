## 1. The flight

- [x] 1.1 Add `riseAndArc(el, flip, from, rest, delay)` to `src/ui/hud/flights.ts` with a test in `flights.test.ts` (new; the keyframe builder is pure): the rise keyframes lift one card height from the pile's box face down, the arc ends at `rest` with the flip finishing in the arc's first half, delays step by 150 ms. Use it in `Showcase.tsx` for drawn cards and for deck picks (replacing the single flight and the "just appear"). Verify in the browser with `drive-calm.js`'s showcase screenshots and a two-card draw: each card rises from the pile, arcs and lands in turn; reduced motion shows them in place.

## 2. The showcase

- [x] 2.1 Layout: `.sc-cards` as a grid with the count rule (up to 4 per row at 340 px, 5 to 8 in two rows, more shrinking, never scrolling); one shadow on `.sc-card`, none on the faces. Verify in the browser at 1600 and 1366 px wide with 1, 2, 4, 6 and 10 cards: all visible, no scrollbar, no dark box during the flip.
- [x] 2.2 Dismissal and help line: remove the "To hand" button and `showcase.toHand`; add `showcase.take`, `showcase.choose`, `showcase.chooseOrNone` in en and ru; the backdrop tap sends drawn cards to the fan; picks show their non-card options as text links in the help line. Keep Space/Enter. Verify in the browser: a tap on the backdrop sends the drawn card to the fan; a search with a none option shows "Choose one, or take nothing" and the link works.
- [x] 2.3 Details on hover: render `DetailsColumn` beside a hovered or focused showcased card (right, or left for the last column), long press on touch; no enlarged copy. Verify in the browser: hovering a showcased Machete shows its details column to the right; the rightmost of four shows it to the left; the `.hover-card` overlay does not appear.

## 3. Verification and docs

- [ ] 3.1 Update `drive-calm.js` (no `.sc-buttons .primary`: tap a card the first time, Enter the second) and any script that reads `showcase.toHand`; run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with 0 errors and `maxCenter` 1; `check-sounds.js` still passes (the draw moment plays as cards land in the fan, no button click).
- [ ] 3.2 README play notes for the draw and the showcase (rise and arc, tap to take, choose one, details on hover). Run `openspec validate card-draw-showcase --type change --strict`.
