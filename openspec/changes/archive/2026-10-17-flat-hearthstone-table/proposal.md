## Why

The current table uses a tilted perspective camera that pans and zooms. Cards are small and hard to read, the hand sits low and is partly cut off, and stats are shown as emoji text. Players want a flat, Hearthstone-like screen. It should have a fixed top-down view, a readable fanned hand, and the game's real iconography and table art taken from the rules booklet (`inspired/icons`, `inspired/AHC01_Learn_to_Play_RU_2020_1.pdf`).

## What Changes

- **BREAKING (UI only):** the 3D table switches to a fixed top-down orthographic camera. There is no perspective tilt, pan, zoom or rotation. All cards lie flat, and the board scales to fit the window.
- The table surface becomes the parchment play-area background from the Learn to Play booklet (the pentagram spread), extracted into a game asset.
- The player's hand moves out of WebGL into an HTML overlay: a Hearthstone-style fan along the bottom edge. Hovering lifts a card to full readable size. Click or drag up to play.
- A Hearthstone-style stat bar for the viewing investigator, plus compact stat plaques for the other investigators. They show health, sanity, resources, clues, actions and skills with the official icons from `inspired/icons`, replacing emoji and text.
- Tokens on cards (damage, horror, clues, doom, resources, uses) use the token art from `inspired/icons`. Chaos-token reveals and results use the chaos-token icons (skull, cultist, tablet, elder thing, elder sign, auto-fail, +1/−1).
- Card text in the zoom panel and prompts renders `[icon]` markup with the skill, action and chaos icons instead of letters.
- Icon assets are copied from `inspired/icons` into a served folder under readable names, with one mapping file. Nothing at runtime reads from `inspired/`.

Non-goals: new rules or engine changes; a pure-DOM board, because three.js stays (user decision); mobile or touch layout; re-drawing card faces (scans and the drawn fallback stay as they are).

## Capabilities

### New Capabilities

- `game-iconography`: the icon set and table art (where the assets come from, the token/stat-to-icon mapping, the fallback when an icon is missing) and the rule that all stats and tokens on screen use these icons.

### Modified Capabilities

- `game-table-ui`: table layout changes to a fixed top-down orthographic board with the parchment background. Card interaction changes to the HTML hand fan with hover enlarge. Hot-seat no longer says "camera focus"; the viewer switch swaps the hand and stat bar instead.

## Impact

- `src/ui/scene/*`: camera and controls replaced; felt plane replaced by a textured parchment board; hand cards no longer rendered in WebGL; token badges switch to icon images.
- `src/ui/layout.ts`: world-to-screen fit for a fixed orthographic camera; the hand removed from 3D layout; a reserved bottom band for the hand fan.
- `src/ui/hud/*`: new `HandFan`, `StatBar` and `PlayerPlaques` components; icon-aware text formatting; `TopBar` slimmed down.
- New assets: `public/icons/*.png` (about 40 files, renamed), `public/table/parchment.jpg` (extracted from the PDF), `src/ui/icons.ts` mapping.
- Depends on `add-core-game-engine`, which defines the `game-table-ui` spec. Archive that change first so the MODIFIED requirements apply cleanly.
- Licensing: icon and booklet art are FFG property, so this stays a personal-use asset like the card scans.
