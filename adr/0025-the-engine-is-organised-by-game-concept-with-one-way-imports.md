# ADR-0025: The engine is organised by game concept, with one-way imports

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

`src/engine/` holds 16 source files and 45 tests at its top level beside `rules/` and `replays/`. Two files are named `flow.ts` (the campaign flow and the round flow). The type module imports the largest module, and the core and the store import each other. `core.ts` mixes the engine context, card movement, queries, modifiers, costs and conditions; `effects.ts` is one switch of 62 effect kinds. The data side is an entity component store (ADR-0021 to ADR-0024), but the behaviour side is a resolution stack of steps run when a choice allows, not a per-tick scheduler. How should the engine's modules be arranged so a reader finds a rule where its game concept is, and so the arrangement stays as the engine grows?

## Considered Options

- By game concept, with one-way imports: `world/` (the store's types, tables, views, piles, flags, generator), `context`, `movement` and `queries` over it, `rules/` slices (round, cards, investigators, enemies, scenario, skill test, tokens), each holding its step handlers and the helpers it shares, `effects/` by effect family, `steps/` (the typed dispatch; the step union stays with the state it is queued in), `events/` (the event catalogue), `campaign/`, `kits/`, `replays/`; each layer imports only the layers under it, checked by a test.
- ECS-library folders: `components/`, `systems/`, `resources/`, `events/`.
- By kind of code: `handlers/`, `helpers/`, `types/`, with every rule split across them.
- Leave the flat layout and only split the two largest files.

## Decision Outcome

Chosen option: "by game concept, with one-way imports", because a rule's step handlers and the helpers other rules call belong together (as in the Haskell Arkham engine's per-concept modules and ECS "plugins"), the store stays a layer with no game rules in it, and stated import directions remove today's cycles and keep new ones out. ECS-library folders would call step handlers "systems", which they are not: they run when the stack reaches them, not every tick (ADR-0021). Splitting by kind of code scatters one rule over three folders. Splitting only the largest files leaves the cycles and the name collision.

### Consequences

- Good, because a reader finds enemy rules in `rules/enemies.ts`, an effect in its family's file, and the store in `world/`.
- Good, because the import graph is acyclic and a test refuses an upward import.
- Good, because card and scenario scripts still import only `api.ts`, so the move doesn't reach their imports.
- Bad, because every engine module and many importers outside the engine change paths at once; history follows only through `git mv`.
- Bad, because the layer test is one more rule to keep up to date when a folder is added.
- Follow-up: phase 4 of ADR-0021 (queries by component) lands in `queries.ts` and `world/`.
