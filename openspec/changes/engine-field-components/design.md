## Context

After phase 2 (ADR-0023) the state holds a `world`: entities in creation order, a `card` table of full card records, an `investigator` table, and one pile map. Only the core (`core.ts`, `records.ts`, `flags.ts`, `engine.ts`) touches it; everything else reads through views and lookups and writes through the core's setters (ADR-0022). `card(g, id)` returns the stored record itself, typed read-only; the setters mutate it through `cardRec`. Facts about an entity that the record has no field for are string keys in `state.flags`, all made and read by `flags.ts`'s families (`prefix:id`). The replay oracle compares a snapshot built through the lookups (cards from `cardsOf`, investigators, piles, and the scenario's other state, `flags` included) and the event log.

Measured on the corpus's final states (9,413 cards): `zone` is set on every card, `controller` and `owner` on about 65%, and each other field on under 3%.

## Goals / Non-Goals

**Goals:**

- A table per card field and per entity flag family, holding entries only for values other than the default.
- No caller outside the core changes: `card(g, id)`, the lookups, the setters and `flags.ts`'s API stay.
- The corpus replays to its stored snapshots and event logs without being re-recorded.

**Non-Goals:**

- Splitting the investigator record (it stays one record per investigator; a later change can split it the same way).
- Queries by component and cached modifiers (phase 4).
- Moving scenario facts out of `flags`: families keyed by a card code or an event key, campaign log entries, globals and scripts' free names stay.

## Decisions

### 1. The store after phase 3

```
  world
  +--------------------------------------------------------------------------+
  | entities: [c1, c2, c3 ...]                     creation order            |
  | tables:                                                                  |
  |   card:        { c1: {id, code}, ... }         identity, every card      |
  |   zone:        { c1: "deck", ... }             every card                |
  |   owner, controller, location, engagedWith, attachedTo   (null = absent) |
  |   exhausted, revealed                                    (false = absent)|
  |   damage, horror, clues, doom, uses, resources           (0 = absent)    |
  |   investigator: { "01001": {...} }             record, unchanged         |
  |   noReady, surge, dying, costMod, beneath      by card id                |
  |   aside, xp, hunch, hunchRevealed              by investigator           |
  |   attacked, noAttack                           by "enemy:investigator"   |
  | piles: { "deck:01001": [...], "encounterDeck": [...], ... }   unchanged  |
  +--------------------------------------------------------------------------+
        ^ writes: core setters, flags.ts             ^ reads
        |                                            |
  +-------------+   +-----------------------------+  |  +----------------------+
  | core.ts     |-->| records.ts                  |--+--| card view (cached    |
  | setters,    |   | cardRec -> view with setters|     | per identity record):|
  | createCard  |   | field read: table[id]??dflt |     | getter per field     |
  +-------------+   | write dflt: delete entry    |     +----------------------+
                    +-----------------------------+              ^
  +-------------+          ^                          rules, scripts, UI
  | flags.ts    |----------+  entity families -> tables; others -> state.flags
  +-------------+
  +-------------+
  | snapshot.ts |  cards from views; flags = state.flags + moved families
  +-------------+  rendered back as "prefix:id" keys  ->  corpus unchanged
```

- The card's identity record (`{id, code}`) stays in `card`, so `entities` and `Object.values(card)` still give every card in creation order, and the view cache keys on it.
- `zone` always has an entry; every other field table drops an entry when the value is the default. The JSON of a typical game shrinks: most cards are a zone and an owner.
- Rejected: only the sparse fields (the user chose a table per field); grouping tokens into one component (the same view cost, and a field per table keeps "new mechanic = new table" literal).

### 2. The card view

`viewOf(world, id)` makes, once per card and world, a small object whose fields are accessors on a shared prototype: the getter reads `world.tables[field][id]`, giving the default when absent; the setter writes it, deleting the entry for the default. `code` reads and writes the identity record (a card's code changes when it is turned over). `card`, `cardOf`, `cardsOf`, `allCards` and `cardRec` all return it, so the setters' `cardRec(g, id).damage += 2` keeps working and a held view never goes stale. Accessors on the prototype, not own properties, because a view is made for every card touched in every dispatch (the state is cloned per choice, so views are per world): defining fourteen own accessors per view was estimated at several minutes over the corpus. The consequence is that a spread of a view gives only its `id`; `toJSON` and the core's `cardCopyOf` give the whole record as a plain object (the snapshot and tests use it). `patchedState` copies only the tables its patches touch. Rejected: own enumerable getters per view (the cost above); a fresh object per lookup (allocates on every read); per-field accessors at every call site (hundreds of rewrites and a script API change).

### 3. Flag families over tables

`flags.ts`'s `family` takes where it stores: an entity family stores in `world.tables[prefix]` under the id (a pair joined as `enemy:investigator`); the other families and the globals keep `state.flags`. Callers keep `noReady.set(g, id, true)` and the rest. Which families move: the 11 keyed by a card, an investigator or a pair. Rejected: moving globals and log entries too (scenario facts, not facts about an entity; churn without a gain).

### 4. The oracle

`snapshotOf` reads cards through the views (a plain copy of each) and builds `scenario.flags` as `state.flags` plus every moved family rendered back under `prefix:id`, through one function in `flags.ts` that knows the key formats. The snapshot is then the same JSON as phase 2's, and the corpus is never re-recorded: its checksum is checked before and after.

### 5. Versions and saves

`ENGINE_VERSION` 7. `replaysSave` accepts 5, 6 and 7: neither 6 nor 7 changed a rule, which the oracle proves. Online play compares versions and refuses a mismatch, as today.

### 6. Scans read the zone table

The core's scans over every card (`cardsIn`, `allMods`, `blankedCards`) walk the zone table and make a view only for the cards that match, instead of a view and an accessor call per card. Measured: with every field in tables and the scans unchanged, the corpus replay took 9.75 s (1.40x the 6.95 s before); with the scans over the zone table, 8.15 s (1.17x), inside the 1.25x budget. Phase 4's queries by component generalise this.

## Risks / Trade-offs

- [Card reads are hot (`allMods`, `triggered`, `cardsIn`); a getter per field costs more than a property] -> replay time is measured before and after; budget 1.25x the time before this change (6.95 s, so 8.7 s). The first cut was over (9.75 s); decision 6 brought it to 8.15 s.
- [A view spread or `JSON.stringify` of a view] -> `JSON.stringify` uses `toJSON` and gives the whole record; a spread gives the id alone, so code and tests that copy a card use `cardCopyOf` / `cardDataIn`. States never hold views.
- [Tests that assign whole card records (`world.tables.card[id] = {...}`, `withCardsIn`)] -> `withCardsIn` and a `putCardIn` helper write every field through the tables; the boundary test already allows records in tests.
- [A field written with its default by code that expects the key to exist] -> reads always go through the view, which gives the default; nothing reads a field table directly outside `records.ts`.
- [Key order in snapshots] -> the comparison is order-insensitive deep equality; the view defines fields in `CardInst`'s order anyway.

## Migration Plan

Order, with the corpus replayed after each step: field tables and the card view behind `records.ts`, tests first; `createCard`, `patchedState` and test helpers onto them; one field group at a time moved out of the record (tokens, state, placement, then owner, controller and zone); the snapshot's flag rebuild, then each flag family onto tables; `ENGINE_VERSION` 7 and `replaysSave`. Rollback is reverting the change.

## Open Questions

None. In-force ADRs reviewed: ADR-0002, 0004, 0011, 0013, 0014, 0015, 0018, 0020, and the proposed ADR-0021, 0022, 0023 this change builds on; none needs revisiting. A new ADR records the field tables, default-free entries and entity flag tables.
