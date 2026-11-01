## 1. Replay oracle (phase 0)

- [x] 1.1 `scripts/record-games.ts` (`pnpm record:games`): the recipes (every hand-written scenario with one, two and four investigators, fixed seeds; one Night of the Zealot campaign run through the campaign flow), bot `autoPlay` to the end or a choice cap, writing setup, choices, final state and events per game under `src/engine/replays/`.
- [x] 1.2 A state and event-log comparison that reports the first differing path and the first differing event. Tests first.
- [x] 1.3 `replays.test.ts`: replay every recorded game and compare; never writes files. Record the corpus on the current engine, commit it, test green.
- [x] 1.4 A check listing card scripts no recorded game runs; cover each listed script with a hand-written replay test before its migration in group 3.
- [x] 1.5 A seed search (`pnpm search:games`) over scenario and team templates with the random player, keeping each seed whose game runs a script the corpus doesn't; the kept seeds committed in `src/engine/replays/coverage.json` and recorded with the rest; `unrun.ts` shrunk to what no seed reaches.

## 2. Accessors in the core (phase 1)

- [x] 2.1 Pile helpers in `core.ts` (`putOnTop`, `putUnder`, `shuffleInto`, `takeTop`) with `moveCard` as the single writer; tests first (zone and pile always agree). Replace the 20 direct pile writes in `effects.ts`, `rules/scenario.ts` and `01145.ts`.
- [x] 2.2 Counter accessors (`counter`, `addCounter`, `setCounter`) for cards and investigators; move engine modules to them.
- [x] 2.3 `src/engine/flags.ts`: a typed helper per key family (the 17 per-entity prefixes and the 9 global keys), owning the key formats; move engine modules and `campaign.ts` to them.
- [x] 2.4 Skill-test setters for the fields scripts change (`extraReveal`, `onChoose` and the rest found by search).
- [x] 2.5 Remove the unused `Choose` step kind and the stale "immer draft" comment in `core.ts`.
- [x] 2.6 Replay corpus green after each of 2.1 to 2.5.

## 3. Scripts on the API

- [x] 3.1 Type the script context: `ScriptFn`, `conditions`, `icons`, `modifiers`, `extraPlayable`, `blanks`, `extraActionCost`, `wouldPlaceDoom` take `G` instead of `any`; re-export the new accessors from `api.ts`.
- [x] 3.2 Move `content/packs/core/scripts` off `g.s`; corpus green.
- [x] 3.3 Move `content/packs/core_2026/scripts` off `g.s`; corpus green.
- [x] 3.4 Move `content/packs/tcu/scripts`, `nat` and the scenario scripts (Brethren and the rest) off `g.s`; corpus green.
- [x] 3.5 The oxlint override for `content/**/scripts/**` refusing `.s` on the engine context; `pnpm lint` clean.

## 4. Verification

- [x] 4.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` (the replay corpus included), `pnpm check:content`, `pnpm format`.
- [x] 4.2 `openspec validate engine-replay-oracle-and-seam --type change --strict`.
