## 1. Baseline

- [x] 1.1 Record the corpus checksum and confirm every recording replays; list the 23 engine pushes and 7 scripts naming `"__engine"` (`rg '__engine' src content`).

## 2. The back channel refused (test first)

- [x] 2.1 In `src/engine/steps/__tests__/dispatch.test.ts`: a queued `Script` step with code `"__engine"` and fn `revealLocation` throws "missing script function __engine.revealLocation" (fails until 6.1).
- [x] 2.2 In `dispatch.test.ts`, `@ts-expect-error` pins: a `RevealLocation` step without `location`, and a `BasicFight` step without `ctx`, fail to type-check.

## 3. Step kinds per owning module (corpus replayed after each)

- [x] 3.1 `enemies`: `ExhaustEnemy { enemy }`, `Elusive { enemy }` in `Step` (`world/types.ts`) and `STEP`; handlers in `rules/enemies.ts`; pushes in `enemies.ts` and `skillTest.ts` replaced in place.
- [x] 3.2 `scenario`: `FinishRevelation { card, inv }`, `AllEliminated`, `NextAgenda { card }`, `NextAct { card }`; pushes in `scenario.ts` and `investigators.ts`.
- [x] 3.3 `cards`: `FinishEvent { ctx }`; push in `cards.ts`.
- [x] 3.4 `investigators`: `AssetDefeatCheck { inv }`, `RemoveDefeatedAsset { card }`, `RevealLocation { location }`, `CheckEngagement { inv }`, `ChooseLead`; pushes in `investigators.ts`, `cards.ts`, `round.ts`.
- [x] 3.5 `round`: `Investigate { inv, location }`, `BasicFight { ctx }`, `BasicEvade { ctx }`, `EndTurnCleanup { inv }`, `GainResource { inv }`, `RoundCleanup`, `ReadyAll`; pushes in `round.ts` and `index.ts`.

## 4. Content verbs

- [x] 4.1 Tests first (in `src/engine/__tests__/scriptApi.test.ts`): `queueRevealLocation`, `queueAssetDefeatCheck`, `queueBasicFight` each queue their step; Trapped (01108) still reveals the Hallway with the same events.
- [x] 4.2 The verbs in their owning rules modules, exported from `api.ts`; `content/packs/core/scripts/01108.ts`, `01109.ts`, `content/packs/core_2026/scripts/12001.ts`, `12129.ts`, `12137.ts`, `12155.ts` and `content/campaigns/brethren-of-ash/scripts/queen-of-ash.ts` use them; corpus replayed.

## 5. Coordination

- [x] 5.1 If `engine-script-verbs` has landed, name the verbs by its convention; if `engine-script-registry` has landed, confirm its lookup has no `__engine` case left.

## 6. Removal

- [x] 6.1 Delete `ENGINE_FNS`, the `"__engine"` branch of the Script handler and the 17 rule-function imports from `steps/dispatch.ts`; 2.1 passes; `rg '__engine' src content` finds nothing outside the test.

## 7. Verification

- [x] 7.1 Every recording in the corpus reproduces its snapshot and event log; checksum unchanged from 1.1; `ENGINE_VERSION` still 7.
- [x] 7.2 `pnpm typecheck`, `pnpm test`, `pnpm check:content`, `pnpm lint`, `pnpm format` (on the files this change touches only), `openspec validate engine-typed-continuations --type change --strict`.
