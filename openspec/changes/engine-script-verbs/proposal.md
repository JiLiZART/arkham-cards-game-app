## Why

`src/engine/api.ts` is what card and scenario scripts may import, but it is 21 lines of `export *` over `context.ts` (85 exports in 442 lines), `movement.ts` (8), `queries.ts` (45), `events/event.ts`, `steps/step.ts` and `world/constants.ts`, plus about 20 named exports: roughly 175 names, of which the 100 script files use 90. So the script surface is whatever those modules happen to export, including state-level lookups meant for the UI (`cardOf`, `pileMap`, `patchedState`). Scripts also queue engine steps by writing the step objects themselves: 125 `t: STEP.<Kind>` literals and 2 raw `t: "Effects"` across 20 step kinds (`Script` 19, `Spawn` 12, `AssignDamage` 12, `Effects` 12, `Eff` 10, `AdvanceAct` 10, `PlaceDoom` 8, `Resolution` 7, `Draw` 7, `CheckDoom` 5, `Revelation`, `EnemyAttack`, `DiscoverClues`, `DamageEnemy` 4 each, `Defeated` 3, `PlayCard` 2, `UseAbility`, `Move`, `DefeatEnemy`, `CheckObjectives` 1 each), through 110 `push` calls. Every required field of those step types (`AssignDamage` needs `direct` and `source`, for example) is part of the content contract, so reshaping a step means editing content.

## What Changes

- **Intent verbs.** `api.ts` gains one verb per step kind scripts queue: `runScript`, `spawn`, `dealDamage`, `resolveEffects`, `resolveEffect`, `advanceAct`, `placeDoom`, `endScenario`, `drawCards`, `checkDoom`, `resolveRevelation`, `enemyAttacks`, `discoverClues`, `damageEnemy`, `defeatInvestigator`, `playCard`, `useAbility`, `moveInvestigator`, `defeatEnemy`, `checkObjectives`. Each takes named arguments with today's defaults and gives an opaque `Queued` value; `queue(game, ...queued)` puts them on the stack, the first to resolve first, as `push` does now.
- **An explicit export list.** `api.ts` names every export; no `export *`. It keeps the reads, setters, `emit`/`EVENT`, `flags`, `ZONE`, `CHOICE` and the other names scripts use, adds the verbs and `queue`, and drops what scripts don't use, including `push`, `STEP`, the `Step` type and the UI's state-level lookups.
- **The step union is engine-private.** Scripts can't name a step kind or a step's fields; a new step field, or a renamed one, changes the verb at most.
- **The surface is pinned.** `src/engine/__tests__/scriptApi.test.ts` (which already checks the read accessors) lists `api.ts`'s runtime exports and checks each verb queues the step it names.
- Every script under `content/` moves from `push(game, { t: STEP.… })` to `queue(game, verb(…))`; a mechanical rewrite per step kind.
- No behaviour change: the corpus replays unchanged; the state's shape doesn't change.

Overlap with `engine-typed-continuations` (ADR-0033): 7 of the 19 `Script` literals use `code: "__engine"` to name an engine function (`revealLocation`, `assetDefeatCheck`, `basicFight`). That change turns those into typed step kinds with their own verbs; whichever lands second takes the other's verbs into the export list, and `runScript` here covers only real script functions.

Depends on `engine-script-run-adapter` (a script's step and choices come from its run, so scripts no longer need `Step` or `ask(game, step, …)`) and on `engine-script-registry` (`runScript` resolves the function through the registry's one rule). Neither is repeated here.

Assumed (to confirm with the user in grill-me):

- Verbs build a step and `queue` pushes, rather than each verb pushing at once. Pushing at once would make the last verb called resolve first (the stack's order), the opposite of reading order, and 8 scripts push several steps in one call today; a rewrite to `queue(game, a(…), b(…))` keeps every order exactly.
- Verbs are module functions in `api.ts` taking `game`, like the existing `addCounter(game, …)`, not methods on the run.
- One verb per step kind scripts use today, no more; a new kind gets a verb when a script needs it.
- `runScript` takes the run (to carry its context) or an explicit context, a function name and `args: unknown`; typing continuation arguments is `engine-typed-continuations`' scope.
- The verbs sit in `api.ts` itself rather than a new module: they are short builders over `world/` types and `STEP`, and `api.ts` is their only exporter (only `content/**/scripts` imports it).
- The 85-export `context.ts` is not split here: the explicit list narrows what scripts see, and splitting the core is a separate refactor.

## Open questions

1. Builders plus `queue`, or verbs that push at once with the stack's last-in-first-out order documented?
2. Should verbs also exist on the run (`run.dealDamage(…)`) so a script never passes `game` and the source is filled in from the run?
3. Should the export list drop the reads scripts use only once or twice (about 30 of the 90), or keep every name in use today?
4. Is a test listing runtime exports enough, or should the type exports be pinned too (an `api.d.ts` snapshot)?

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: "Scripts use the engine API" states that `api.ts` lists its exports by name, that scripts queue engine steps only through its verbs, and that step kinds and step fields aren't part of it.

## Impact

- `src/engine/api.ts` (explicit list, verbs, `queue`, `Queued`); `src/engine/__tests__/scriptApi.test.ts`; the 100 files under `content/packs/*/scripts/` and `content/campaigns/*/scripts/` (imports and the 127 step literals).
- No engine module besides `api.ts` changes; the boundary test's layer for `api` (7) already allows it to import everything it needs.
- The replay corpus (71 recordings) is the proof and doesn't change.
