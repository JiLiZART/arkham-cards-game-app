## 1. Baseline

- [ ] 1.1 Record the test count per engine test file (`pnpm vitest run src/engine --reporter=json`) and the list of engine test files naming `.queue`, `pending.step` or `skillTest =`.

## 2. The driver

- [ ] 2.1 Tests first in `src/engine/__tests__/driver.test.ts`, on The Gathering: `game` stops at Roland's first turn; `bag: ["skull"]` type-checks without a cast and every reveal is a skull; `rigBag` replaces the bag mid-game; `toTurn(r, who)` stops at that investigator's turn; `untilWindow(r, "enemyDefeated")` stops at the reaction window and `windowOf` names it; `until` throws past its cap listing the prompts seen; `investigate`, `fight`, `evade`, `move` take the action by option value; `lastTest` returns the last `testResult` event's data.
- [ ] 2.2 `src/engine/kits/driver.ts`: the functions above, `neutral`, `toTurn`, `hand`, `inPlay`, `enemyHere`, `addLocation` moved from `natkit.ts` (`natGame` becomes `game`); `natkit.ts` keeps the nat constants and `nathaniel()` over `game`; its importers updated.

## 3. Wave 1: files that redefine the driver

- [ ] 3.1 `natAssets`, `natEvents`, `natPack`: windows through `untilWindow`/`windowOf`, local `finish`/`offered` removed. One commit per file; test count unchanged.
- [ ] 3.2 `core2026`, `rulesAlign`: local `offered` removed, bags through `bag`.
- [ ] 3.3 `testSetters`: reads `currentTest(game)` instead of `game.s.skillTest`.
- [ ] 3.4 `tapDecks`, `fleshWard`, `prevent`, `brethren`, `daisy-triggers`: local `until`/`finish`/`toTurn` replaced by the driver's.

## 4. The ratchet

- [ ] 4.1 Test first: in `boundary.test.ts`, `describe("what engine tests read")` lists `STILL_READ_THE_STACK` (the files left after wave 1, `steps/__tests__/` exempt); a new file naming the stack fails, a listed file that no longer does fails.

## 5. Wave 2: `index.test.ts` by concept

- [ ] 5.1 Split `src/engine/__tests__/index.test.ts` by `describe` block into `src/engine/rules/__tests__/{round,skillTest,enemies,investigators,scenario,cards}.test.ts` on the driver; what stays engine-wide (create, dispatch, replay) stays in `index.test.ts`. Test count unchanged; files leave the ratchet's list.

## 6. Verification

- [ ] 6.1 Test counts per moved test match 1.1; the ratchet's list is shorter than 1.1's.
- [ ] 6.2 Every recording in the replay corpus reproduces its snapshot and event log (no engine change, so unchanged).
- [ ] 6.3 `pnpm typecheck`, `pnpm test`, `pnpm check:content`, `pnpm lint`, `pnpm format` (on the files this change touches only), `openspec validate engine-scenario-driver --type change --strict`.
