## Why

`src/ui` has 82 files in its root, components and logic mixed together, and every style lives in one 6,800-line `styles.css` holding 568 class names. Finding what styles a component, or what a component depends on, means searching the whole tree, and any class name can collide with another anywhere in the app.

## What Changes

- Each React component gets its own folder: `Component.tsx`, `Component.module.css`, its tests, its private helpers, and an `index.ts` that is the folder's only import path.
- Component styles move out of `styles.css` into CSS Modules (`*.module.css`): class names become local to the component and are read as `styles.x` in JSX.
- `styles.css` keeps only what is global by nature: design tokens on `:root` (and the dark/light theming), resets, fonts, the shared primitives used across many components (buttons, the campaign-guide markup `g-*`, the flip card), and the layout-mode and state classes on the game root (`.game.phone`, `.game.testing`), which modules reach with `:global(...)`.
- Files that hold several components (such as `hud/Panels.tsx`) are split into one component per folder.
- The non-component files in the root are grouped by concern: `state/` (stores and view state), `game/` (option placement, feed, instruction, arrivals, showcase and other table logic), `assets/` (images, icons, sounds, audio), and `components/` (shared presentational components: `CardFace`, `Icon`, `Portrait`, `TokenPile`…). `hud/`, `menu/`, `scene/`, `catalog/` and `dev/` stay as the screen areas.
- Code that finds elements by class name (`document.querySelector(".play-strip …")`, `closest(".sc-help")`, the arrival places in `arrivals.ts`) switches to `data-` attributes, because module class names are hashed.
- No visible change: the game looks and behaves the same before and after, screen by screen.
- **BREAKING** for contributors only: import paths inside `src/ui` change.

## Capabilities

### New Capabilities

- `ui-source-layout`: how the UI source is organised. A component lives in its own folder with its own CSS Module, global CSS is limited to tokens, resets and shared primitives, and the DOM is found through data attributes, not class names.

### Modified Capabilities

None. The game's behaviour and look (`game-table-ui` and the others) do not change.

## Impact

- Every file under `src/ui` moves or has its imports updated. `src/main.tsx` still imports the global `styles.css`.
- `vite.config.ts`: CSS Modules configuration (`localsConvention: "camelCaseOnly"`, so kebab-case classes read as `styles.fanCard`).
- Tests under `src/ui` move with their code. Tests that read class names from rendered markup switch to data attributes.
- `AGENTS.md` (key directories, where styles go), `.agents/context/design.md` and `.impeccable/` surfaces that name CSS classes or files.
- No new dependencies. Joining class names uses a small local helper, not `clsx`.
- The engine, content and scripts are untouched.

## Assumptions

- Visual sameness is checked with before/after screenshots of each screen (title, new game, campaign, table in desktop and phone layouts, skill test, showcase, intro, catalog), not with a pixel-diff tool.
- The 3D table (`scene/`) has little CSS; its folders get a CSS Module only where it has styles.
- The work lands in steps that each build, pass tests and look the same, one screen area at a time, so it can stop between steps.
