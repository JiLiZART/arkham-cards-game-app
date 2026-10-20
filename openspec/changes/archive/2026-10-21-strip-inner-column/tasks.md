## 1. The columns swapped

- [x] 1.1 `styles.css`: `--feed-w: 300px` on `.game`; `.play-strip` at `right: calc(16px + var(--feed-w)); bottom: 170px` (drop `--dock-h`); `.right-col` at `right: 8px; width: var(--feed-w)`; `.game.testing .play-strip.compact { right: 8px }` with `right` in the strip's transition. `Hud.tsx`: remove the `--dock-h` `ResizeObserver` effect.
- [x] 1.2 `layoutMode.test.ts`: assert `DESKTOP_INSETS.right >= 16 + 300 + 143` (the feed, the strip and their margins) and `DESKTOP_INSETS.bottom === 170` (the strip's bottom); `DESKTOP_INSETS` unchanged.

## 2. Buttons in the centre of the copy

- [x] 2.1 `hover.ts`: `centreOn(box, w, h, vw, vh)` → the buttons' top-left so their centre is the copy's centre, clamped 8 px inside the window; `placeHover` loses `rightLimit`. `hover.test.ts`: `centreOn` (centred; clamped at the right edge for a phone thumbnail's copy; clamped at the bottom), the `rightLimit` cases removed.
- [x] 2.2 `Panels.tsx`: `stripButtonsFor(hovered, byCard)` (no `focused`); `PlayStrip` drops the `.strip-actions` block, `kept`, `onButtons`, `focused`; `.strip-slot` `onFocus` → `setHover(id, rect)`, `onBlur` → `setHover(null)`. `strip.test.ts` follows.
- [x] 2.3 `HoverCard.tsx`: for a shown strip card with options, render `.strip-actions` (the same `stripAction` / `abilitySymbol` / `Icon` buttons, `choose` on click) positioned by `centreOn`; `shown = hovered ?? kept`, `kept` holding the last strip card with options for 200 ms after `hovered` clears or while the pointer/focus is on the buttons; `STRIP_BUTTONS_W` and the `inStrip` limit removed. `styles.css`: `.strip-actions { z-index: 81; pointer-events: auto; transform: none }` (positioned by left/top), `.game.phone .strip-action { min-height: 44px }` replacing the dead `.play-strip.column.open .strip-action` rule.

## 3. The pulse

- [x] 3.1 `styles.css`: `@keyframes strip-pulse` and `.strip-slot .mini-card.legal { animation: strip-pulse 1.6s ease-in-out infinite alternate }`; `@media (prefers-reduced-motion: reduce) { .strip-slot .mini-card.legal { animation: none } }`.

## 4. Check

- [x] 4.1 `npm test`, `npm run lint`, `npm run build`; in the browser at 1600×900: the column order, the strip clear of the hand fan's resting cards, Fight/Evade in the centre of the Ghoul Minion's copy with the pointer crossing onto them, a one-option card still chosen by a click, the pulse, the compact strip at the edge during a test with Physical Training in play; on a phone viewport: a tap's peek shows the copy with its buttons.
- [x] 4.2 `openspec validate strip-inner-column --type change --strict`.
