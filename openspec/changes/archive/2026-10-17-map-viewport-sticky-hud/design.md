## Context

This builds on `readable-table-rework`.

- `Table.tsx` has a fixed `OrthographicCamera` fitted by `fitZoom()` to a `BOARD` rect (32×16 units) inside `SAFE_INSETS`.
- `layout()` places three regions on that board: the scenario strip, the map, and the viewer's play area.
- `CardMesh` draws every board card in WebGL. `CardZoom` (Hud.tsx) shows the hovered card in a fixed top-right panel.
- `EventFx` animates the encounter flight and the token pop in world space, starting from the strip's deck and bag positions.
- Option routing goes through `optionHome()`, and a playthrough test covers it.
- The DOM card components already exist: `CardFace`, `CardModal`, `TokenStack`, `ChaosTokenIcon`, `Portrait`.
- The scenario JSON already names its reference card (`card`).

The user chose a fixed play-area strip (not on the map) and a centred default view where the active location is about 420 px tall.

## Goals / Non-Goals

**Goals:**

- The WebGL scene draws only the map. Everything else is DOM, so its text is sharp and it never moves with the camera.
- One hover mechanism for every card, in place.
- Camera controls that a mouse user understands without help: drag to pan, wheel to zoom, Focus and Whole map buttons.

**Non-Goals:**

- Touch gestures beyond a two-finger pinch zoom.
- Edge auto-pan while dragging a portrait. The player zooms out instead; add it if play shows the need.
- Engine or content changes.

## Decisions

### 1. Camera: own small controller, no drei controls

`MapCamera` replaces `FittedCamera`. It keeps `{ cx, cz, zoom }` in a ref and eases toward a target every frame (`damp`).

- **Input:** pointer handlers on the canvas element.
  - _Pan:_ a press followed by more than 5 px of movement pans, converting pixels to world units with `1/zoom`.
  - _Click:_ a press that moves less than that is a click. R3F `onClick` still fires, but `Table` drops clicks when `panned.current` is set.
  - _Zoom:_ the wheel changes zoom by ×1.1 per notch, anchored at the pointer: the world point under the cursor stays fixed.
  - _Pinch:_ two pointers zoom by the ratio of their distances.
- **Limits:**
  - `zoomMin` fits the map bounds plus a one-card margin inside the window.
  - `zoomMax` draws a location at 840 px tall.
  - The pan clamp keeps the camera centre within the map bounds.
- **Focus target:** `zoom = 420 px / locationHeightWorld`, centred on the deciding investigator's location, with the 1080p target scaled by `innerHeight / 1080`.
  - A `useEffect` on `[pending.inv, that investigator's location]` sets the target.
  - It is skipped if the user panned or zoomed in the last 1.5 s, or a drag is active.
- **Controls:** "Focus" and "Whole map" are two small DOM buttons at the bottom-right above the action rail. They set the target.
- **Why not drei `MapControls`:** it was removed in the flat change because it fought card drags. Pointer-anchored zoom, the clamps and click suppression are about 80 lines with no new dependency.

### 2. Layout: map only

`layout()` drops the strip and viewer regions, and with them `BOARD` and `SAFE_INSETS`.

- It returns:
  - locations on the grid at `S_LOC` world units (1.4 × 2 as now), with connections;
  - things at locations, as now, including other investigators' engaged enemies with a badge;
  - minis;
  - `bounds` (map extent plus margin).
- `bounds` drives the camera limits. (The table background was planned as a plane sized to `bounds`; it became a fixed full-screen CSS background, see below.)
- The viewer's deck, discard, assets and threat area, the act, the agenda and the piles are no longer placed. `optionHome` still says "board" for assets, threats and engaged enemies; the play area strip renders them.
- `layout.test` becomes: no overlaps between groups on the map, all inside `bounds`, and nothing of the viewer's except their minis on the map.

### 3. HUD panels (DOM)

