## Why

The engine's tests drive games by hand. `src/engine/kits/testkit.ts` (117 lines) gives `start`, `skipMulligans`, `pick`, `mutate`, `giveCard` and `putEnemy`; everything past that is rewritten per file. Measured in `src/engine/**/__tests__`: 39 rigged chaos bags written `chaosBag: [...] as never` across 15 files; 29 lines of hand-written "answer until the turn prompt" loops, plus local `toTurn`, `finish` and `until` helpers in 7 files; `fresh`, `gameOf` and `offered` redefined in 12 files; 12 lines in 4 files read `pending.step` to find a reaction window; 46 lines in 16 files read or write `queue` or `skillTest` directly (`scriptGuards.test.ts` 10, `index.test.ts` 8, `testSetters.test.ts` 5). Those tests pin the step stack's shape, so every change to it (`engine-typed-continuations`, `engine-script-verbs`) breaks tests that test nothing about it. `natkit.ts` already holds a good start (`neutral`, `toTurn`, `natGame`, `inPlay`, `enemyHere`) used by only the nat tests.

## What Changes

- **A scenario driver in `src/engine/kits/driver.ts`.** Free functions over a `Result`, in the style of `pick`: `game({ scenario, investigators, seed, bag, prep })` starts at the first turn; `rigBag(r, tokens)` sets the chaos bag typed as `ChaosToken[]`; `toTurn(r, who?)`, `until(r, stop)`, `untilWindow(r, trigger)` answer neutrally until a condition; `offered(r, label)`, `windowOf(r)`, `lastTest(r)` read prompts and events; `investigate`, `fight`, `evade`, `move`, `play`, `use` take an action from the turn prompt by intent. `natkit.ts`'s generic helpers move into it; `natkit.ts` keeps the nat pack's constants.
- **Tests assert prompts, events and views.** A test reads `state.pending` (kind, investigator, option labels), `state.log` and the core's lookups (`cardOf`, `invOf`, `currentTest`); it does not read or write `queue`, `pending.step` or `skillTest`. Only the driver, `mutate`, and the step stack's own tests (`steps/__tests__/`) may.
- **A ratchet in `boundary.test.ts`.** A check lists the engine test files that still name `.queue`, `pending.step` or assign `skillTest`; the list may only shrink. No big-bang rewrite.
- **Incremental migration, first wave.** The driver lands with the files that duplicate it most: `natAssets`, `natEvents`, `natPack`, `core2026`, `rulesAlign` (local `offered`/`finish`, `pending.step` windows), `testSetters` (assigns `skillTest`), `tapDecks`, `fleshWard`, `prevent`, `brethren` (local `until`/`finish`). `index.test.ts` (1,019 lines) is then split by concept into `rules/__tests__/`. `scriptGuards.test.ts` migrates with `engine-script-run-adapter`, which changes how a script is called.
- No engine behaviour change; the replay corpus is untouched.

Assumed (to confirm with the user in grill-me): free functions over `Result` rather than a driver object, since `pick`/`toTurn` already chain that way and AGENTS.md asks for existing patterns; the driver lives in `kits/` because `boundary.test.ts` allows only tests in `__tests__`; the ratchet is a test, not a lint rule (oxlint has no rule for "this file names this property"); UI tests (`src/ui/game`, 21 files importing the testkit) stay as they are; `dispatch.test.ts` keeps asserting the queue, since the stack is what it tests; files are regrouped only when migrated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: adds "Engine tests drive games through the scenario driver": tests read prompts, events and views, never the step stack, and a ratchet keeps the exceptions from growing.

## Impact

- New `src/engine/kits/driver.ts`; `kits/natkit.ts` shrinks to constants and nat-specific setup; `kits/testkit.ts` keeps setup (`setup`, `start`, `pick`, `mutate`, `giveCard`, `putEnemy`).
- `src/engine/__tests__/boundary.test.ts` gains the ratchet.
- First wave: 10 test files in `src/engine/__tests__/`; then `index.test.ts` split into `src/engine/rules/__tests__/*.test.ts`. 25 other engine test files untouched until they are next edited.
- Depends on nothing; makes `engine-typed-continuations` and `engine-script-verbs` cheaper, since fewer tests pin step shapes.

## Open questions

1. A driver object (`const s = scenario(...); s.fight("Ghoul")`) instead of free functions over `Result`? It reads better but is a pattern the tests don't use yet.
2. Should the ratchet also cover `src/ui/game` tests, or only the engine's?
3. Split `index.test.ts` in this change, or leave it for when its tests are next touched?
4. Should the driver's actions match options by intent (`fight(r, "Ghoul Minion")`) or keep label regexes (`pick(r, /Fight Ghoul/)`)? Intent survives label and translation changes; regexes are what tests use now.
