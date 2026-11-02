## Context

After phase 1 (ADR-0021), scripts reach the game only through `src/engine/api.ts`, and counters, piles and flags are written through the core. What still couples code to the state's shape: 230 `g.s.*` uses in engine modules, 111 field writes through card and investigator objects (60 in engine modules, 51 in scripts), and 44 UI and online-play files reading `game.cards` / `game.invs`. Phase 2 replaces the state's shape with a component store, so all of these must go through the core first.

## Goals / Non-Goals

**Goals:**

- One place (the core) that knows the state's shape; everything else reads through views and lookups and writes through named functions.
- Enforcement by the compiler and the linter, not by convention.
- Replays unchanged.

**Non-Goals:**

- The component store itself, and the pile decision's implementation (phase 2).
- Splitting `CardInst` into components (phase 3).
- Turning the ~880 field reads into function calls (option A, rejected below).

## Decisions

### 1. Views, not getters per field (ADR-0022)

```
  engine modules  --+                       +----------------------------+
  scripts (api.ts) -+--> card(g,id) --------> Readonly<CardInst> view     |
  ui, net ---------+--> cardOf(state,id) ---> (today: the record itself;  |
                         |                    phase 2: built from          |
                         |                    components)                  |
                         v                   +----------------------------+
                    writes: exhaust, ready, reveal, setLocation, setEngaged,
                    setController, attach, addCounter, moveCard, ...
                         |
                         v
                    core.ts / flags.ts / engine.ts / rules/skillTest.ts --> GameState
```

- `card`, `cardIf`, `inv`, `invIf`, `allCards`, `cardsIn`, `enemies`, `locations` and the like return `Readonly<CardInst>` / `Readonly<InvState>` (piles as `readonly InstId[]`). Today the view is the record itself, so there's no copy and no cost; phase 2's store returns a view assembled from its components.
- Inside the core, writes use internal mutable lookups not exported through `api.ts`.
- Rejected: (A) one function per field read (`zoneOf`, `locationOf`, …): about 880 edits for no gain over a view the store can provide; a Proxy view (hides writes instead of refusing them, and costs on every access).

### 2. Named setters for the remaining writes

From the 111 object writes, grouped: `exhaust` / `ready`, `reveal`, `setLocation` (enemy and attachment location), `placeInvestigator` (exists), `setEngaged` (exists), `setController`, `attach` / `detach`, investigator actions (`spendAction`, `grantActions`, `setTurnDone`), `setStatus`, `addTrauma`. Each is a plain function over `G` beside the counters; the exact list is whatever the writes need, nothing more.

### 3. The core boundary in lint

- `.oxlintrc.json` gets an override for `src/engine/**` minus the core files refusing `g.s` (the rule scripts already have).
- `src/ui/**` and `src/net/**`: `no-restricted-properties` on `game.cards`, `game.invs`, `state.cards`, `state.invs`, `s.cards`, `s.invs` (the names the UI uses for a state). Card definitions (`db.cards`) stay allowed.
- Tests may build state directly (testkit's `mutate`), so test files are exempt.

## Risks / Trade-offs

- [`Readonly` is shallow by default] -> the view types mark nested arrays (`deck`, `hand`, `restrictedActions`) readonly too; a deep write the type misses still has to pass the replay oracle.
- [Iteration order of `allCards`] -> unchanged: still the record's insertion order, which replay depends on.
- [44 UI files touched for reads only] -> mechanical; behaviour is checked by the UI-logic tests and a browser pass over the table.
- [A view returned before a write is stale in phase 2] -> today the view is live; the design note in ADR-0022 says views are read at once, not held across a write. Phase 2's tests will hold that.

## Migration Plan

No save or format change. Order: views and setters in the core (tests first); engine modules off `g.s` and onto setters, module by module, the oracle green after each; scripts' object writes; the UI and net lookups; the lint rules last.

## Open Questions

None. In-force ADRs reviewed: ADR-0002, 0004, 0011, 0013, 0014, 0015, 0018, 0020, 0021. ADR-0022 records the read-view decision; the pile decision (ordered id arrays as indexes beside a zone component) is phase 2's ADR.
