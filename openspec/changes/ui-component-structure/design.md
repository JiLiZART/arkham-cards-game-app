## Context

`src/ui` holds 82 files in its root plus the screen areas `hud/` (42 files), `menu/` (17), `scene/` (6), `catalog/` (5) and `dev/` (1). Components and logic sit side by side: `store.ts`, `feed.ts`, `arrivals.ts` and `optionHome.ts` next to `CardFace.tsx` and `Icon.tsx`. Some files hold many components: `hud/Panels.tsx` has `MiniCard`, `PlayStrip`, `ScenarioPanel`, `PileColumn`, `CardOptions` and more.

All styling is one global `styles.css`: 6,800 lines, 568 class names, 29 media queries, imported once by `src/main.tsx`. The cascade order of that one file is part of how the game looks. 79 rules hang off state classes on the game root (`.game.phone` 66, `.game.testing` 11, `.game:not(.phone).testing` 2). There are 620 `className` uses in JSX, and about 15 places find elements by class name: `.play-strip`, `.stat-dock`, `.scenario-panel`, `.sc-card`, `.sc-flip`, `.fan-flip`, `.st-eq`, `.pb-avatar`, `.sc-help`, and the place selectors in `arrivals.ts`. Others already use data attributes (`[data-card]`, `[data-tip]`, `[data-log]`, `[data-pile]`).

In-force ADRs that constrain this design:

- ADR-0005: layout adapts through one layout mode that components read, not per-component media queries. The phone and desktop styles stay keyed to `.game.phone` on the root.
- ADR-0002: presentation follows the animation clock. Flights and arrivals must land on the same places after the move.
- ADR-0010: dev-only tooling lives in the app behind the DEV flag. `dev/` stays a separate area.

## Goals / Non-Goals

**Goals:**

- One folder per component with its CSS Module, tests and private helpers; `index.ts` as the public path.
- `styles.css` reduced to tokens, resets, fonts, root state classes and shared primitives.
- Logic grouped by concern (`state/`, `game/`, `assets/`) and shared presentational components in `components/`.
- DOM lookups by data attribute only.
- The same look and behaviour on every screen, desktop and phone, EN and RU.

**Non-Goals:**

- Redesigning anything, renaming visible classes for taste, or changing tokens.
- Feature-Sliced Design layers. The screen areas stay as they are.
- Changing engine, content or scripts.
- New dependencies (no `clsx`, no CSS-in-JS, no PostCSS plugins).

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
                         +------------------------------------------------------------+
                         |                 Browser app (Vite, React)                  |
                         |                                                            |
  src/main.tsx --------->|  App.tsx                        styles.css (global)        |
  imports styles.css     |    |                            tokens, resets, fonts,      |
                         |    v                            .game.phone/.testing,       |
                         |  +---------+ +------+ +-------+ buttons, g-*, flip          |
                         |  |  menu/  | | hud/ | | scene/|   ^ :global(...) from        |
                         |  | Title/  | |Hand  | | Table/|   | modules only             |
                         |  | NewGame/| |Fan/  | | Card  |                             |
                         |  | ...     | |...   | | Mesh/ |  each component folder:     |
                         |  +----+----+ +--+---+ +---+---+   X.tsx + X.module.css      |
                         |       |  catalog/ |  dev/ |       + tests + index.ts        |
                         |       v         v         v                                |
                         |  +------------------------------+                          |
                         |  | components/  CardFace, Icon, |  shared presentational   |
                         |  | Portrait, TokenPile, ...     |                          |
                         |  +------------------------------+                          |
                         |       |                |                                   |
                         |       v                v                                   |
                         |  +-----------+   +----------------+   +----------------+   |
                         |  |  state/   |<--|     game/      |   |    assets/     |   |
                         |  | context,  |   | optionHome,    |   | images, icons, |   |
                         |  | store,    |   | feed, arrivals,|   | sounds, audio  |   |
                         |  | view      |   | showcase, ...  |   |                |   |
                         |  +-----+-----+   +-------+--------+   +----------------+   |
                         +--------|-----------------|-----------------------------------+
                                  v                 v
                         +------------------------------------+
                         | src/engine (rules), src/content    |  (unchanged)
                         +------------------------------------+
