## Context

The engine has two kinds of read function. Lookups over a state (`cardOf`, `cardOfIf`, `cardsOf`, `invOf`, `invOfIf`, `invsOf`, `pileOf`, `pileMap`, `patchedState` in `src/engine/context.ts`) take `Pick<GameState, "world">` and are what the UI mostly uses (about 85 named imports across 42 non-test files). Queries and rule helpers (`def`, `maxHealth`, `maxSanity`, `skillValue`, `enemyStat`, `invsAt`, `connectionsOf` in `queries.ts`/`context.ts`; `handLimit`, `playBlock`, `doomInPlay`, `actClueCost`, `testParts`, `tokenTotal` in `rules/*`) take a `GameContext`: `{ s: GameState; db: ContentDb; events: GameEvent[] }`, the context the rules run and write in. The UI, holding only a `GameState`, builds that context inline at 7 non-test sites; `testScreen.ts` and `ScenarioPanel.tsx` each wrap it in a local `gOf`.

The engine's entry points today are `index.ts` (create, dispatch, replay, versions) and `api.ts` (scripts: `export *` of the core, being narrowed by `engine-script-verbs`). ADR-0025's boundary test layers the engine's own modules and checks no rings; a separate test lets only the core import `world/store` from anywhere in `src`. Nothing states which engine modules the UI may import.

Health and sanity remaining are `maxHealth(g, inv) - damage` and `maxSanity(g, inv) - horror` in both `invNumbers` (Stats) and `barModel` (players); the avatar sheet uses Stats' `StatBody`, so two of three surfaces share one copy and the third has its own.

Constraints: `src/engine` must not import React, zustand or `src/ui` (oxlint). ADR-0022: the UI reads through the core's lookups, never the tables. ADR-0025: one-way layers inside the engine. ADR-0004: the UI reads game state, never writes it.

## Goals / Non-Goals

**Goals:**

- One engine module the UI reads through; the context built in one place.
- One investigator summary for the stat bar, the player bar and the sheet.
- A test that keeps the UI's engine imports to a short, named list.

**Non-Goals:**

- New queries or changed results: every function keeps its signature and meaning behind the reader.
- The store's writes (`dispatch`, campaign `advance`, `upgradeDeck`): those are `ui-move-seam`'s concern.
- `src/net`, `content/` scripts (`api.ts`), dev tools under `src/ui/dev/` beyond the import list.
- Caching query results.

## Decisions

### 1. Before and after (C4 component view: the browser app's UI reading the engine)

Rigor: lightweight C4-inspired, component level inside the one browser container; ASCII.

Before:

```
  src/ui (42 files)                                   src/engine
  +---------------------------+   cardOf, invOf ...   +--------------------------+
  | hud/*, scene/*, game/*,   |---------------------->| context.ts (lookups)     |
  | state/*, menu/*, assets/* |   maxHealth, enemyStat| queries.ts               |
  |                           |---------------------->| rules/investigators.ts   |
  |  { s: game, db,           |   handLimit, playBlock| rules/cards.ts           |
  |    events: [] }  x7       |---------------------->| rules/scenario.ts        |
  |  invNumbers / barModel    |   testParts           | rules/skillTest.ts       |
  |  (health maths x2)        |---------------------->| campaign/* (menus, store)|
  +---------------------------+   validateDeck ...    +--------------------------+
                                   no rule says which; api.ts unused by the UI
```

After:

```
  src/ui                                  src/engine
  +-----------------------+  reads        +-------------------------------------------+
  | hud/*, scene/*,       |-------------->| read.ts  (entry, top layer with api, bot) |
  | game/*, menu/*, ...   |               |  lookups (re-export)                      |
  |  readGame(db, game)   |               |  readGame(db, s) -> { maxHealth, ...,     |
  |   .investigatorSummary|               |     investigatorSummary }  builds context |
  +-----------+-----------+               |  campaign reads (re-export)               |
              | writes                    +------+------------------------------------+
  +-----------v-----------+  dispatch            | imports
  | state/store.ts        |-------------> index.ts      context, queries, rules/*, campaign/*
  | (campaign/* allowed)  |
  +-----------------------+
  src/ui/engineImports.test.ts: UI imports only index, read, bot, world/types,
  campaign/types, world/constants, events/event (store.ts also campaign/*)
```

