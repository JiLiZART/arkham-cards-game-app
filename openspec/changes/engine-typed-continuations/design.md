## Context

The resolution stack (`steps/dispatch.ts`) pops a step and calls the one handler registered for its kind; `StepHandlers` is a mapped type over `Step["t"]`, so a kind without a handler, or a handler taking the wrong step, fails to compile. 52 kinds work that way. The 53rd path does not: a `Script` step whose code is `"__engine"` is routed to `ENGINE_FNS[step.fn]`, a `Record<string, (game, ctx, step) => void>` of 19 entries in `dispatch.ts:41-79`.

Who pushes what (measured):

| Function                                                                    | Owner           | Pushed from                                                        |
| --------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| finishEvent                                                                 | cards           | cards                                                              |
| assetDefeatCheck                                                            | investigators   | investigators, cards; scripts 12129, 12137, 12155                  |
| removeDefeatedAsset                                                         | investigators   | investigators                                                      |
| revealLocation                                                              | investigators   | investigators; scripts 01108, 01109, queen-of-ash                  |
| checkEngagement                                                             | investigators   | investigators, round                                               |
| chooseLead                                                                  | investigators   | investigators                                                      |
| allEliminated                                                               | scenario        | investigators                                                      |
| finishRevelation, nextAgenda, nextAct                                       | scenario        | scenario                                                           |
| exhaustEnemy                                                                | enemies         | enemies                                                            |
| elusive                                                                     | enemies         | enemies, skillTest                                                 |
| investigate, basicFight, basicEvade, endTurnCleanup, readyAll, roundCleanup | round           | round (roundCleanup also `index.ts`); basicFight also script 12001 |
| gainResource                                                                | (inline lambda) | round                                                              |

So the review's reading ("modules that can't import a sibling without a ring post a string step") holds for one case only: `cards` queuing `assetDefeatCheck` (`investigators` imports `cards`, so the reverse import would be a ring). 22 of the 23 engine pushes queue the pusher's own function, or one it already may import: the reason is deferral (run after the windows and steps queued around it), not a ring. Rules modules already defer to each other through step kinds (`cards` queues `STEP.DiscardIfEmpty`, `round` queues `STEP.Move`), since the `Step` union sits in `world/types.ts`, below every rules module.

What the back channel costs: no compile check on `fn` or on the context (19 entries read `ctx.you!`, `ctx.enemy!`, `ctx.location!`, `ctx.source!`, `ctx.inv!`); `dispatch.ts` imports 17 rule functions besides the modules' `handlers`, so the real owner of a deferred rule is invisible from the module; content scripts name three engine internals by string, bypassing `api.ts`.

Persistence (checked): the snapshots of the replay corpus's 71 recordings end with an empty step queue and no pending choice, and no event carries a step; saves are `{ version, campaign, setup, actions }` and the online move log is choices; nothing persisted holds a step.

## Goals / Non-Goals

**Goals:**

- No string-named engine function: each deferred rule is a typed step kind with one handler in the module that owns it.
- Content queues the three rules it uses through `api.ts` verbs.
- Same resolution order, same corpus, same saves.

**Non-Goals:**

- Making `Step` private to the engine or reshaping what scripts may push (`engine-script-verbs`).
- The script lookup itself (`db.scripts[code].fns[fn]`, scenario fallback) (`engine-script-registry`).
- Merging or renaming existing step kinds; changing any rule.

## Decisions

### 1. Typed step kinds, not a typed registry

```
  Before                                             After
  rules/round.ts ---push {t:"Script",                rules/round.ts ---push {t:"BasicFight", inv,
     code:"__engine", fn:"basicFight", ctx}             enemy, ctx}
  content 12001 ----push (same, by string)           content 12001 ----api.queueBasicFight(game, you, enemy)
           |                                                  |
           v                                                  v
  +-------------------------------+                  +-------------------------------+
  | steps/dispatch.ts             |                  | steps/dispatch.ts             |
  |  STEP_HANDLERS[step.t]        |                  |  STEP_HANDLERS[step.t]        |
  |   Script -> code=="__engine"? |                  |   (spreads each module's      |
  |     ENGINE_FNS[fn](ctx)  -----+--> 17 imported   |    handlers; no rule imports) |
  |     else db.scripts[code]     |    rule fns      |   Script -> db.scripts[code]  |
  +-------------------------------+                  +---------------+---------------+
                                                                     | BasicFight
                                                                     v
                                                     +-------------------------------+
                                                     | rules/round.ts handlers       |
                                                     |  BasicFight: startTest(...)   |
                                                     +-------------------------------+
```

