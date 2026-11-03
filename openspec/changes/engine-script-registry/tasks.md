## 1. Baseline

- [x] 1.1 `engine-script-run-adapter` is applied (`runScript` in `rules/scripts.ts` is the only caller of `fns`). Replay the corpus (`pnpm vitest run src/engine/replays`): all 71 recordings pass; record the `unrun.ts` list and the 24 `db.scripts` reads in `src/engine`.

## 2. The registry (tests first, `src/engine/world/__tests__/scripts.test.ts`, with `src/engine/kits/testkit.ts`)

- [x] 2.1 `world/scripts.ts`: `scriptOf`, `scriptFnFor` and `conditionFor` (card, else the current scenario), `scriptFnIn` (over a list of scenarios, for the loader), member getters, and `SCRIPT_MEMBERS` checked against `keyof CardScript`. Tests: a card's own function wins; a function only the scenario has is found; neither gives `undefined`; the same for conditions.
- [x] 2.2 Members onto the registry: `queries.ts` (`blanks`, `abilities`, `modifiers`), `rules/skillTest.ts` (`icons`), `rules/cards.ts` (`extraPlayable`), `rules/round.ts` (`extraActionCost`), `rules/scenario.ts` (`wouldPlaceDoom`), `ActionRail.tsx` (`abilities`). Corpus replays unchanged.
- [x] 2.3 Conditions (`queries.ts`) and functions (`effects/choices.ts`, `runScript`) onto the one rule; the loader's check onto `scriptFnIn`; `traceScripts` walks `SCRIPT_MEMBERS`. Corpus replays unchanged; unrun list unchanged.

## 3. Typed hooks

- [x] 3.1 `ScriptHooks`, `HookRun` and `cancelsSearch` in `world/types.ts`; `hooks?: Partial<ScriptHooks>`. Test (type-level, `expectTypeOf` or a `@ts-expect-error` line): a hook named `checkObjective` doesn't compile.
- [x] 3.2 `fireScenarioHook`, `fireCardHook` and `fireGameEnd` in `rules/scripts.ts`. Tests: `spawnRedirect` returning a location spawns the Ghoul Priest at Your House in The Midnight Masks; `healHorror` from two cards lowers the heal in `allCards` order; `gameEnd` fires for an eliminated investigator's weaknesses and at the resolution for cards in play, threat area and hand.
- [x] 3.3 The 10 hook call sites (`rules/scenario.ts` ×4, `rules/investigators.ts`, `rules/cards.ts`, `rules/enemies.ts`, `effects/search.ts`, `effects/damage.ts`, `index.ts`) and the 14 scripts with `hooks` move to the typed hooks (`spawnRedirect` and `healHorror` return their results; `searched` becomes `cancelsSearch: true`); `scriptGuards.test.ts` fires `gameEnd` through `fireGameEnd`. Corpus replays unchanged.

## 4. Nothing else reads the scripts

- [x] 4.1 `boundary.test.ts`: no `db.scripts` outside `world/scripts.ts`, `src/content/loader.ts` and tests, under `src/`, `content/` and `scripts/`. Test first (fails on today's tree), then passes.

## 5. Verification

- [x] 5.1 Every recording reproduces its snapshot and event log; the `unrun.ts` list is unchanged from 1.1.
- [x] 5.2 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:content`, `pnpm format` (on the files this change touches only), `openspec validate engine-script-registry --type change --strict`.