- **`ScenarioPanel` (top-left, fixed):**
  - act and agenda as `CardFace` at about 170×122 px (landscape scans), with a token badge row (doom, clue cost) and legal highlight;
  - a click opens `CardModal`, which gains a `bothSides` mode for act and agenda: front and back side by side.
- **`PileColumn` (left, below):** encounter deck (card-back art), encounter discard (top face up), victory, side decks, then a divider and the viewer's deck and discard. Each pile is a stacked card with a count badge, about 86×120 px.
- **`ChaosBag` (top-right corner):** the bag image with its count.
  - A click opens `ChaosBagModal`: tokens grouped with `ChaosTokenIcon` and ×n, and the scenario reference card (`CardFace` of `scenario.card`, front for easy/standard and back for hard/expert).
  - The token pop becomes a DOM animation from the bag's rect toward the centre.
- **`InvTokens`:** moves under the bag (`top` = bag height + gap).
- **`PlayStrip` (bottom, above the hand fan's resting height, between the stat dock and the rail):**
  - small cards (about 96×134 px), with exhausted ones rotated 90°, a token badge (reusing CardMesh's badge markup) and a legal highlight;
  - a click goes through the same `byCard` and `openMenu` logic as the board, moved into a shared `useCardClick()` hook;
  - threats follow a separator.
  - The hand fan's resting cards sit below the strip, which takes the band just above them. The fan's legal raise is reduced so raised cards stop at the strip's lower edge.
- **Encounter resolving:** the encounter card being resolved and the encounter-draw flight become a centred DOM overlay (`ResolvingCard`), animated from the encounter pile's rect. Committed skill cards show as thumbnails in `SkillTestPanel`.

### 4. Hover enlarge (one overlay for everything)

`useView.hover` stores `{ id, rect }`, where `rect` is the card's on-screen rectangle.

- **Where `rect` comes from:**
  - DOM cards (panels, strip, pile tops) use `getBoundingClientRect()`;
  - map cards use the projected footprint (the `cardRects` projection already in `Table.tsx`, extracted to `projectRect()`), recomputed on camera change while hovered.
- **`HoverCard` overlay** (fixed, `pointer-events: none`, z above the HUD but below modals):
  - `CardFace` at twice the rect size, centred on the rect;
  - a details block below it (name, subtitle, traits, `formatText` text, token icons);
  - the whole box is clamped into the viewport. Clamping is a pure `placeHover(rect, size, viewport)` with unit tests for the centre, right-edge and bottom-edge cases.
- `CardZoom` is deleted. A card mesh's own hover grow drops to a highlight only, since the overlay shows the enlarged copy.
- Hand cards keep their own hover (Decision 5); the overlay ignores `zone === "hand"`.

### 5. Hand hover at 2×

- The hover style changes from `translateY(-243px)` to `translateY(…) scale(k)`, where `k = min(2, (innerHeight − 16) / 420)`. The origin is bottom-centre, and the translate lifts the scaled card's bottom just above the screen edge.
- `k` is set as a CSS variable from `HandFan` on resize.
- The hovered card's `z-index` goes above the strip and stat dock.

### 6. Stat numbers at least 48 px

- `.stat-bar .stat b`, `.token-stack b`, the skill values and the action count get `font-size: 48px; line-height: 1`.
- Max values (`/9`) stay smaller (22 px) beside them.
- The bar becomes three rows: portrait and name; health, sanity and actions; skills. Its width grows to about 420 px (`STAT_BAR_W`).
- The fan's 12-card check at 1280 px relaxes from 40 px to 32 px visible per card. Hover is still reachable, which is what the "Large hand" scenario requires.

### 7. Font-first icons, transparent PNGs

- **`src/ui/icons.ts`** maps each concept to a source:
  - `{ glyph: "<arkhamicons name>", color }` for skills, classes, health, sanity, slots and action symbols, with colours as CSS variables (`--c-willpower`…, `--c-guardian`…, health `#b3261e`, sanity `#2f5fb3`);
  - `{ token: "<tokens base name>" }` for chaos tokens;
  - `{ png }` for physical tokens, lead, card back, bag and connectors.
- **Glyph fonts as a list:** `extract-assets.sh` gets a `FONTS` list of name / ttf / IcoMoon config: `arkhamicons`, `arkhamslim`, `tokens`, `blood` and `standalone`. For each one it copies the ttf and adds its map to `glyphs.generated.json`, and `styles.css` gets one `@font-face` per font. Adding another ArkhamCards font (for example `coreset` for encounter-set icons) is one line.
  - **Lookup order:** `glyphChar` searches the preferred font first (`arkhamslim` when small, `arkhamicons` otherwise), then the others in list order. That is how `blood` and `standalone` supply their own glyphs (the blood token, encounter-set, scenario and starter-deck icons) without duplicating the shared ones.
  - **Encounter-set and scenario icons:** a small `setIcon(code)` resolves a glyph by name across the fonts. The card hover details and the encounter pile use it when the name exists, so future content needs no mapping. (Night of the Zealot's sets are in `coreset.ttf`, which is not in the list unless requested.)
  - `glyphChar(name, font)` takes `"arkhamslim"`. `<Icon>` picks `arkhamslim` when `size <= 24` (and `formatText` always does), and `arkhamicons` otherwise. It falls back to whichever font has the name: `arkhamslim` lacks slots, health and sanity, and `arkhamicons` lacks the TDC runes.
  - `watchIconFonts()` checks all three fonts.
- **`<Icon name size>`** keeps its API and switches on the source:
  - glyphs render as the existing `.gl` span, with the fallback label in `.gl-fb`;
  - chaos tokens render as the layered token from `ChaosTokenIcon`, generalised from numbers to every token: per-token fill, overlay and highlight layers and colours, taken from ArkhamCards' `ChaosToken.tsx`;
  - PNGs render as now.
- Every caller (stat bar, TokenStack, badges, modals, the rail, `formatText`) gets fonts automatically. `formatText` maps markup through the same table, so card text uses glyphs too.
- The unused skill, class, chaos-token and slot PNGs are removed from `public/icons` and from the extract script's copy list.
- **Transparency:** `extract-assets.sh` runs the same corner flood-fill already used for the connectors (`-fuzz 12% -fill none -draw "color … floodfill"` at the four corners) on each remaining round token PNG: damage(-3), horror(-3), clue(-3), doom(-3), resource(-1/3/5) and lead.
- **Tests:**
  - every name in `ICON_FILES` resolves either to an existing glyph in `glyphs.generated.json` or to an existing PNG;
  - every remaining PNG has a transparent top-left pixel (checked with `magick` in the asset step, and by reading the PNG alpha in a node test using `pngjs`-free raw parsing: the IHDR colour type must include alpha).

### 8. Chaos token draw

- **Where it hooks in:** into the existing event queue. The engine already emits `token` (`data.token`) and then `testResult` (`base`, `icons`, `tokens`, `tokenTotal`, `total`, `difficulty`, `success`, `skill`). The engine is unchanged; the token is already drawn by the seeded RNG when the event arrives.
- **`TokenDraw` overlay** (DOM): when `current.type === "token"` and the hand-draw setting is on, `EventPlayer` does not start its timer; the overlay takes over.
  - **Circle count:** the number of tokens in the bag at reveal time, which is `game.chaosBag.length` plus the tokens already revealed in this test if the engine holds them out.
  - **Layout:** the circles are laid out in arcs above the bag image by a pure `circleLayout(n, width)`, with a unit test that 16 and 30 circles don't overlap.
  - **Click (or Space/Enter):** that circle flies to the token slot beside `SkillTestPanel`, the bag fades, and the circle flips into `ChaosTokenIcon` (a CSS 3D flip, about 600 ms). Then `nextEvent()` runs.
- **Result panel:** the `testResult` event renders `TestBreakdown`:
  - rows built from the event data by a pure `breakdownRows(data)`, unit-tested for success, fail, auto-fail and a multi-token test;
  - a Continue button calls `nextEvent()`.
  - With the setting off, the existing timed durations apply and the panel closes by itself after 1.8 s.
- **Skips:** bot play (`autoStep`) and `skipEvents` never show the overlay, since they drain the queue directly.
- **Setting:** `drawByHand: boolean` lives in the store and is saved with the locale and privacy preferences. A menu checkbox reads "Draw chaos tokens by hand", translated.

### 9. Card backs

- `extract-assets.sh` copies the two ArkhamCards backs, mapped by artwork, since the source names are swapped compared with the printed game:
  - `inspired/ArkhamCards/assets/encounter-back.png` (sepia tentacles, 728×1024, square corners) → `public/table/back-player.png`. Corners are rounded with a mask so it matches the scans.
  - `player-back.png` (blue eclipse, 738×1048, transparent corners) → `public/table/back-encounter.png`. It replaces the 140×193 `card-back-bg`.
- In code:
  - `backTexture(kind)` loads the PNG for both kinds, and the drawn canvas back is removed;
  - the DOM piles in `PileColumn` use the same files;
  - `iconUrl("cardBack")` is retired in favour of `backUrl(kind)`;
  - an encounter card is still recognised by `isEncounterCard`.

### Changed during implementation

- **Zoom-out limit:** the far limit is "whole map in the free area" or half the default zoom, whichever is further out, so a one-room map can still zoom out.
- **HUD insets:** `HUD_INSETS` is `{ top: 60, right: 170, bottom: 380, left: 200 }`.
- **Hand fan stacking:** at rest the fan sits under the stat dock, and a hovered or focused card lifts the whole fan above everything. Otherwise a tilted edge card could cover the dock.
- **Short windows:** below 1000 px tall, the pile column uses three smaller piles per row so it clears the stat dock.
- **Stat numbers** use lining figures, because Alegreya's old-style 0 reads as an "o".
- **Rail:** the Draw button shows the player card back.
- **Encounter-set names** appear only when there is a translated name (no raw codes).
- **Marker clicks:** drei `Html` wrappers on the map now use its `pointerEvents` prop, so markers that can't be dragged don't block panning or clicks.
- **Hand hover** (user request): 1.6× instead of 2× (`HAND_HOVER_ZOOM`), about 480×672 px.
- **Stat bar** (user request): numbers 38 px (20% below the planned 48), the name 36 px, and the investigator's ability text under it with buttons for options on the investigator card. Resource and clue totals are nudged down 0.08 em so Alegreya's figures sit centred on the tokens.
- **Table background** (user request): the framed art is a fixed, full-screen CSS background behind a transparent canvas, not a WebGL plane, so it never pans or zooms. With no board edge to show where the map is, the pan clamp now keeps at least 320 px of the map (more than the act/agenda panel is wide) inside the free area between the HUD panels.
- **No hover copy for locations** (user request): they are read on the map, zoomed in as needed.
- **Hover:** a stale hover on an HTML card (one that re-rendered under the pointer) is cleared on the next pointer move outside it.

## Risks / Trade-offs

- [Glyph colours differ slightly from the printed art] → Use ArkhamCards' own colour values. The font is what that app ships.

- [Pan versus click ambiguity on cards] → A 5 px threshold, plus suppressing R3F clicks after a pan. Covered by a manual check ("Pan is not a click").
- [Auto re-centre fighting the player] → It only fires on a change of decider or location, never within 1.5 s of user input.
- [The HUD covers parts of the map] → Pan and zoom let the player move anything into the clear centre. "Focus" centres the relevant location in the free area: the focus centre is offset by the HUD insets.
- [DOM overlays for resolving cards lose the 3D flip] → A CSS flip animation keeps the feel.
- [More DOM images (strip, piles, panels)] → They use the same CDN URLs and the browser cache that the textures already warm.

## Migration Plan

- UI only. Saves are unchanged.
- Archive order: `add-core-game-engine` → `flat-hearthstone-table` → `readable-table-rework` → this change.
- Rollback means reverting the UI commit.
