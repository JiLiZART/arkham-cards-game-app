## 0. Baseline

- [x] 0.1 Record the corpus checksum, the replay oracle result and the full test count on the current tree; every slice below ends by matching them (oracle green, checksum unchanged, no test lost) and is one commit.

## 1. The context out of the core

- [x] 1.1 `GameContext` (today `G`, still named `G` by an alias until slice 8) declared in a new `world/types.ts` beside the state types; `types.ts` no longer imports `core.ts`, `records.ts` no longer imports `core.ts`.
- [x] 1.2 `core.ts` split into `context.ts` (emit, queue, accessors, counters, setters), `movement.ts` (createCard, moveCard, piles, shuffles, discard) and `queries.ts` (zones, map, modifiers, costs, conditions); `api.ts` and every importer follow (codemod moves, imports rewritten). A test lists the engine's import cycles and expects none.

## 2. The store: `world/`

- [x] 2.1 `git mv` `types.ts`, `records.ts` (as `store.ts`), `flags.ts`, `rng.ts` into `world/`, their tests with them; importers rewritten; the boundary test's store check takes the new path.

## 3. The resolution stack: `steps/` and `index.ts`

- [x] 3.1 `run()`, the handler table and the internal script functions to `steps/dispatch.ts` (the `Step` union stays in `world/types.ts`: the state's queue holds steps), the table typed per step kind (`{ [K in StepKind]: (game, step: Extract<Step, { t: K }>) => void }`), no `any` in it. Test first: a step kind without a handler fails the typecheck (a `@ts-expect-error` fixture).
- [x] 3.2 `rules/flow.ts` becomes `rules/round.ts`; `engine.ts` becomes `index.ts` (createGame, dispatch, replay, ENGINE_VERSION, replaysSave); importers rewritten.

## 4. Between scenarios: `campaign/`

- [x] 4.1 `git mv` `flow.ts`, `campaign.ts`, `campaignLog.ts` (as `log.ts`), `decks.ts`, `upgrade.ts` and their tests into `campaign/`; importers rewritten.

## 5. Effects by family: `effects/`

- [x] 5.1 `effects.ts` split into `effects/index.ts` (dispatch by effect `op`, `Effects`, `ArrangeTop`), `types.ts`, `targets.ts` and the families `resources`, `damage`, `tokens`, `placement`, `encounter`, `search`, `tests`, `choices`, each effect's code moved unchanged into a function over an `EffectRun`; the handler table is typed per `op`, so an effect the schema allows without a handler fails the typecheck (test first, `effects/index.test.ts`).

## 6. Events: `events/`

- [x] 6.1 `events/event.ts` holds `EVENT` and `EventType` (a leaf; `GameEvent` stays in `world/types.ts` with the log it belongs to), built from every event type the engine, the scripts and the UI's feed make; `GameEvent.type` is `EventType` and `emit` takes it. Test first: a `@ts-expect-error` fixture emitting `"attak"`; the corpus's event logs unchanged.
- [x] 6.2 Every `emit`, `type === "..."` and `case` in the engine, scripts and UI uses `EVENT` (codemod by contextual type: 288 literals), and the eight UI tables of event names are `Set<EventType>`.

## 7. The other closed sets

- [x] 7.1 `world/constants.ts`: `ZONE`, `PHASE`, `CHOICE`, `TEST_STAGE`, `INV_STATUS`, `PILE` and the remaining closed unions, each type derived from its object; `STEP` in `steps/step.ts`. Constants re-exported from `api.ts` for scripts; `isOneOf(value, ...options)` for "is it one of these" over a set's members.
- [x] 7.2 Codemod every literal whose contextual type is one of these unions to its constant, set by set (zones, then phases, steps, choices, stages, statuses, piles), in the engine, scripts and the UI; oracle after each set.

## 8. Names

- [x] 8.1 `natkit.ts`'s `game()` becomes `natGame()`; the UI's React `GameContext` becomes `GameStoreContext`.
- [x] 8.2 Codemod: `G` becomes `GameContext`, and every binding of that type named `g` becomes `game` (language-service rename, so closures and shadowing are handled), in the engine, its tests and the 100 scripts; the `G` alias goes.

## 9. Kits and guards

- [x] 9.1 `git mv` `testkit.ts` and `natkit.ts` into `kits/`; `bot.ts` stays beside `index.ts`; importers rewritten.
- [x] 9.2 The boundary test checks the layers of design decision 2 (each folder's allowed imports); `.oxlintrc.json` rules take the new paths; the UI's lint message names the new modules.
- [x] 9.3 AGENTS.md's description of `src/engine/` and its testkit path follow the new layout.

## 9b. Tests in **tests** folders (asked for after the slices)

- [x] 9.4 Every engine test moves into a `__tests__` folder in its own folder (55 tests; imports rebased); the boundary test checks that no engine test sits outside one and that they hold only tests (test first); AGENTS.md, the proposal and the design say so.

## 10. Verification

- [x] 10.1 Every recording reproduces its snapshot and event log; corpus checksum as in 0.1; replay time within 5% of 0.1's.
- [x] 10.2 Browser pass (desktop and phone): a game started, a skill test, an enemy attack, a save reloaded; the feed and sounds still react to events.
- [x] 10.3 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:content`, `pnpm format` (on the files this change touches only), `openspec validate engine-folder-structure --type change --strict`.