Component level inside the engine. Each of the 19 functions becomes a member of `Step` and of `STEP`, and a handler in its owner's `handlers` object (table above; `gainResource` goes to `round`). The handler calls the existing function with typed fields:

- ids only: `RevealLocation { location }`, `CheckEngagement { inv }`, `AssetDefeatCheck { inv }`, `RemoveDefeatedAsset { card }`, `ExhaustEnemy { enemy }`, `Elusive { enemy }`, `Investigate { inv, location }`, `EndTurnCleanup { inv }`, `GainResource { inv }`, `FinishRevelation { card, inv }`, `NextAgenda { card }`, `NextAct { card }`;
- no fields: `AllEliminated`, `ChooseLead`, `ReadyAll`, `RoundCleanup`;
- with the context they hand on unchanged: `FinishEvent { ctx }`, `BasicFight { ctx }`, `BasicEvade { ctx }` (the skill test keeps exactly the context it got, e.g. 12001's `{ you, enemy }` without `inv`).

`Elusive` and `ChooseLead` ask a choice; they pass their own step to `ask`, which re-queues it with the choice, as every asking handler does.

Rejected: a typed internal registry (`ENGINE_FNS` keyed by a closed `EngineFn` union, one `Engine` step kind). It names the functions in one place, but keeps a second dispatch inside the first, keeps the `EffCtx` bag and its non-null assertions, keeps 17 rule imports in `dispatch.ts`, and content can still construct the step while `Step` is exported. Rejected too: calling the functions directly where no ring forbids it (22 of 23); it changes resolution order (they run now instead of after the windows queued around them) and so the corpus.

### 2. One kind per function

19 new kinds, `STEP` from 52 to 71. Merging (BasicFight/BasicEvade into one, the cleanups into one) would be a smaller `STEP` but a handler with a switch, the same thing the stack does already by kind. Kept as an open question.

### 3. No Script-handler guard on the new kinds

The `Script` handler skips a script's function when its investigator has been eliminated mid-effect; the `__engine` branch returned before that check, so `ENGINE_FNS` never had it. The new handlers don't add it, so an eliminated investigator's `EndTurnCleanup` or `AssetDefeatCheck` still runs, as now.

### 4. Content verbs

`api.ts` exports `queueRevealLocation(game, location)`, `queueAssetDefeatCheck(game, inv)` and `queueBasicFight(game, you, enemy)`, each defined in its owning rules module and pushing the typed step, so a script's queuing stays where it was. The 7 scripts call them. If `engine-script-verbs` lands first, these join its verb set under its naming; if second, it renames them.

### 5. Versions

`ENGINE_VERSION` stays 7 and `replaysSave` is unchanged: no recording, save or online move contains a step (Context), and the oracle proves the rules are unchanged. The state of a game in progress does hold steps, but it is never written or sent. Rejected: a bump for symmetry with ADR-0024; it would cost nothing for saves (accepting 5..8) but would refuse rooms between builds that play identically. Kept as an open question.

## Risks / Trade-offs

- [A push moved to a typed step changes its position in a `push(game, a, b, c)` list, reordering resolution] -> each push is replaced in place, one module per commit, with the corpus replayed after each.
- [`STEP` and `Step` grow by 19 kinds] -> they are the same set the string names were; now the compiler sees them.
- [A recording made with an older build mid-game] -> none exist: the corpus records finished games only (`snapshot.ts` snapshots the final state).
- [`scriptGuards.test.ts` builds `Script` steps by hand and asserts the queue] -> it asserts content scripts, not `__engine`; nothing there names `__engine` (checked). The tests that pin `__engine` shapes are none.
- [The loop guard's trace prints `fn`] -> new kinds print their kind, which says as much.

## Migration Plan

Test first: a step pushed with code `"__engine"` throws "missing script function" (fails today, since it runs). Then per owning module (`enemies`, `scenario`, `cards`, `investigators`, `round` with `index.ts`): add the kinds to `Step` and `STEP`, the handlers, replace the pushes; corpus replayed after each. Then the api verbs and the 7 scripts; then delete `ENGINE_FNS` and the branch. Rollback is reverting the change.

## Open Questions

- One kind per function, or merged kinds (decision 2)?
- Verbs here or in `engine-script-verbs` (decision 4)?
- Bump `ENGINE_VERSION` anyway (decision 5)?
- In-force ADRs reviewed: ADR-0021..0026 and earlier; none needs revisiting. ADR-0026 is followed (new kinds in `STEP`); ADR-0025's one-way imports are kept (the new handlers sit in their owners; `dispatch.ts` only collects).
