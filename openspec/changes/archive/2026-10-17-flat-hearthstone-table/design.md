## Context

The table built in `add-core-game-engine` (`src/ui/scene/Table.tsx`) uses a `PerspectiveCamera` at about 55° with drei `MapControls`. The fanned hand is drawn as 3D cards tilted toward the camera, and stats are drawn as emoji in `TopBar`. Screenshots from that change show the problems: small, blurry card text; a hand cut off at the bottom; dragging a card panned the camera. The user chose to keep three.js but make the view flat, and to move the hand into a Hearthstone-style HTML fan that enlarges on hover.

Assets available:
- `inspired/icons` has 32 named images for skills, `wild`, classes, damage/horror tokens, the clue coin, the doom token, the resource token, chaos tokens (skull, cultist, tablet, elder thing, elder sign, auto-fail, ±1) and slots. It also has about 100 numbered crops of the booklet, which are not used.
- The Learn to Play PDF's play-area spread is one 2288×1463 parchment image with a faint pentagram (page 4, image 0, found with `pdfimages -list`).

## Goals / Non-Goals

**Goals:**
- Fixed top-down orthographic board that fits any desktop window. There are no camera controls.
- A readable hand with Hearthstone fan behaviour, built as DOM so the text is sharp.
- One icon vocabulary used everywhere: board token badges, stat bar, plaques, skill test panel, card text.

**Non-Goals:**
- A pure-DOM board (rejected by the user).
- Touch or mobile layouts.
- Changes to the engine or rules.

## Decisions

### 1. Orthographic camera fitted to a "safe rect"
`<OrthographicCamera makeDefault>` is placed straight above the board (`position [0, 30, 0]`, looking at the origin with `up = [0, 0, -1]` so −z is screen-up). `MapControls` is removed.
- A small hook, `useFitBoard`, reads the canvas size and works out the free screen area: the canvas minus the top bar, the right-hand prompt panel and the hand band. It sets the camera `zoom` so the board rect fills that area, and shifts the camera's x/z so the board centre sits in the middle of it. It re-runs on resize.
- The board rect is about 26×16.6 world units, which matches the parchment's 1.56 aspect ratio.

*Alternative:* keep the perspective camera and point it straight down. Rejected: perspective still shrinks cards at the edges, and the zoom-to-fit calculation is harder.

### 2. Parchment board mesh
- A single plane the size of the board rect, textured with `public/table/parchment.jpg`. It replaces `Felt`.
- Outside the board, the page background is a dark CSS colour with a vignette.
- The parchment is light, so connection lines switch to dark sepia. Labels (`pile-label`) keep their dark pills so they stay readable on it.

### 3. Hand leaves WebGL: `HandFan` (DOM)
- `layout()` stops placing hand cards. The viewer's hand becomes a pile only for other players' areas.
- `HandFan` renders the viewer's hand as `<button>` cards. Each shows the card image, or a CSS text fallback when the image fails, reusing `faceLines`.
- The fan geometry comes from a pure function, `fanLayout(n, width)`, which returns `{x, y, rotate}` per card. The spread is ±18°, the arc drop grows with distance from centre, and the overlap step is `min(130, (width − cardW) / (n − 1))`. That keeps at least 40 px of every card visible up to 12 cards at 1280 px.
- On hover or focus, a card gets `rotate(0) translateY(−X) scale(≈1.9)`, so it is about 300 px tall at 1080p, and it is brought to the top of the stack.
- Click, Enter, or dragging more than 110 px upward on a playable card calls the existing `choose(play option)`. If the card has several options, the existing popup menu opens.
- Privacy: the fan reads the same `handVisible()` as today, so it renders nothing until the hand-off is confirmed.

*Alternative:* keep the hand in WebGL and add a DOM zoom. Rejected: the text is still blurry, and drag and hover fight with raycasting.

### 4. Icons
- A script copies the named icons into `public/icons/` with stable names and extracts the parchment into `public/table/`:
  - `scripts/extract-assets.sh` runs `cp` with renames, plus `pdfimages -f 4 -l 4` and `magick … -quality 82`.
  - The outputs are committed, so builds never need `inspired/`.
- `src/ui/icons.ts` is the only mapping:

  ```
  health→damage-token-one, sanity→horror-token, damage→damage-token-one, horror→horror-token,
  clue→evidence-coin, doom→doom-token, resource→resource-one, willpower|intellect|combat|agility|wild,
  guardian|seeker|rogue|mystic|survivor (class-*), skull|cultist|tablet|elderThing|elderSign|autoFail (token-*),
  "+1"|"-1" (chaos-token-plus/minus-one), slots (slot-*)
  ```

- There is no art for actions, reactions, fast, uses, or numeric tokens other than ±1. These use styled glyphs (➤ ↺ ⚡) or a generic token disc with the number.
- `<Icon name size title />` renders an `<img>`. On error it swaps to a text badge of the same size, so the layout doesn't shift.
- `formatText` (Hud) maps `[skill]`, `[token]` and `[class]` markup to `<Icon>`-equivalent inline `<img>` tags, and keeps glyphs for markup that has no art.

### 5. Stat bar & plaques
- `StatBar`, bottom-left above the hand band, for the viewing investigator:
  - a circular portrait (the investigator card image cropped with `object-position`), name and class icon;
  - health and sanity as remaining/max;
  - resources, clues and actions;
  - a skill row with the 4 skill icons and current values from `skillValue()`.
- `PlayerPlaques` shows a compact plaque for each other investigator with an active marker. **Changed during implementation:** the plaques sit in the top bar instead of a top-left column, which would have covered the other investigators' board areas.
- `TopBar` keeps the scenario, agenda doom, act clues and the menu buttons, now with icons instead of emoji. The skill-test panel moved into the right column above the prompt so it no longer covers the scenario row.
- Value changes flash: a tiny `useFlash(value)` hook adds a CSS class for 600 ms when a number changes.

### 6. Board layout re-tune
- The `VIEWER` area moves up, since the hand band is now outside the board.
- The other investigators' column stays on the left, under the plaques.
- Card scale goes up about 15%, since flat orthographic loses nothing to perspective.
- `layout.test` keeps the no-overlap check. A fit test asserts every placement lies inside the board rect.

## Risks / Trade-offs

- [Board cards are still WebGL textures, so small text stays soft.] → Mitigation:
  - Fit-to-window makes cards larger than now.
  - Turn anisotropy to max and generate mipmaps.
  - Hover always opens the large HTML zoom.
- [Parchment is bright and could clash with the dark HUD.] → Mitigation:
  - Darken the edges in the texture with a vignette.
  - Keep the HUD panels dark with gold borders, as the booklet does.
- [Icon art is FFG property.] → It stays personal-use like the card scans. The README notes this.
- [Removing camera controls removes zoom for small screens.] → Fit-to-window covers desktop sizes. Small screens are out of scope (non-goal).

## Migration Plan

UI only. Saves and engine state are unchanged, so an in-progress save resumes in the new view. Rollback means reverting the UI commit; no data migration is needed.
