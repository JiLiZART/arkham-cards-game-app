## Context

- The hand fan (`HandFan.tsx`, `fan.ts`) lays cards on an arc. The hover zoom is pure CSS (`.fan-card:hover` → `translateY(--hover-lift) rotate(0) scale(--hover-k)`, 0.18 s transition), so only the card under the pointer changes and it snaps between states as the pointer crosses card edges. Neighbours never react.
- `HandDetails` (from `action-feed-journal`) is placed from a rect that `HandFan` computes geometrically for the raised card.
- Map card tokens are `TokenBadges` in a drei `<Html>` at the card's top-right corner (`CardMesh.tsx`). The stat bar's `TokenStack` (`Stats.tsx`) already draws clue piles from `stackTokens` with the `clue`/`clue-3` art.
- `HoverCard` returns early for `zone === "location"` (no copy on locations, asked for earlier). `mapProjector.rect(id)` gives a map card's screen rect and `camTick` re-renders on camera moves.
- `cardDetails`/`placeDetails` (`src/ui/details.ts`) are pure and unit-tested; `HandDetails.tsx` renders the rows.

## Goals / Non-Goals

**Goals:**

- Continuous, Dock-like magnification driven by pointer x, eased per frame; no CSS `:hover` snapping.
- One details-column look for hand cards and locations, sharing `placeDetails` and the row renderer.

**Non-Goals:**

- No change to drag-to-play, legal-card raise or keyboard behaviour beyond keeping them working.
- No vertical (y-based) magnification; only horizontal distance matters, like the Dock.
- No new enlarged copy for locations.

## Decisions

### 1. Dock magnification as a pure function

`dockScale(cardX, pointerX, cardW, k)` in `fan.ts` returns a 0..1 weight `w = max(0, cos(π/2 · |cardX − pointerX| / R))²`-style falloff with radius `R ≈ 1.5 × card width at rest step`, and the card's scale `1 + (k − 1) · w`, lift `HOVER_LIFT · w` and rotation `rotate · (1 − w)`. The card nearest the pointer gets `w = 1` only when the pointer is at its centre; a "focus" card (nearest centre) is still picked for z-order, details and click. Unit-tested: weight 1 at the centre, 0 beyond R, monotonic in between, symmetric.

_Alternative:_ CSS `:hover` plus `:has()` sibling selectors for neighbours. Rejected: only discrete steps (±1, ±2 neighbours), still snaps at edges.

### 2. Smoothing with requestAnimationFrame, not React state per frame

`HandFan` keeps the pointer x in a ref (pointermove on the fan container, which gets `pointer-events: auto` over the hand strip area only while the pointer is inside the cards' union). A rAF loop eases each card's current weight toward its target (`cur += (target − cur) · (1 − e^(−dt/70ms))`) and writes `style.transform` directly on the card elements via refs. React re-renders only when the focused card changes (for z-index, details, `setHovered`). When all weights are at rest the loop stops.

_Alternative:_ CSS transitions on transforms set from React state each pointermove. Rejected: restarted transitions stutter on fast moves and re-render the whole fan per event.

### 3. Hover zoom 1.28×

`HAND_HOVER_ZOOM = 1.28` (20% smaller than 1.6). `hoverScale(vh)` keeps the window-height cap. `HOVER_LIFT` is unchanged (bottom stays 12 px above the edge at full weight). `HandDetails`' rect uses the focused card's eased scale and centre.

### 4. Keyboard focus and dragging

Focus (`:focus-visible`) sets that card's target weight to 1 and others to 0 (no pointer). Dragging a card freezes the dock (all targets 0 except the dragged card, which keeps its existing drag transform), as now.

### 5. Clue stack on locations

Extract `TokenStack`'s pile markup into a presentational `TokenPile` (no flash, no stat-bar tooltip) used by both the stat bar and `CardMesh`. On locations, `CardMesh` renders `TokenPile kind="clue"` in its own `<Html>` at the card's bottom-centre above the art (sized ~34 px, with a dark rounded backing for contrast), and `TokenBadges` gets a `skip={["clues"]}` for locations. `<Html>` keeps it screen-sized, so it stays readable when zoomed out.

### 6. Location details column

- `cardDetails` gains location rows when `d.type === "location"`: `shroud` (and `investigateSkill` icon), `clues` (current count from the instance + printed `clues` with a per-investigator mark), `victory`, `connections` (names), `here` (investigator ids and enemy names). It takes an optional instance context `{ inst, game }`; the hand path is unchanged. Unrevealed: name = `backName`, text = `backText`, plus `here`.
- Connections: computed in the UI from the scenario's connection list and `flags.connections`, mirroring engine `connections()` — export a state-level helper from the engine (`connectionsOf(state, loc)`) rather than duplicating it.
- `LocationDetails` component: rendered by `HoverCard` for `zone === "location"` instead of returning null. Uses `mapProjector.rect(id)` + `placeDetails`, re-places on `camTick`. Hidden while `moveDrag` is active or a modal is open.
- Row renderer moves from `HandDetails.tsx` into a shared `DetailsColumn` component used by both.

## Risks / Trade-offs

- [rAF loop writing styles bypasses React] → Only transforms on card elements are written imperatively; everything else (z-index, classes, options) stays in React. Loop stops when idle.
- [Neighbour growth makes adjacent cards overlap more and steal the pointer] → Hit-testing uses the nearest card centre to pointer x over the fan area, not DOM hit-testing on the scaled cards.
- [Pointer-events on the fan container could block map clicks just above the cards] → The fan's tracking area is limited to the cards' resting union plus the raised card's rect; elsewhere `pointer-events: none` stays.
- [Clue stack overlapping investigator portraits on small locations] → Placed at bottom-centre where the location art leaves room (above the victory/text box); verified by screenshot at whole-map zoom.
