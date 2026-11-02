## Why

The engine finds card and scenario scripts by indexing `game.db.scripts` itself, in 24 places across 12 engine files: `queries.ts` (4), `rules/scenario.ts` (5), `rules/skillTest.ts` (2), `rules/cards.ts` (2), `index.ts` (2), `steps/dispatch.ts`, `rules/enemies.ts`, `rules/round.ts`, `rules/investigators.ts`, `effects/choices.ts`, `effects/search.ts`, `effects/damage.ts`, plus `replays/corpus.ts`, which lists the function members as strings (`SCRIPT_FNS`, `SCRIPT_FN_MAPS`). Outside the engine, `src/content/loader.ts:320` and `src/ui/hud/ActionRail/ActionRail.tsx:122` index it too. "The card's own function, else the scenario's" is written three ways (`steps/dispatch.ts:90`, `queries.ts:502`, `effects/choices.ts:73`) and a fourth, looser, in the loader. `hooks` is `Partial<Record<string, ScriptFn>>` (`world/types.ts:503`): a misspelt hook name type-checks and never runs, two hooks pass results back by mutating their argument (`spawnRedirect` sets `ctx.location`, `healHorror` lowers `req.n`), `searched` is only tested for presence and never called, and `allEliminated` is called by the engine but defined by no script.

## What Changes

- **One registry module**, `src/engine/world/scripts.ts`: the only code that reads `db.scripts`. It gives a card's or scenario's script, a script function by the one fallback rule (the card's own, else the current scenario's), a condition by the same rule, and each non-function member (`abilities`, `icons`, `modifiers`, `blanks`, `extraPlayable`, `extraActionCost`, `wouldPlaceDoom`).
- **Typed hooks.** `ScriptHooks` names every hook the engine fires (`setup`, `checkObjectives`, `ended`, `allEliminated`, `spawnRedirect`, `gameEnd`, `eventFinished`, `healHorror`, `searched`), each with its own signature; `hooks?: Partial<ScriptHooks>`. A misspelt or unknown hook name fails the typecheck. `spawnRedirect` returns the location and `healHorror` returns the horror left to heal instead of mutating their argument; `searched` becomes `cancelsSearch: true`.
- **Hooks fire through the adapter.** `rules/scripts.ts` (from `engine-script-run-adapter`) gains `fireScenarioHook` and `fireCardHook`; the 10 hook call sites use them. "When the game ends" (`gameEnd`) fires through one function for both of its triggers, the scenario's resolution and an investigator's elimination, each passing its own cards.
- **No other way in.** A boundary test refuses `db.scripts` outside the registry, the content loader (which fills it) and tests; the loader's reference check, the replay tracer's member list and the action rail use the registry's names.
- No behaviour change; the corpus replays unchanged, and the state's shape doesn't change.

Depends on `engine-script-run-adapter`: that change owns the script run, the adapter (`runScript`) and the routing of the three direct script-function calls through it; this change only changes how the function is found, and adds hooks to the adapter. It doesn't repeat that scope.

Assumed (to confirm with the user in grill-me):

- Hook names stay as they are except `searched`, which is a flag, not a function; renaming the others only churns content.
- Hooks get a run without a step or choice verbs (`HookRun`: `you`, `source`, `ctx`), since no hook can wait for a choice today (they are called outside a step).
- The registry is a set of functions over `game` and `db`, not a class or a cache: `db.scripts` is a plain record loaded once, and a lookup is one property read.
- The registry sits in `world/` (layer 0), where reading `game.s.scenarioId` is allowed (ADR-0022) and every layer can reach it; calling a function stays in `rules/scripts.ts` (layer 3), which every caller of a script function or hook already sits at or above.
- `allEliminated` is kept in `ScriptHooks` though no script defines it yet: the engine's fallback (resolution `none`) is its documented default.
- Card scripts and scenario scripts keep one `CardScript` type; splitting it is left open.

## Open questions

1. Should `CardScript` split into card, investigator and scenario script types, so a scenario-only hook on a card script fails the typecheck too?
2. Should hooks get the full script run (with choice verbs and a step), which would let a hook ask, or stay without a step as today?
3. Should the boundary rule be a boundary test (as for the store's records) or an oxlint `no-restricted-syntax` rule?
4. Should the content loader's reference check use the in-game fallback rule exactly (card, else this card's scenario) instead of "card, else any scenario"? Stricter, but it may report references that resolve today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: a new requirement, "Scripts are found and called through one registry", states the one fallback rule, typed hook names, hooks returning their results, and that nothing else reads the loaded scripts.

## Impact

- New `src/engine/world/scripts.ts`; `src/engine/world/types.ts` (`ScriptHooks`, `HookRun`, `CardScript.hooks`); `src/engine/rules/scripts.ts` (hook firing); the 24 lookups in `queries.ts`, `rules/{scenario,skillTest,cards,enemies,round,investigators}.ts`, `index.ts`, `steps/dispatch.ts`, `effects/{choices,search,damage}.ts`; `src/engine/replays/corpus.ts` (member list); `src/content/loader.ts` (reference check); `src/ui/hud/ActionRail/ActionRail.tsx` (script abilities); `src/engine/__tests__/boundary.test.ts`.
- Content: the 14 script files with `hooks` (`spawnRedirect` in `the-midnight-masks.ts`, `searched` in Dead Ends (`core_2026/scripts/12006.ts`), `healHorror` in `tcu/scripts/05008.ts`, and the rest's signatures); `scriptGuards.test.ts`, which calls `hooks.gameEnd` directly.
- The replay corpus (71 recordings) and its `unrun.ts` list are the proof and don't change.
