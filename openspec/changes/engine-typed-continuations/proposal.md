## Why

When a rule must run after the steps it has just queued, it pushes `{ t: "Script", code: "__engine", fn: "<name>", ctx }`, and `steps/dispatch.ts` looks the name up in `ENGINE_FNS`, a `Record<string, ...>` of 19 functions. 23 pushes in the engine (22 in `rules/*`, 1 in `index.ts`) and 7 content scripts use it. The compiler checks neither the name nor the context: every entry reads its arguments as `ctx.you!`, `ctx.enemy!`, `ctx.location!`. And scripts name engine internals around `src/engine/api.ts`: `revealLocation` (`content/packs/core/scripts/01108.ts`, `01109.ts`, `content/campaigns/brethren-of-ash/scripts/queen-of-ash.ts`), `assetDefeatCheck` (`core_2026/scripts/12129.ts`, `12137.ts`, `12155.ts`) and `basicFight` (`core_2026/scripts/12001.ts`). Every other deferred rule in the engine is already a typed step kind with one handler per kind, checked by `StepHandlers`; this back channel is the one exception.

## What Changes

- **Each `ENGINE_FNS` entry becomes a step kind**, named in `STEP` (ADR-0026), typed in the `Step` union with required fields (`{ t: "RevealLocation", location }`, `{ t: "AssetDefeatCheck", inv }`, `{ t: "Elusive", enemy }`), and handled in the rules module that owns the function: `round` (Investigate, BasicFight, BasicEvade, EndTurnCleanup, GainResource, RoundCleanup, ReadyAll), `investigators` (AssetDefeatCheck, RemoveDefeatedAsset, RevealLocation, CheckEngagement, ChooseLead), `scenario` (FinishRevelation, AllEliminated, NextAgenda, NextAct), `enemies` (ExhaustEnemy, Elusive), `cards` (FinishEvent). Steps that hand their context on (FinishEvent, BasicFight, BasicEvade) carry it as `ctx`.
- **`ENGINE_FNS` and the `"__engine"` branch of the Script handler are deleted.** A `Script` step with code `"__engine"` is then a missing script and stops the engine with its name.
- **Content gets three verbs in `api.ts`** in place of the back channel: queue a location's reveal, queue the asset-defeat check for an investigator, queue a basic fight. The 7 scripts use them.
- **Same game, same replays.** Each push is replaced in place, so steps resolve in the same order; the corpus replays unchanged. No recording, save or online move holds a step (saves and the move log are setup plus choices), so `ENGINE_VERSION` stays 7.
- No behaviour change.

Assumed (to confirm with the user in grill-me): typed step kinds rather than a typed `ENGINE_FNS` registry, because the stack already routes by kind with compiler-checked handlers and a registry would keep a second dispatch and the `EffCtx` bag; one kind per function (19 new kinds, `STEP` from 52 to 71), not merged kinds, so the change is mechanical and reviewable; the api verbs queue (they don't run at once), matching what the scripts do now; `ENGINE_VERSION` is not bumped since no persisted artifact contains a step; the verbs' names may be renamed by `engine-script-verbs` into its verb set, whichever lands second adapting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: adds "Deferred engine rules are typed step kinds": no string-named back channel, a handler per kind in the owning rules module, and scripts reach deferred rules only through `api.ts` verbs.

## Impact

- `src/engine/world/types.ts` (`Step` gains 19 members), `src/engine/steps/step.ts` (`STEP` gains them), `src/engine/steps/dispatch.ts` (`ENGINE_FNS`, the `__engine` branch and 17 named function imports from rules go), `src/engine/rules/{round,investigators,scenario,enemies,cards,skillTest}.ts` and `src/engine/index.ts` (23 pushes; handlers added to each module's `handlers`).
- `src/engine/api.ts` (three verbs); 7 content scripts listed above.
- `src/engine/replays/` unchanged; the corpus is replayed, not re-recorded.
- Relates to `engine-script-verbs` (makes `Step` private to the engine; this change removes the last reason scripts build engine steps by hand for these three rules) and `engine-script-registry` (one registry for script lookup; this change takes `__engine` out of that lookup first). `engine-scenario-driver` makes it cheaper: tests asserting `Script` steps on the queue (`scriptGuards.test.ts`) are the ones that break.

## Open questions

1. One step kind per function, or fewer kinds (e.g. BasicFight and BasicEvade as one `BasicTest { kind }`, the round's cleanups as one)? Fewer kinds is a smaller `STEP`; one per function is a mechanical, checkable move.
2. Should the three api verbs land here, or should this change wait for `engine-script-verbs` and add them to its set?
3. Bump `ENGINE_VERSION` anyway, as ADR-0024 did for a storage change, so builds before and after never meet in one online room? Nothing persisted carries a step, so this change assumes no.
