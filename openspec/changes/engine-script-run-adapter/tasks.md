## 1. Baseline

- [x] 1.1 Replay the corpus on the current engine (`pnpm vitest run src/engine/replays`) and record that all 71 recordings pass and the `unrun.ts` list; record the counts this change removes (`ctx.you!`, `ctx.source!`, `step!`, guards after `ask`, `any` in `world/types.ts`).

## 2. The run and the adapter (tests first, `src/engine/rules/__tests__/scripts.test.ts`, with `src/engine/kits/testkit.ts`)

- [x] 2.1 Types: `ScriptRun` and `ScriptFn = (game, run: ScriptRun) => void` in `world/types.ts`; the `Script` step's `args` and the run's `args` are `unknown`. Tests: a script queued with an empty context gets the lead as `you`; reading `source` with none throws an error naming `code.fn`.
- [x] 2.2 `resolvesFor(game, ctx)` in `context.ts`; `effHandler` uses it. Test: a Script step for an investigator defeated by an attack of opportunity doesn't call its function.
- [x] 2.3 `rules/scripts.ts`: `runScript` (builds the run, applies the guard, catches the private `Waiting` signal) and the Script step handler, moved from `steps/dispatch.ts`; `__engine` functions stay in dispatch. Tests: a choice verb with two options leaves a pending choice and nothing after it runs; with one option it continues without one; `{ auto: false }` with one option still asks; the pending choice's `step` equals the Script step.
- [x] 2.4 `chooseCard`, `chooseInvestigator`, `choose` on the run (labels from names, `prompt` text and key passed through unchanged). Export `ScriptRun` from `api.ts`.
- [x] 2.5 The token `run` in `rules/skillTest.ts` and the setup step `script` in `index.ts` call `runScript` with a synthetic Script step. Test: a choice verb from them throws. `pnpm typecheck` and the boundary test pass.

## 3. Scripts onto the run

- [x] 3.1 Run the codemod (scratchpad, not committed) over every `fns` member under `content/packs/*/scripts/` and `content/campaigns/*/scripts/`; narrow the six self-typed `args` by hand; update tests that call script functions directly (`scriptGuards.test.ts`). Corpus replays unchanged.
- [x] 3.2 Replace `ask` + guard with the choice verbs in `content/packs/core/scripts/`; the asks without `auto: true` get `{ auto: false }`. Corpus replays unchanged.
- [x] 3.3 The same for `core_2026`, `nat`, `tcu`; corpus replays unchanged after each.
- [x] 3.4 The same for `campaigns/night-of-the-zealot` and `campaigns/brethren-of-ash`; corpus replays unchanged after each.
- [x] 3.5 Check none remain: no `ctx.you!`, `ctx.source!`, `step!` or guard after a choice in `content/**/scripts`; no `any` in the script types.

## 4. Verification

- [x] 4.1 Every recording reproduces its snapshot (pending choice included) and event log; the `unrun.ts` list is unchanged from 1.1.
- [x] 4.2 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:content`, `pnpm format` (on the files this change touches only), `openspec validate engine-script-run-adapter --type change --strict`.
