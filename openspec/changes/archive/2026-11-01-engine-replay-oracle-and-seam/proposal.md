## Why

The engine is meant to move to an entity component system (ADR-0021): a typed, JSON-plain component store in place of the fat `CardInst`, the duplicated zone bookkeeping and the string-keyed `flags` bag. That move touches the state shape everything reads, so it needs two things first. A way to prove a refactor changed nothing, and one place where the state shape is known, so later phases change `core.ts` instead of a hundred scripts at a time.

Today neither exists. No recorded games are committed, so "replays unchanged" is checked only by the few hand-written replay tests. And 62 of the 100 card scripts read `g.s` directly (about 40 write it), 20 places write the pile arrays behind `moveCard`'s back, and 86 sites read or write `g.s.flags` by string key.

## What Changes

- **Replay oracle (phase 0).** A committed corpus of recorded games (setup plus choices): bot-played runs of every hand-written scenario with a spread of investigator mixes, and a few full campaign runs. A test replays each one and compares its final state and event log with a stored copy. Regenerating the stored copies is an explicit script, never a side effect of running the tests.
- **State seam (phase 1).** Every read and write of card tokens, piles, zones and flags goes through accessor functions in the engine core:
  - piles move only through `moveCard` and a small set of pile helpers (top of deck, put under, shuffle into); the 20 direct array writes go;
  - card counters (damage, horror, clues, doom, uses, resources) through `counter` / `addCounter` / `setCounter`;
  - flags through typed helpers per key family (`noReady`, `attacked`, `prevented`, `aside`, `costMod` and the rest), with the key strings in one module;
  - the skill test through named helpers for the fields scripts set (`extraReveal`, `onChoose` and the like).
- **Script API.** `CardScript` and `ScriptFn` take a typed engine context instead of `any`, and scripts import state access only from `src/engine/api.ts`. A lint rule refuses `g.s` in `content/**/scripts`.
- Dead code found on the way: the `Choose` step kind is declared and never created; it goes.
- No behaviour change: every recorded game replays to the same state and log before and after.

Assumptions recorded (not yet answered in the exploration): the migration's goal is maintainability of card behaviour and state, not performance, so modifier caching waits for phase 4; the choice of ordered piles (an order field versus an index of ordered arrays) is deferred to the phase 2 change and its own ADR.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: "Deterministic, serializable game state" gains the recorded-game corpus as its proof, and a new requirement keeps card and scenario scripts on the engine API.

## Impact

- `src/engine/core.ts` (accessors), `src/engine/types.ts` (typed script context, `Choose` removed), `src/engine/api.ts`, every module that writes piles, counters, flags or skill-test fields: `effects.ts`, `rules/*.ts`, `flow.ts`, `campaign.ts`.
- `content/packs/*/scripts/*.ts`: 62 scripts move from `g.s` to the API.
- New: `scripts/record-games.ts` (writes the corpus), `content/replays/` or `src/engine/replays/` (the corpus and its stored results), a replay test, an oxlint rule for scripts.
- `src/ui` and `src/net` are untouched: they read state but are not part of this seam (a later change).
- `ENGINE_VERSION` stays: the state shape does not change in this change.
