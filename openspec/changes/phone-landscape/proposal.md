## Why

The table was laid out for a 1600×900 desktop: fixed panels on every edge leave the map a window in the middle, hover does half the work, and the fan is 315 px tall. A phone in landscape is about 850×390 CSS px with notch insets. Nothing fits, nothing hovers, and the camera framing assumes 380 px of HUD at the bottom. The game should be playable on a phone held sideways, with the same rules and the same screens.

## What Changes

- **A phone layout mode.** One mode switch (`phone` when the viewport is under 500 px tall or under 900 px wide in landscape; `desktop` otherwise) that every HUD component reads; no per-component media queries. In phone mode:
  - the map fills the screen; the player bar is the only top strip (36 px), with the phase pills shrunk to initials and the journal and bag as icons;
  - the act, agenda and piles live in a left drawer that slides in from the edge; the Journal in a right drawer;
  - the hand is a drawer along the bottom: collapsed it shows card edges peeking (about 60 px, playable cards peeking higher); a swipe up or a tap opens the fan over the map; a tap chooses a card and closes it;
  - the instruction bar sits above the hand drawer with its buttons, and Draw, Resource and Investigate join it (no separate rail);
  - the play strip becomes a column of thumbnails on the right edge, tap to expand;
  - the skill-test screen, the showcase, the hand-off and the title overlays reflow to the short screen (subject 120 px wide, cards two per row);
  - camera framing uses the phone mode's insets.
- **Touch instead of hover.** A tap on a card or marker peeks it (details column, enlarged copy where one exists); a second tap chooses when it is an option; a long press opens the detail modal. Pointer users keep hover. Every tap target is at least 44 px.
- **Orientation and insets.** `viewport-fit=cover` with safe-area insets on the drawers and bars; in portrait a full-screen "rotate your phone" card.
- **Performance budget**: the phone mode caps device pixel ratio at 2 and uses the existing settle gates; `perf-devourer.js` is run at 852×393 with 4× CPU throttle.

Out of scope: a portrait layout, touch gestures beyond tap, long press, swipe and the existing pinch; native wrappers.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: adds the phone layout mode, touch interaction and orientation handling.

## Impact

- New `src/ui/layoutMode.ts` (`useLayoutMode`, insets per mode) and `src/ui/hud/Drawer.tsx`; `safeArea.ts` (insets by mode), `Hud.tsx` (drawers, the bar, the merged instruction bar), `HandFan.tsx` (drawer state, peek, open/close), `Panels.tsx` (strip column), `TipLayer.tsx`/`HoverCard.tsx`/`HandDetails.tsx` (tap-to-peek), `scene/MapCamera.tsx` (insets, DPR cap), `index.html` (viewport meta), `styles.css` (`.game.phone` rules, safe-area), strings for the rotate card.
- Depends on `player-bar` (the one top bar) and is best after `skill-test-screen` and `card-draw-showcase` so their overlays are reflowed once.
