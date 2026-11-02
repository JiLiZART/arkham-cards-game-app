## 1. Baseline

- [ ] 1.1 `engine-script-run-adapter` and `engine-script-registry` are applied. Replay the corpus (`pnpm vitest run src/engine/replays`): all 71 recordings pass. Record the step literals per kind and the `api.ts` names scripts import.

## 2. Verbs and `queue` (tests first, in `src/engine/__tests__/scriptApi.test.ts`, with `src/engine/kits/testkit.ts`)

- [ ] 2.1 `Queued` and `queue` in `api.ts`. Test: `queue(game, a, b)` resolves `a` before `b`, as `push` does.
- [ ] 2.2 The 20 verbs, each filling only the defaults today's literals spell out. Test per verb: the step it queues is deep-equal to the literal a script writes today (one example per kind, taken from a script).
- [ ] 2.3 Test: `Object.keys` of `api.ts` equals the pinned sorted list (fails until 4.1 lands; marked `todo` until then).

## 3. Scripts onto the verbs

- [ ] 3.1 Codemod (scratchpad, not committed) over `content/packs/core/scripts/`: `push(game, { t: STEP.X, … })` to `queue(game, x({ … }))`, imports fixed, the 2 raw `t: "Effects"` literals included. Corpus replays unchanged.
- [ ] 3.2 The same for `core_2026`, `nat`, `tcu`; corpus replays unchanged after each.
- [ ] 3.3 The same for `campaigns/night-of-the-zealot` and `campaigns/brethren-of-ash`; corpus replays unchanged after each.
- [ ] 3.4 Check none remain: no `push`, `STEP` or `Step` import in `content/**/scripts`.

## 4. The explicit list

- [ ] 4.1 `api.ts` names every export in groups; drops `export *`, `push`, `STEP`, `Step` and every name no script uses. `scriptApi.test.ts`'s pinned list is live. `pnpm typecheck` proves no script uses a dropped name.
- [ ] 4.2 Test: a script-shaped fixture queuing a step literal doesn't type-check (`@ts-expect-error`).

## 5. Verification

- [ ] 5.1 Every recording reproduces its snapshot and event log; the `unrun.ts` list is unchanged.
- [ ] 5.2 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:content`, `pnpm format` (on the files this change touches only), `openspec validate engine-script-verbs --type change --strict`.
