## 1. The mode

- [x] 1.1 Add `src/ui/layoutMode.ts`: `layoutModeOf(width, height, landscape)` (pure, tested: 852×393 → phone, 1366×768 → desktop, 900×500 → phone), `useLayoutMode()`, `insets(mode)` replacing `HUD_INSETS` with safe-area values read from CSS env; `App` sets `.game.phone`; `index.html` gets `viewport-fit=cover`; `MapCamera` reads `insets(mode)` and caps DPR at 2 in phone mode. Verify with a Playwright run at 852×393: the root has `.phone`, the camera frames a location within the visible map.

## 2. Phone HUD

- [x] 2.1 Add `src/ui/hud/Drawer.tsx` (edge, handle, swipe to open, tap outside to close, safe-area padding); mount the left drawer (act, agenda, piles) and the right drawer (Journal) in phone mode; the bar at 36 px with phase initials and journal/bag icons; the strip as a right-edge thumbnail column that expands on tap; the instruction bar above the hand drawer taking the rail's Draw/Resource/Investigate. Verify in a new `check-phone.js` at 852×393 with screenshots: no overlapping panels, each drawer opens and closes, the bar's buttons reachable, every control ≥ 44 px.
- [x] 2.2 Hand drawer: `HandFan` drawer mode (peek row 60 px, playable cards 20 px higher and highlighted, tap/swipe opens the fan sized to the drawer with cards ≥ 220 px tall, tap chooses and closes, outside tap or swipe down closes). Verify in `check-phone.js`: two playable cards peek higher; open, play Machete, the drawer closes and the card is in the strip.
- [x] 2.3 Overlays reflowed under `.game.phone`: skill-test screen (subject 120 px, placed cards as a column, one-line calc strip, discs sized to fit), showcase (two per row), hand-off, phase and turn titles, tips (anchors clamp to the viewport), modals (full screen with a close control). Verify in `check-phone.js` screenshots of each. (Verified in `check-phone-overlays.js`: nothing off screen, every button 44 px. The showcase keeps its largest-fit rule instead of two per row: at 852×393 four cards stand in one row 140 px wide, where two per row would make them 62 px.)

## 3. Touch

- [x] 3.1 Add `src/ui/touch.ts` (tap = peek via the hover state, second tap on the same id within 1.5 s = choose, long press 450 ms = modal; mouse unchanged) and gate `useCardClick` and the marker/strip/fan handlers through it for touch pointers; add the first-turn phone tip wording. Verify in `check-phone.js` with touch emulation: first tap on the Hallway shows its details and chooses nothing; second tap moves; long press on a strip card opens the modal; a marker drag still moves.
- [x] 3.2 `RotateCard` for portrait on phones, with strings in en and ru. Verify at 393×852: the card shows; at 852×393 it is gone and the game state is unchanged.

## 4. Verification and docs

- [ ] 4.1 Run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` at 1600×900 to round 3 with 0 errors (desktop untouched); `check-phone.js` passes; `perf-devourer.js` at 852×393 with 4× CPU throttle reports its numbers; a run on a real phone (iOS Safari and Android Chrome) noted in the tasks with what was seen.
- [ ] 4.2 README: the phone layout, drawers, the hand drawer, tap to peek and choose, long press, rotate. Run `openspec validate phone-landscape --type change --strict`.
