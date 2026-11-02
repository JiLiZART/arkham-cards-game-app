## Why

`src/engine/` has grown to 16 source files and 45 tests side by side at its top level, beside a `rules/` folder and `replays/`. Which file holds what is hard to find. Two files are called `flow.ts`: one is the campaign flow, the other the round flow. The type file imports the biggest module (`types.ts` imports `G` from `core.ts`), and `core.ts` and `records.ts` import each other. `core.ts` (1,064 lines) mixes the engine context, card movement, queries, modifiers, costs and conditions, and `effects.ts` (1,353 lines) is one switch of 62 effect kinds. The engine context's type is the one-letter `G`, its parameter `g` (about 490 functions). Event types are free strings (99 `type === "..."` comparisons that no compiler checks), and zones, phases, step kinds and choice kinds are written as bare string literals at hundreds of sites. The engine is now an entity component store for its data (ADR-0021 to ADR-0024); its folders and names should make it as easy to read as its data is to store.

## What Changes

- **Folders by game concept.** The engine is arranged in folders: `world/` (the store's types, tables, views and piles, flags, the random generator), `steps/` (the resolution stack: the step union, its typed handler table, and the handlers by topic: round, skill test, enemies...), `rules/` (game predicates and helpers), `effects/` (the effect handlers, split by family), `events/` (the event catalogue), `campaign/` (the campaign flow, log, decks, upgrades), `kits/` (test and bot helpers) and `replays/`. The entry point is `index.ts`; `api.ts` stays the one module card scripts import.
- **`core.ts` split** into the context (`context.ts`: the engine context, emit, queue and accessors), card movement (`movement.ts`) and queries (`queries.ts`: zones, map, modifiers, costs, conditions), so no module imports a module that imports it.
- **Readable names.** The engine context's type `G` becomes `GameContext` and its parameter `g` becomes `game`, in the engine and in every card and scenario script. The UI's React context of the same name becomes `GameStoreContext`.
- **Constants for every string set.** Zones, phases, step kinds, choice kinds, skill test stages, event types and the other closed sets of strings become `const` objects (`ZONE.Enemy`, `PHASE.Mythos`, `STEP.DrawEncounter`, `EVENT.Attack`...), each with its type derived from the object, and every site uses them. Event types become a closed set: emitting an event type that isn't in the catalogue fails the typecheck. The step handler table is typed per step kind, without `any`.
- **Tests move with their modules**, into a `__tests__` folder in each engine folder (`world/__tests__/`, `steps/__tests__/`…; the top-level ones in `src/engine/__tests__/`).
- **No behaviour change**: every recorded game replays to its stored snapshot and event log after every slice. Saves are unaffected (the state's shape doesn't change; `ENGINE_VERSION` stays 7).

Decided with the user (explore session): `GameContext` for the type and `game` for the parameter, scripts included; constants for every string set, not only the unchecked ones; tests beside the code (changed later by the user: each engine folder keeps its tests in `__tests__`); one change, delivered in slices with the replay oracle green after each.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: "Scripts use the engine API" names the core's modules and the context by their new paths and names; a new requirement makes event types a closed, checked set.

## Impact

- Every module under `src/engine/` moves or is renamed (with `git mv`); `core.ts` and `effects.ts` are split.
- About 60 card and scenario scripts under `content/**/scripts` (the parameter rename and constants; they keep importing only `api.ts`).
- Imports of the engine from `src/ui`, `src/net`, `src/content` and `scripts/` (84 import `types`, 47 `core`, 38 `testkit`, 21 `records`), the boundary test, the `.oxlintrc.json` rules that name engine paths, AGENTS.md's description of `src/engine/`, and `src/ui/state/context.ts` (the React context's name).
- The renames and constants are applied by codemods (ts-morph), not by hand; the diff is large but mechanical, and the replay oracle checks each slice.
- New ADR for how the engine is organised.