```

- Screen areas (`menu/`, `hud/`, `scene/`, `catalog/`, `dev/`) hold component folders. They import from `components/`, `state/`, `game/` and `assets/`, never from each other's internals.
- `game/` reads the stores in `state/`; `state/` doesn't import `game/` or any component.
- Only `styles.css` is global. Modules reach the root state classes with `:global(.phone)`.
- Assumptions: lightweight C4 rigor, matching earlier designs. The exact members of `game/` and `components/` are settled per step in the tasks.

## Decisions

### CSS Modules with camelCase locals

Component styles go in `Component.module.css`, read as `styles.fanCard`. `vite.config.ts` sets `css.modules.localsConvention: "camelCaseOnly"`, so existing kebab-case class names move over without renaming in CSS.

- Alternative: plain co-located `.css` files. Smaller diff and no JSX changes, but names stay global and collisions stay possible. Rejected by the user in favour of real isolation.
- Alternative: keep `styles["fan-card"]` with no convention setting. Works, but reads badly across 620 uses.

### Classes joined with a local `cx` helper

`components/cx.ts` exports `cx(...parts: (string | false | null | undefined)[])`, which joins the truthy parts. That replaces template strings like `` `fan-card ${legal ? "legal" : ""}` `` with `cx(styles.fanCard, legal && styles.legal)`.

- Alternative: add `clsx`. It does the same in one line of our own code, so a dependency isn't justified (AGENTS.md).

### Root state classes stay global

`.game`, `.phone`, `.testing`, and the other mode classes on the game root stay in `styles.css` and are written in JSX as plain strings. A module styles its own element under a mode as `:global(.game.phone) .drawer { … }`. This keeps ADR-0005's single layout mode. Modules MUST NOT add their own breakpoints for phone vs desktop. The few existing media queries for size (short screens, reduced motion) move with their component.

### Shared primitives stay global

Buttons (`.primary`, `.big`, `.link`), the campaign-guide markup (`g-*`, produced as HTML strings by `guideText.ts`, so it can't use modules), the flip card (`.flip`, `.flip-front`, `.flip-back`), and the card-face and token styles used by many components remain in `styles.css`. A rule moves into a module only when one component owns it.

### DOM lookups by data attribute

Each class-based lookup becomes a data attribute on the element it targets: `data-ui="play-strip"`, `data-ui="stat-dock"`, `data-ui="scenario-panel"`, and so on, with `[data-ui="…"]` selectors. `arrivals.ts`'s `SELECTORS` switches the same way. Tests that look for class names in markup use the same attributes.

- Alternative: export the module class name and query `.${styles.playStrip}`. It couples other files to a module's internals. Rejected.

### Folder per component, index as the public path

`hud/HandFan/{HandFan.tsx, HandFan.module.css, fan.ts, fan.test.ts, index.ts}`. `index.ts` re-exports the component (and anything other folders legitimately use). Multi-component files are split with the `split-react-components` approach: one exported component per folder, private sub-components may stay.

### Grouping the root

- `state/`: `context.ts`, `store.ts`, `view.ts`, `layoutMode.ts`, `usePlayers.ts`, `players.ts`.
- `game/`: `optionHome.ts`, `optionText.ts`, `feed.ts`, `instruction.ts`, `arrivals.ts`, `showcase.ts`, `intro.ts`, `cardClick.ts`, `details.ts`, `glance.ts`, `glossary.ts`, `intent.ts`, `phases.ts`, `spotlight.ts`, `testScreen.ts`, `tips.ts`, `chaos.ts`, `toss.ts`, `hit.ts`, `hover.ts`, `touch.ts`, `camera.ts`, `layout.ts`, `ribbon.ts`, `decks.ts`, `guideText.ts`.
- `assets/`: `images.ts`, `icons.ts`, `sounds.ts`, `audio.ts`, `ruImages.generated.json`.
- `components/`: `CardFace`, `ChaosToken`, `Icon`, `Portrait`, `TokenBadges`, `TokenPile`, `LangSwitch`, `cx.ts`.

Each list is a starting point. A file that turns out to belong elsewhere moves there in its step.

### Vitest and CSS Modules

Vitest runs with `css.modules.classNameStrategy: "non-scoped"`, so the class names in rendered test markup are stable and readable. Tests that assert on placement use data attributes rather than class names wherever they can.

## Risks / Trade-offs

- [Cascade order changes when one file becomes many: rules that tie on specificity can win differently] → Move one screen area per step. Take before/after screenshots of every screen in that area (desktop and phone) and fix any difference before the next step. Where a module rule must beat a global one, raise its specificity in the module rather than relying on order.
- [A class is used by two components today, through shared CSS] → Search each class across all TSX before moving its rule. A class with several owners stays global, or each owner gets its own copy in its module.
- [Class-based lookups missed during the move break flights and hover silently] → Grep for `querySelector`, `closest` and `matches` with a `.` selector before each step; the spec forbids them, and tests for arrivals and the strip cover the main flights.
- [Large import churn makes the history hard to follow] → Use `git mv` for moves and keep moves and edits in separate commits, so blame follows the files.
- [The impeccable design sidecar (`.impeccable/`, `.agents/context/design.md`) names classes and `styles.css`] → Update those references in the final step.
- [Phone layout breaks without anyone noticing] → Every step's screenshot set includes the phone layout.

## Migration Plan

1. Groundwork: Vite and Vitest module settings, `cx` helper, data-attribute lookups (still with global CSS). Ship and verify.
2. Root logic into `state/`, `game/`, `assets/`, and shared components into `components/`: moves and import updates only.
3. One screen area at a time, smallest first: `catalog/`, `dev/`, `menu/`, `scene/`, then `hud/` in groups (hand, panels and strip, skill test, showcase and reveal, overlays and modals, feed and floats). Each step: folders, CSS Modules, rules out of `styles.css`, screenshots compared.
4. Trim `styles.css` to the global set, update AGENTS.md and the design sidecar.

Each step is a separate commit that builds and passes tests, so the work can pause between steps. Rollback is reverting the step's commits; nothing persists in saved games or content.

## Open Questions

- Whether `menu/` and `catalog/` share enough styles (the noir panels, the "brass plate") to warrant a shared `components/` piece or should stay global primitives. Settle while moving `menu/`.
- Whether `scene/` needs any module at all, or keeps its few HTML overlays' styles global.
- No in-force ADR needs revisiting. ADR-0005 holds as long as modules reach phone styles through `:global(.game.phone)` and add no breakpoints of their own.