- The engine owns the list of what is safe to read; the UI owns nothing but its calls.
- Types and the closed sets stay direct imports: they carry no behaviour.

### 2. The seam is in the engine

`src/engine/read.ts` sits in ADR-0025's top layer with `api.ts`, `bot.ts` and `campaign/`, importing downward only. Rejected: a UI-side adapter (`src/ui/game/read.ts` with the app's `db` baked in). It would remove the hand-built contexts as well, but the list of "functions that only read" would live outside the engine, where a change to a rule helper (one that starts writing the state, or moves folders) can't see it; and engine tests couldn't cover the summary. Rejected: making the UI import `api.ts` (the scripts' surface is about to be narrowed to what scripts need, and it includes writes).

### 3. `readGame(db, state)` as an object of bound reads

```ts
export function readGame(db: ContentDb, s: GameState): GameReader;
// GameReader: def(id), maxHealth(inv), maxSanity(inv), skillValue(inv, skill), handLimit(inv),
//   enemyStat(id, stat), invsAt(loc), connectionsOf(loc), playBlock(inv, id), doomInPlay(),
//   actClueCost(), testParts(test), tokenTotal(...), investigatorSummary(inv)
```

It builds `{ s, db, events: [] }` once per call; the methods close over it. Rejected: free functions `(db, s, ...args)` (every call site passes two leading arguments, and the 7 sites each make several calls on one state); overloading the queries to accept a `GameState` (touches every rules module and blurs the context type for the rules themselves). Reads are checked not to write: `read.test.ts` deep-freezes a started game and calls every method.

### 4. `investigatorSummary`

Returns `{ health, maxHealth, sanity, maxSanity, resources, clues, hand, handLimit, skills }`, the union of what `invNumbers` and `barModel` compute. `invNumbers` becomes a call to it; `barModel` takes its four health and sanity fields from it. Rejected: putting it in `src/ui/state/players.ts` (it is game facts, and the engine's tests cover modifiers to maximum health and sanity already).

### 5. The UI's import test

`src/ui/engineImports.test.ts` walks `src/ui` (non-test `.ts`/`.tsx`), parses each `from "…/engine/…"` specifier, and fails on any target outside the allowed list, naming the file. Rejected: an oxlint `no-restricted-imports` rule (oxlint's support for path patterns relative to the importer is limited, and the engine's own boundary is already a vitest test; one pattern is easier to keep). Tests are exempt: they build states through `world/store` and the test kit.

## Risks / Trade-offs

- [42 files change an import path] -> a mechanical rename of `engine/context` to `engine/read` with the same names; typecheck catches every miss; one commit per area.
- [`read.ts` grows into a second `api.ts` that exports everything] -> its exports are an explicit list (no `export *`); adding one is a reviewed line, and the import test makes reaching around it fail.
- [A query that writes the context's `events` or `s` by accident] -> the frozen-state test in `read.test.ts` fails.
- [Overlap with `engine-script-verbs` editing the engine's entry layer] -> different files (`read.ts` vs `api.ts`); both add to the same layer in `boundary.test.ts`, a one-line merge.

## Migration Plan

`read.ts` with its tests first; then the 7 hand-built sites and the summary; then the import rename by area (`hud/`, `scene/`, `game/`, `state/`, `menu/`, `assets/`); then the import test, which must pass on the result. Rollback is reverting the change; no state, save or version changes.

## Open Questions

- The four questions in the proposal (seam in the engine or the UI, caching, campaign reads, the store's campaign exception).
- In-force ADRs reviewed: 0004, 0021–0026 (proposed), 0016, 0018. None needs revisiting; ADR-0036 adds the UI's read boundary beside ADR-0025's internal layers.
