## Context

After phases 1 and 1b (ADR-0021, ADR-0022) only the core (`core.ts`, `records.ts`, `flags.ts`, `engine.ts`, `rules/skillTest.ts`) touches `g.s`; every other module reads through `card`, `inv` and the queries (read-only views) and writes through setters. Today the state still has `cards: Record<InstId, CardInst>`, `invs: Record<InvId, InvState>` (each investigator holding `deck`, `hand`, `discard`), and the scenario's piles as five more fields. `moveCard` removes a card from wherever it is by scanning all of them. The oracle stores each recording's full state.

## Goals / Non-Goals

**Goals:**

- The store in place: entities in creation order, component tables, one pile map.
- `moveCard` touching one pile; zone and pile kept together in one place.
- Proof by the corpus that nothing else changed.

**Non-Goals:**

- Field-level components and moving `flags` into tables (phase 3).
- Query-by-component systems and modifier caching (phase 4).
- Any change to callers outside the core besides six UI pile reads and tests.

## Decisions

### 1. The oracle compares snapshots, recorded before the swap

```
  record (current engine)            replay (new store)
  +---------------------+            +---------------------+
  | play setup+choices  |            | play setup+choices  |
  | snapshotOf(state) --+--> corpus <+-- snapshotOf(state) |
  | events -------------+--> corpus <+-- events            |
  +---------------------+            +---------------------+
              same snapshot and events, or the replay test names the first difference

  snapshotOf(s) = { cards: [{id, ...card view}] in creation order,
                    investigators: [{...inv view, deck, hand, discard}] in turn order,
                    piles: { "deck:01001": [...], "encounterDeck": [...], ... },
                    scenario: { round, phase, act, agenda, chaosBag, flags, pending, ... } }
```

`snapshotOf` is built only from the lookups (`cardsOf`, `invsOf`, `pileOf`) and the scenario scalars, so it gives the same JSON before and after the swap. The corpus is re-recorded once with snapshots on the current engine, committed, then the swap must keep it green. Rejected: re-recording after the swap (proves nothing); a converter from the new shape to the old (two shapes to maintain).

### 2. The store (ADR-0023)

```
  GameState
  +---------------------------------------------------------------+
  | world: {                                                      |
  |   entities: InstId[]                 creation order (c1, c2..)|
  |   tables: {                                                   |
  |     card:         Record<InstId, CardInst>                    |
  |     investigator: Record<InvId, InvRecord>  (no piles)        |
  |   }                                                           |
  |   piles: Record<PileName, InstId[]>   "deck:01001", "hand:..",|
  |                                       "encounterDeck", ...    |
  | }                                                             |
  | round, phase, act, agenda, chaosBag, flags, queue, pending... |
  +---------------------------------------------------------------+
           ^ only core.ts / records.ts write it
  card(g, id)  -> tables.card[id]                      (the record itself, read-only type)
  inv(g, i)    -> live view: getters over tables.investigator[i] and
                  piles["deck:"+i], ["hand:"+i], ["discard:"+i]  (cached per record)
  pileKey(zone, owner) -> the one pile a card in that zone sits in (or none: play, threat, location...)
```

- `entities` keeps creation order explicitly. Iteration (`allCards`, `cardsOf`) uses the card table's own key order, which is the same list (a card is added to both together and never removed; a test holds them equal): looking each entity up measured 27% slower on the replay corpus, native `Object.values` about 8%. Phase 3, when the table stops holding every card, makes `entities` the source.
- `moveCard`: remove from `piles[pileKey(old zone, owner)]` (if any), set the zone, add to `piles[pileKey(new zone, owner)]` at the top or the bottom. The scan goes.
- `act` and `agenda` stay scalar ids on the state; they're slots, not piles.
- Rejected: per-field tables now (phase 3's work, with view assembly cost); investigators on their card entity (an id mapping for every InvId in actions, saves and online moves); keeping the five pile fields (the scan stays).

### 3. Live investigator views

A view is an object with a getter per field forwarding to the record, plus `deck`, `hand` and `discard` getters reading the pile map, made once per record and kept in a `WeakMap`. Reads always show the current values, so code that holds `const me = inv(g, i)` across a setter keeps working. `structuredClone` and `JSON.stringify` of the state never see views (they're not stored). Rejected: a copy per call (stale after a write); rewriting the ~115 `.deck` / `.hand` / `.discard` reads (no gain over the view).

### 4. Tests and the UI

- Tests that build state directly use the record lookups (`cardRec`, `invRec`, `pileRec` from `records.ts`), allowed in test files; the boundary test allows them there.
- `PileColumn.tsx` and `optionHome.ts` read `pileOf(game, "encounterDeck")` and the like.

## Risks / Trade-offs

- [Getter views cost more than a plain object] -> measured: the corpus replay time before and after; the view is cached per record, so a dispatch makes one view per investigator.
- [A stale view of the old record after `structuredClone`] -> views are keyed by record; each dispatch's clone gets fresh records and so fresh views.
- [Snapshots miss a field the old state held] -> the snapshot includes every field of the card and investigator records and every scalar of the scenario; a test compares a snapshot against the raw state on the current engine to show nothing is dropped.
- [Online rooms across versions] -> the session already exchanges `ENGINE_VERSION` and refuses a mismatch.

## Migration Plan

Order: snapshot and re-record (current engine, corpus green, committed); `World` type and store code behind the core, tests first; core internals and `engine.ts` onto it; tests onto the record lookups; the six UI reads; `ENGINE_VERSION` 6. Saves of version 5 replay into the new store automatically (`store.ts`). Rollback is reverting the change.

## Open Questions

None. In-force ADRs reviewed: ADR-0002, 0004, 0011, 0013, 0014, 0015, 0018, 0020, 0021, 0022. ADR-0023 records the store layout and the pile map.
