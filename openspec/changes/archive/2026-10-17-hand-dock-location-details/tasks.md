## 1. Hand fan dock

- [x] 1.1 `fan.ts`: `HAND_HOVER_ZOOM` 1.6 → 1.28 and a pure `dockWeight(cardX, pointerX, radius)` plus the per-card scale, lift and rotation it implies. Unit tests: weight 1 at the card centre, 0 beyond the radius, symmetric, monotonic falloff; full-weight scale equals `hoverScale(vh)`; `npm test` passes.
- [x] 1.2 `HandFan.tsx`: track the pointer x over the fan area, pick the focused card by nearest centre, and ease every card's weight toward its target in a requestAnimationFrame loop that writes transforms through refs and stops when idle. Remove the CSS `:hover` zoom; keep legal-card raise, drag-to-play, click and Enter working; keyboard focus raises the focused card fully. Verify in the browser at 1600×900: a slow sweep across a 7-card hand changes sizes smoothly with neighbours slightly raised, leaving the fan settles back, and a hovered card is about 384×538 at 1080p.
- [x] 1.3 `HandDetails` follows the focused card's eased rect (new zoom). Verify with a screenshot of a hovered Machete and of the rightmost card of a 7-card hand (column on the left).

## 2. Clues on locations

- [x] 2.1 Split the pile markup out of `TokenStack` into a presentational `TokenPile` reused by the stat bar (stat bar unchanged: check with a screenshot) and by `CardMesh` for clues on locations, with `TokenBadges` skipping clues on locations. Verify with screenshots: the Study with 4 clues shows a 3-token and a 1-token labelled 4, readable at the whole-map zoom; a location with 0 clues shows no stack.

## 3. Location details

- [x] 3.1 Engine: export a state-level `connectionsOf(state, loc)` used by the existing `connections()`; engine tests still pass.
- [x] 3.2 `cardDetails` location rows: shroud (and investigate skill when not intellect), clues now and printed clues with the per-investigator mark, victory, connections by name, investigators and enemies there; unrevealed shows only back name, back text and who is there. Unit tests for a revealed Hallway, an unrevealed Cellar and a location with victory; English and Russian labels added to `content/i18n/{en,ru}/ui.json`.
- [x] 3.3 Move the row renderer into a shared details column; `HoverCard` shows a `LocationDetails` column for hovered locations (no enlarged copy), placed with `placeDetails` from `mapProjector.rect`, following `camTick`, hidden while dragging a portrait or with a modal open, never taking the pointer. Verify with screenshots of a revealed location, an unrevealed one, and one at the right edge (column on its left), in `en` and `ru`.

## 4. Verification

- [x] 4.1 Run `.playwright-mcp/drive.js` (two rounds at 1600×900) with no console errors and add screenshots of a mid-sweep hand and a hovered location's details column.
- [x] 4.2 `npm test`, `npm run lint`, `npm run build` and `npm run check:content` all pass; update the README play notes (Dock-style hand, location details, clue stacks).
