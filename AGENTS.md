# Instructions for AI Agents

This file provides guidance for AI coding agents (Claude Code, Cursor Agent, Copilot Workspace, Windsurf, etc.) operating on this codebase.

## Project Context

Arkham Table is a browser version of _Arkham Horror: The Card Game_ on a 3D table. 1–4 investigators play hot-seat on one device, in English or Russian. It ships the Night of the Zealot campaign and the core investigators' starter decks; other packs, investigators and campaigns are imported and measured for completeness. Fan project for personal use, deployed to GitHub Pages (https://arkham.artkost.dev). [README.md](README.md) is the full reference.

Key directories:

- `src/engine/` — the rules engine, plain TypeScript. Deterministic: a seed plus the list of choices replays a game exactly. Must not import React, three, zustand or `src/ui` (enforced by oxlint, `.oxlintrc.json`).
  - `rules/` — flow, skill tests, cards, enemies, investigators, scenario, chaos tokens.
  - `effects.ts` — the effect handlers card data refers to; `api.ts` — what card and scenario scripts may import.
- `src/content/` — zod schemas (`schema.ts`), the loader, i18n (`i18n.ts`), coverage and content checks.
- `src/ui/` — the screen areas: the React HUD (`hud/`), menus (`menu/`), the react-three-fiber table (`scene/`), the card catalog (`catalog/`) and dev-only tools (`dev/`); each component in a folder of its own. Beside them `components/` (shared presentational components such as `CardFace` and `Icon`), `state/` (the stores), `game/` (table logic: option placement, feed, arrivals, showcase) and `assets/` (images, icons, sounds). `styles.css` is the global base layer (ADR-0016).
- `content/` — game data. Adding cards and scenarios needs no engine change.
  - `packs/<pack>/cards.generated.json` is imported from ArkhamDB: never edit it by hand. `cards.json` holds hand-written behavior, merged over it by card code. `scripts/<code>.ts` covers what the data format can't express.
  - `campaigns/`, `investigators/`, `decks/`, and the `*-generated/` folders the import scripts write.
  - `i18n/<locale>/` — UI strings and card text; English is the fallback.
- `scripts/` — import, check and asset scripts, run with `tsx`.
- `adr/` — architecture decisions. Read the relevant ADR before changing what it covers.
- `openspec/` — specs (`specs/`) and change proposals (`changes/`).
- `inspired/` — untracked source material (ArkhamDB snapshot, ArkhamCards, rulebooks, art). Builds never read it.

## Rules for AI Agents

### DO

- Help the human contributor understand code and debug issues
- Suggest improvements that follow existing patterns in the codebase
- Write tests for new and existing functionality
- Use oxfmt for formatting and oxlint for linting (not ESLint/Prettier/Biome)
- Follow the existing commit convention: `type(scope): description` (see [.agents/skills/git-conventions/SKILL.md](.agents/skills/git-conventions/SKILL.md)); commit on the current branch unless the user asks to use a feature branch. Scopes used here: `engine`, `content`, `ui`, `openspec`, `agents`; leave the scope out when a change spans several.
- When creating a requested branch, use a descriptive prefix such as `feature/`, `bugfix/`, or `chore/`; never use `codex/`.
- Respect TypeScript strict mode — never use `any`; use `unknown` only for untyped input (parsed JSON, `value` fields) and narrow it before use
- Put every user-facing string in `content/i18n/{en,ru}/ui.json`, in both locales, and read it with `t(db, locale, key, vars)` from `src/content/i18n.ts`. Card text comes from `cardText()`. Engine prompts carry a `key` that the UI translates.
- Keep game state in the engine and screen state in the zustand stores (`useGame` in `src/ui/state/context.ts`, `useView` in `src/ui/state/view.ts`); what is being looked at is view state, what is being decided is game state (ADR-0004)
- When verifying UI in the browser, start your own dev server on another port (`pnpm dev --port 5174`) and stop it when done; port 5173 is the user's. Drive it with Playwright and save screenshots under `.playwright-mcp/`. In dev, `window.__arkham` is the game store and `window.__arkhamView` the view store.
- Test engine and content changes with vitest. `src/engine/testkit.ts` starts a scenario (`start`, `skipMulligans`), picks options by label (`pick`), and edits the table (`mutate`, `giveCard`, `putEnemy`).
- Check rules questions against the Arkham Grimoire, the engine's rules reference (ADR-0015)
- Give a new component its own folder under its screen area: `Name.tsx`, `Name.module.css`, its tests and an `index.ts`, imported as the folder. Its styles go in its CSS Module (`styles.x`, joined with `cx()` from `src/ui/components/cx.ts`); `styles.css` takes only tokens, resets, root state classes and primitives several components share. Reach another component's element only through a public hook class listed at the top of `styles.css`, as `:global(.name)` (ADR-0016)
- Find rendered elements by `data-testid`, never by class name (CSS Modules hash class names; `src/ui/noClassLookups.test.ts` enforces it)

