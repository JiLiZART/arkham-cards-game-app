## 1. Assets

- [x] 1.1 Write `scripts/extract-assets.sh` (copy and rename the named icons from `inspired/icons` into `public/icons/`; extract the parchment spread from the Learn to Play PDF into `public/table/parchment.jpg`), run it, and commit the outputs. Verify by building and serving `dist/` with `inspired/` renamed: all icons and the background load.
- [x] 1.2 Add `src/ui/icons.ts` (name → URL mapping, glyph fallbacks) and an `<Icon>` component with a same-size text fallback on error. Verify with a unit test that every mapped file exists in `public/icons/`, and a manual check that a broken URL shows the text badge without layout shift.

## 2. Flat board

- [x] 2.1 Replace `PerspectiveCamera` and `MapControls` with a fixed top-down `OrthographicCamera` and a `useFitBoard` hook (safe rect = canvas minus the top bar, prompt panel and hand band). Verify manually that dragging or scrolling never moves the view, and that resizing 1600×900 → 1280×800 keeps the whole board visible.
- [x] 2.2 Replace the felt with a parchment board plane sized to the board rect; switch connection lines and labels to colours that read on parchment. Verify with a screenshot at 1600×950.
- [x] 2.3 Re-tune `layout.ts` for the flat board: no hand placements, the viewer area moved up, card scale up about 15%, all placements inside the board rect. Verify with `layout.test` (no overlaps for 4 players, every placement inside the board) passing.
- [x] 2.4 Adapt `CardMesh` and `EventFx` to the top-down camera (no tilt; flights use scale instead of height); set texture anisotropy to max with mipmaps. Verify manually that an encounter draw and a token pop still animate.

## 3. Hand fan

- [x] 3.1 Implement pure `fanLayout(n, width)` with unit tests: symmetric arc, overlap tightens with n, at least 40 px of each card visible for 12 cards at 1280 px.
- [x] 3.2 Implement the `HandFan` DOM component: image with text fallback, hover/focus raise to readable size (about 300 px tall at 1080p), highlight for playable cards, privacy via `handVisible()`. Verify manually by hovering cards in a 7-card hand: the hovered card is fully visible and legible.
- [x] 3.3 Play from the fan: click, Enter, or drag up more than 110 px submits the play option; a card with several options opens the existing popup. Verify manually: drag-to-play an asset (it moves to the play area) and Enter-to-play an event.

## 4. Stats with icons

- [x] 4.1 Add a `StatBar` for the viewer (portrait, class, health/sanity remaining of max, resources, clues, actions, four skills) and `PlayerPlaques` for the others, with a `useFlash` highlight on change. Verify manually: taking damage flashes and lowers health; 3-player games show 2 plaques with an active marker.
- [x] 4.2 Slim down `TopBar` (scenario, agenda doom, act clues and menu with icons, no emoji); switch the token badges on board cards to `<Icon>`. Verify with a screenshot: no emoji remain in the HUD.
- [x] 4.3 Show chaos token icons in the token pop, the skill test panel and the result banner (generic disc for numeric tokens without art). Verify manually: reveal a skull and a −3 token.
- [x] 4.4 Make `formatText` render icon markup inline (skills, chaos tokens, classes) with glyphs for action/reaction/fast. Verify with a unit test for Roland's text (elder sign icon, reaction glyph, no raw brackets).

## 5. Verification

- [x] 5.1 Play a 2-investigator Gathering turn cycle in the browser (hand-off, hover-read, drag-to-play, investigate, enemy phase). Confirm no console errors and that the screenshots match the spec scenarios.
- [x] 5.2 Confirm `npm test`, `npm run lint`, `npm run build` and `npm run check:content` all pass.
