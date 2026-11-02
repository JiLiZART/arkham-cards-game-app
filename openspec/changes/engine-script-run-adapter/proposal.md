## Why

Effect handlers get a resolved run (`EffectRun` in `src/engine/effects/types.ts`: the step, the investigator `you` falling back to the lead, the source card `src`), built once in `effHandler` (`src/engine/effects/index.ts:68`). Script functions get the raw pieces instead: `ScriptFn = (game, ctx: EffCtx, args?: any, step?: Step) => void` (`src/engine/world/types.ts:505`), called by `scriptHandler` (`src/engine/steps/dispatch.ts:81`). So every script resolves them by hand: across the 100 files in `content/packs/*/scripts/` and `content/campaigns/*/scripts/` there are 109 `ctx.you!`, 42 `ctx.source!`, 48 `step!`, 34 `_args: unknown` placeholders, 36 `if (<choice> === undefined) return` re-entry guards after an `ask` (20 of them named `pick`), and 26 copies of the option map `ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id }))`. `args?: any` breaks the AGENTS.md rule against `any`, and the eliminated-investigator guard is written twice (`scriptHandler` and `effHandler`). A non-null assertion that is wrong today fails later and far from the script that made it.

## What Changes

- **A script run.** A script function is `(game, run: ScriptRun) => void`. The run carries `you` (always set: the context's investigator, else the lead, as `effHandler` does), `source` (the source card's id; reading it when the step has none throws an error naming the script and function), `step` (always set), `ctx` (the rest of the context: enemy, location, card, key, x, token…) and `args: unknown`.
- **Choice verbs on the run.** `run.chooseCard(ids, prompt)`, `run.chooseInvestigator(invs, prompt)` and `run.choose(options, prompt)` build the options (label from the card's or investigator's name), ask the run's investigator, pick a single option on their own unless told `{ auto: false }`, and return the chosen value. `ask` stays exported for the cases the verbs don't cover.
- **One adapter owns re-entry.** When a choice verb has to wait for the player, the adapter ends the script there and the step is run again with the choice, as today; script code after a verb only runs with a value, so the 36 guards go.
- **One eliminated guard.** "An investigator eliminated mid-effect resolves nothing more of it" is one function, called by the effect runner and the script adapter.
- **Every script call goes through the adapter.** The Script step, the token effect's `run` in `rules/skillTest.ts:476` and the scenario setup step `script` in `index.ts:184` all call the adapter, the only code that builds a run.
- **No `any`.** `ScriptFn` and the `Script` step's `args` are `unknown`.
- All script functions under `content/` move to the new signature; most of the move is mechanical (a one-off codemod, not committed), the choice verbs replace `ask` by hand, a folder at a time.
- No behaviour change: the recorded corpus replays to the same snapshots and event logs. Not **BREAKING** for saves: the state's shape doesn't change.

Assumed (to confirm with the user in grill-me):

- Script hooks (`hooks.*`) keep their current signature here; `engine-script-registry` gives each hook its own typed signature. `conditions`, `icons`, `modifiers` and the other script members are untouched.
- The adapter ends a waiting script by throwing a private signal it alone catches, rather than by keeping `T | undefined` returns or turning scripts into generators. Behaviour is the same: today the guard returns at once, and the step is re-run from the top when the choice arrives either way.
- Verbs auto-pick by default because 35 of the 49 `ask` calls in scripts pass `auto: true`; the other 14 pass `{ auto: false }`, so no recorded choice disappears.
- `run.source` throws rather than being `InstId | null`, because 42 of the 74 reads assert it today; `ctx.source` stays readable for the scripts that test it.
- Scripts' own continuation arguments (a script pushing a `Script` step with `args`) stay `unknown` here; their typing is left to `engine-typed-continuations`.
- The engine's own `__engine` functions (`ENGINE_FNS` in `steps/dispatch.ts`) are not scripts and keep their shape.

## Open questions

1. Is throwing a private "waiting" signal acceptable as a new pattern in the engine, or should choice verbs keep returning `T | undefined` with the guard in the script?
2. Should `run.source` throw when absent, or should scenario scripts and card scripts get different run types so the compiler knows which have a source?
3. Should the verbs default to auto-picking a single option, or should every call say so?
4. Does the codemod plus a hand pass over the `ask` calls land as one change, or should the signature change and the verb pass be two changes?

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: a new requirement, "Script functions receive a resolved run", states what a script function is given and that choices, the auto-pick and the eliminated guard are the engine's, not the script's.

## Impact

- `src/engine/world/types.ts` (`ScriptFn`, `ScriptRun`, the `Script` step's `args`), a new `src/engine/rules/scripts.ts` (the adapter and the Script step handler, moved from `steps/dispatch.ts`), `src/engine/effects/index.ts` (the shared eliminated guard), `src/engine/rules/skillTest.ts`, `src/engine/index.ts`, `src/engine/api.ts` (exports `ScriptRun`), `src/engine/__tests__/boundary.test.ts` only if the new module needs placing (it falls in `rules/`).
- Every script function under `content/packs/*/scripts/` and `content/campaigns/*/scripts/`; tests that call script functions directly (`scriptGuards.test.ts`).
- The replay corpus (`src/engine/replays/corpus/`, 71 recordings) is the proof and doesn't change.
- `engine-script-registry` and `engine-script-verbs` build on this change.