### DON'T

- Generate entire pull requests autonomously
- Open issues based on static analysis without human verification
- Refactor code without prior discussion with maintainers
- Add new dependencies without justification
- Introduce patterns that don't already exist in the codebase without discussion
- Submit code that the human operator cannot explain or modify
- Edit generated files (`*.generated.json`, `content/*-generated/`, `content/coverage.json`) by hand; rerun the script that writes them

### Code Quality Checklist

Before the human submits your work, ensure:

- [ ] `pnpm lint:fix` and `pnpm format:fix` have been run
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` and `pnpm check:content` pass
- [ ] Changes are tested (manually at minimum, automated tests preferred)
- [ ] PR description explains _what_ and _why_, not just _how_

## Tech Stack Quick Reference

- TypeScript (strict), React 18, Vite
- three + @react-three/fiber + @react-three/drei for the table
- zustand for UI state, zod for content schemas
- vitest for tests, oxlint and oxfmt, tsx for scripts
- pnpm 11, Node 22; deployed by `.github/workflows/deploy.yml` to GitHub Pages

## Commands

```bash
pnpm install
pnpm dev                     # dev server (agents: --port 5174)
pnpm test                    # vitest: engine, content and UI-logic tests
pnpm typecheck
pnpm lint / pnpm lint:fix    # oxlint
pnpm format / pnpm format:fix  # oxfmt: check / write
pnpm check:content           # validate everything under content/
pnpm coverage                # rewrite content/coverage.json after content changes
pnpm build                   # typecheck + production build
pnpm fetch:cards dist        # download card scans into a build
pnpm import:cards | import:i18n | import:investigators | import:campaigns  # regenerate imported content
```

Pass script arguments without `--` (`pnpm fetch:cards dist`); pnpm forwards a `--` to the script.

## App architecture

- **Engine.** `createGame(db, setup)` and `dispatch(db, state, action)` in `src/engine/engine.ts` return a new state plus events. The engine runs a stack of steps until it needs a decision, then sets `state.pending`: a prompt with options. The only action is choosing an option, so a game is its seed plus the list of choices (the Debug panel's report replays it).
- **Content.** Cards are data first: abilities, costs, triggers and effects in `cards.json`, interpreted by `rules/cards.ts` and `effects.ts`. A card the data can't express gets a script in `content/packs/<pack>/scripts/<code>.ts`, importing only from `src/engine/api.ts`. Scenarios and campaign guides are data plus scripts in the same way (ADR-0007, ADR-0011).
- **Coverage.** A card "works" when every printed line is accounted for (ADR-0013). `pnpm coverage` computes it into `content/coverage.json`, and `check:content` fails when that file is stale (ADR-0012).
- **UI.** `src/ui/state/context.ts` holds the game store. Each pending option is placed on screen by `optionHome()` (`src/ui/game/optionHome.ts`): hand, board, strip, rail, bar, skill-test panel or showcase. Animations follow the event clock, and choices wait while events play (ADR-0002). One layout mode, desktop or phone, is read by the components (ADR-0005).

## Agent workflows

- Skills live in `.agents/skills`, one source for every harness. `pnpm skills:link` links each into `.claude/skills`; run it after adding or renaming a skill. A real directory there is a harness-specific install and is kept: `impeccable` (its Claude build) and the `openspec-*` skills (written by the OpenSpec CLI). Edit a linked skill in `.agents/skills`, never through the link.
- New features start with an OpenSpec change: propose with the `openspec-propose` skill (`/opsx:propose`), implement with `/opsx:apply`, archive with `/opsx:archive`. Bug fixes don't need one. Follow [openspec-git-discipline](.agents/skills/openspec-git-discipline/SKILL.md) and the rules in `openspec/config.yaml`.
- For architecture decisions, add an ADR in `adr/` with the [architectural-decision-records](.agents/skills/architectural-decision-records/SKILL.md) skill.
- On request, use [simplify](.agents/skills/simplify/SKILL.md) or [code-simplifier](.agents/skills/code-simplifier/SKILL.md) for scoped review and cleanup, and [deslop](.agents/skills/deslop/SKILL.md) for AI-flavored code and prose.
- UI design work goes through [impeccable](.agents/skills/impeccable/SKILL.md); the design context is `.agents/context/design.md` and `.agents/context/product.md`, with the sidecar `.impeccable/design.json`.
- Anti-slop rules initially report warnings so existing code can be inventoried without a bulk refactor. Resolve findings in new or modified code; promote rules only after reviewing their existing violations.
- Tests sit next to the code as `*.test.ts`. Tests under `src/engine/` follow the engine's import rule; a test that also checks UI placement goes in `src/ui/`.

### Which skill when

| When                                         | Skill                                                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Committing                                   | `commit` for the commit itself, `git-conventions` for message and branch naming (`type(scope): description`)                                                                                                        |
| A new feature                                | `openspec-propose` → `openspec-apply-change` → `openspec-archive-change`, with `openspec-git-discipline`; `openspec-explore` to think one through first, `openspec-update-change` / `openspec-sync-specs` to revise |
| Specs written as executable acceptance tests | `spec-as-source`, `gherkin-authoring`, `acceptance-test-authoring`                                                                                                                                                  |
| Wording in specs, ADRs and tasks             | `glossary`                                                                                                                                                                                                          |
| Logic changes and bug fixes                  | `test-driven-development` (vitest, `src/engine/testkit.ts`)                                                                                                                                                         |
| An architecture decision                     | `architectural-decision-records` (MADR minimal, in `adr/`); `c4-diagrams` to draw it                                                                                                                                |
| Stress-testing a plan before building        | `grill-me`                                                                                                                                                                                                          |
| HUD, menus, any screen design                | `impeccable` (design context in `.agents/context/`); `web-design-guidelines` to review UI for accessibility and UX                                                                                                  |
| React components                             | `vercel-react-best-practices`, `vercel-composition-patterns`, `you-might-not-need-an-effect` (no `useEffect` for derived state); `split-react-components` when a file holds several components                      |
| The 3D table (`src/ui/scene/`)               | `react-three-fiber`, plus the `threejs-*` skill for the topic: fundamentals, interaction, animation, lighting, materials, shaders, textures                                                                         |
| Driving the app in a browser                 | `agent-browser`, or Playwright as in "DO" above                                                                                                                                                                     |
| Cleanup, on request only                     | `simplify` (a diff), `code-simplifier` (recently changed code), `deslop` (AI-flavored code and prose)                                                                                                               |
| Structure reviews, on request only           | `improve-codebase-architecture` (reads `adr/` here); `feature-sliced-design` only if moving to FSD is discussed: the codebase is laid out by engine / content / ui, not FSD layers                                  |
