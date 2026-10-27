## 1. Baseline

- [x] 1.1 Capture the "before" screenshots under `.playwright-mcp/ui-structure/before/` with a dev server on a spare port: title, new game, campaign screen, deck builder, card catalog, settings, how-to; the table in desktop and phone layouts (EN and RU), with a card hovered in hand, assets and threats in the strips, a skill test, the drawn-card showcase, an encounter reveal, the scenario introduction (story and card steps), the deck viewer and a card modal
- [x] 1.2 Record the list of class-based DOM lookups (`querySelector`, `closest`, `matches` with a `.` selector, `arrivals.ts` `SELECTORS`) as the checklist for group 2

## 2. Groundwork (global CSS still in place)

- [x] 2.1 `vite.config.ts`: `css.modules.localsConvention: "camelCaseOnly"` (Vitest needs no setting: it doesn't process CSS, so a module import returns its key names); confirm a `*.module.css` import typechecks with `vite/client` types
- [x] 2.2 Add `src/ui/components/cx.ts` (join truthy class parts) with a test
- [x] 2.3 Replace every class-based DOM lookup from 1.2 with a `data-ui` attribute on the target element and a `[data-ui="…"]` selector; update the tests that read those classes
  - Lookups (from 1.2): `arrivals.ts` `SELECTORS` (`.pile-card`, `.scenario-panel`, `.pile-column`, `.hand-fan`, `.hand-drawer`, `.play-strip`, `.st-placed`, `.encounter-showcase .sc-card`) and `FLYING` (`.flight`, `.ghost-card`, `.fan-card`, `.resolving`); `IntroOverlay` `.scenario-panel`; `PlayerBar` `.pb-sheet, .pb-avatar`; `Showcase` `.sc-card`, `.sc-flip`, `.sc-help`; `Reveal` `.sc-flip`, `.sc-help`; `Panels` `.stat-dock`; `HandFan` `.fan-flip`; `TokenDraw` `.st-subject-card, .st-subject-portrait`, `.st-strip .st-eq`; `HoverCard` `.play-strip`; `Floats` `.pb-avatar`
  - No test reads class names. Classes set imperatively (`hit-pulse`, `hit-streak` in `Floats`, `ghost-card` in `flights.ts`) take their module's names; classes in HTML strings (`g-*` from `guideText.ts`, `icon`, `svg-icon`, `gl` from `formatText`) stay global
- [x] 2.4 Add a test that fails when `src/ui` code calls `querySelector`, `querySelectorAll`, `closest` or `matches` with a class selector
- [x] 2.5 `pnpm typecheck`, `pnpm test`, `pnpm lint`; spot-check flights (play a card, draw, encounter reveal, intro deal) in the browser

## 3. Group the root by concern (moves and imports only)

- [x] 3.1 `git mv` the stores into `state/` (`context`, `store`, `view`, `layoutMode`, `usePlayers`, `players` and their tests); update imports
- [x] 3.2 `git mv` table logic into `game/` (option placement, option text, feed, instruction, arrivals, showcase, intro, card click, details, glance, glossary, intent, phases, spotlight, test screen, tips, chaos, toss, hit, hover, touch, camera, layout, ribbon, decks, guide text, with tests); update imports
- [x] 3.3 `git mv` `images`, `icons`, `sounds`, `audio`, `ruImages.generated.json` into `assets/`; update imports and any script that writes `ruImages.generated.json`
- [x] 3.4 Move `CardFace`, `ChaosToken`, `Icon`, `Portrait`, `TokenBadges`, `TokenPile`, `LangSwitch` into `components/<Name>/` folders with `index.ts`
- [x] 3.5 `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`; the root lists only folders, `App.tsx`, `styles.css`

## 4. Shared components get modules

- [ ] 4.1 For each `components/` folder: move its rules from `styles.css` into `<Name>.module.css` (only rules no other component uses), switch JSX to `styles.x` / `cx`
- [ ] 4.2 Compare screenshots for every screen that shows card faces, icons, portraits and token badges; fix differences

## 5. Catalog and dev

- [ ] 5.1 `catalog/`: `Catalog/` and `CardPage/` folders with modules; `filter.ts` and `state.ts` move with their owner or stay as catalog helpers
- [ ] 5.2 `dev/`: its component folder and module
- [ ] 5.3 Screenshots of the catalog and the dev panel match the baseline

## 6. Menus

- [ ] 6.1 Folders and modules for `Title`, `NewGame`, `CampaignScreen`, `CampaignSheet`, `DeckBuilder`, `DeckEditArea`, `FlowPrompt`, `HowTo`, `Settings`, `Avatar`, `BagCard`; helpers (`blurb`, `campaignView`, `wizard`) move with their owner
- [ ] 6.2 Decide the open question on shared menu styles (noir panels, brass plate): shared primitive in `styles.css` or a `components/` piece; record the outcome in design.md
- [ ] 6.3 Menu screenshots (desktop and phone, EN and RU) match the baseline

## 7. Scene

- [ ] 7.1 `Table/`, `CardMesh/`, `EventFx/`, `MapCamera/` folders; modules only where an HTML overlay has styles; `cardShape.ts`, `textures.ts` move with their owner
- [ ] 7.2 The table renders as before: map, cards, flips, camera buttons

## 8. HUD, in groups

- [ ] 8.1 Split `Panels.tsx` into one folder per exported component (`MiniCard`, `PlayStrip`, `ScenarioPanel`, `PileColumn`, `CardOptions` and the rest) with modules; `stripOrder`, `columnCardWidth`, `rowGap` and their tests go with `PlayStrip`
- [ ] 8.2 Hand: `HandFan` (with `fan.ts`), `HandDrawer`, `HandDetails` (with `DetailsColumn`, `LocationDetails`), `GlanceBadge`, `MulliganRow`, `HoverCard`
- [ ] 8.3 Skill test: `SkillTestScreen`, `TokenDraw` (with `tokenStack.ts`), `ChaosTokenIcon`
- [ ] 8.4 Showcase and reveal: `Showcase` (with `showcaseLayout.ts`), `Reveal`, `IntroOverlay`, `flights.ts` as a HUD helper
- [ ] 8.5 Bars and rails: `ActionRail` (with `InstructionBar`, `UndoButton`), `PlayerBar`, `Stats`, `StepCaption`, `Ribbon`, `Drawer`
- [ ] 8.6 Overlays: `Modals`, `DeckViewer`, `Investigators`, `InvestigatorChoice`, `TipLayer`, `Feed`, `Floats`, `SoundLayer`, then `Hud` itself
- [ ] 8.7 After each of 8.1–8.6: `pnpm typecheck`, `pnpm test`, compare the table screenshots (desktop and phone) for the parts moved

## 9. Global CSS and docs

- [ ] 9.1 `styles.css` holds only tokens (light and dark), resets, fonts, root layout and state classes, buttons, `g-*` guide markup, the flip card and other primitives used by several components; move or delete anything else
- [ ] 9.2 Update `AGENTS.md` (key directories, where styles go, data-attribute lookups), `.agents/context/design.md` and `.impeccable/` references to classes and `styles.css`
- [ ] 9.3 Full "after" screenshot set under `.playwright-mcp/ui-structure/after/`, compared with the baseline; no differences left
- [ ] 9.4 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm check:content`, `pnpm build` pass
- [ ] 9.5 `openspec validate ui-component-structure --type change --strict`
