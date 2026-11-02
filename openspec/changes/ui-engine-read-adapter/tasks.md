## 1. The read entry point, test first

- [ ] 1.1 `src/engine/__tests__/read.test.ts`: start a scenario with the test kit; `readGame(db, s)` answers each method with what the wrapped query gives on `{ s, db, events: [] }`; `investigatorSummary` for Roland with 2 damage and 1 horror is health 7/9, sanity 4/5, hand limit 8, his four skills; calling every method on a deep-frozen state throws nothing.
- [ ] 1.2 `src/engine/read.ts`: explicit re-exports of the lookups over a state and of the campaign reads the menus use, `readGame` and `GameReader`, `investigatorSummary`; no `export *`. Passes 1.1.
- [ ] 1.3 `boundary.test.ts`: `read` joins the top layer with `api`, `bot`, `campaign/` and `kits/`; the layer and ring tests pass.

## 2. One summary, no hand-built contexts

- [ ] 2.1 Test first in `src/ui/state/players.test.ts` and `src/ui/hud/Stats/stats.test.ts`: for the same state, `barModel` and `invNumbers` give equal health, sanity and maximums.
- [ ] 2.2 `invNumbers` (`Stats.tsx`) and `barModel` (`players.ts`) read `investigatorSummary`; the health and sanity maths leave both.
- [ ] 2.3 `testScreen.ts`, `details.ts`, `intent.ts`, `ScenarioPanel.tsx`, `assets/sounds.ts` call `readGame`; their `{ s: game, db, events: [] }` and local `gOf` go. The 5 test files that build a context use `readGame` or the test kit. `grep -rn "events: \[\]" src/ui` finds only the store's dispatch result and `feed.ts`'s bursts.

## 3. Imports through `read.ts`

- [ ] 3.1 `src/ui/engineImports.test.ts` (written failing): non-test files under `src/ui` import from `src/engine/` only `index`, `read`, `bot`, `world/types`, `campaign/types`, `world/constants`, `events/event`; `src/ui/state/store.ts` may also import `campaign/*`. It names each offending file.
- [ ] 3.2 Rename `engine/context` imports to `engine/read` area by area (`hud/`, `scene/`, `game/`, `state/`, `menu/`, `assets/`, `catalog/`, `dev/`), then the `queries`, `rules/*` and menus' `campaign/*` imports; `pnpm typecheck` after each area. 3.1 passes.

## 4. Verification

- [ ] 4.1 Browser pass on a dev server of your own (`pnpm dev --port 5174`, Playwright, screenshots under `.playwright-mcp/`): stat bar and player bar after Roland takes damage, the avatar sheet, an enemy's intent badge, the skill-test screen's parts, the scenario panel's doom and clue cost, the deck builder's validation. Stop the server.
- [ ] 4.2 `pnpm lint:fix`, `oxfmt` on the files this change touches only, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `openspec validate ui-engine-read-adapter --type change --strict`.
