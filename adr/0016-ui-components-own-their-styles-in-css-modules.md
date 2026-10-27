# ADR-0016: UI components own their styles in CSS Modules, one folder per component; global CSS is tokens and shared primitives only

- Status: accepted
- Date: 2026-10-27

## Context and Problem Statement

All UI styling lived in one global `src/ui/styles.css`: 6,800 lines and 568 class names, with the cascade order of that one file part of how the game looks. Finding what styles a component meant searching the whole file, any class could collide with another anywhere, and components sat next to plain logic in an 82-file `src/ui` root. How should styles be tied to the components that use them?

## Considered Options

- CSS Modules: `Component.module.css` in a folder per component, class names local and hashed, read as `styles.x`; a small global `styles.css` for tokens, resets, fonts, the root layout and state classes, and primitives shared by many components.
- Plain co-located `.css` files imported by each component, class names unchanged and still global.
- Keep the single global `styles.css`, split only into sections.
- CSS-in-JS (styled-components, vanilla-extract).

## Decision Outcome

Chosen option: "CSS Modules", because a component's styles then cannot leak into or be overridden by another's, the folder shows everything a component owns, and Vite supports it with no new dependency. Plain co-located files would group the CSS but keep every name global. CSS-in-JS adds a dependency and a runtime or build step for no gain over modules.

The root layout-mode and state classes (`.game.phone`, `.game.testing`) stay global, and modules reach them with `:global(...)`, so ADR-0005's single layout mode holds: modules add no phone or desktop breakpoints of their own. HTML produced as strings (the campaign-guide markup `g-*`) can't use modules and stays global.

### Consequences

- Good, because a component's look is in its folder, and deleting a component deletes its styles.
- Good, because class names can't collide across components.
- Bad, because code can no longer find elements by class name. Lookups (`querySelector`, `closest`, the arrival places) go through `data-` attributes instead, which every new lookup must follow.
- Bad, because the cascade between global and module rules depends on import order, so a module rule that must beat a global one has to win on specificity.
- Bad, because conditional classes need a joining helper (`cx`), and `className` strings are longer than before.
