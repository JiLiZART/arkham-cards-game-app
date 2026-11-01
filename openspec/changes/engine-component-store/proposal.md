## Why

Phases 1 and 1b of the move to an entity component store (ADR-0021, ADR-0022) left the core as the only code that knows the state's shape: everything else reads through views and lookups and writes through the core's setters. The shape itself is still the old one: `cards` and `invs` records, and piles scattered over seven places (`inv.deck`, `inv.hand`, `inv.discard`, `encounterDeck`, `encounterDiscard`, `actDeck`, `agendaDeck`, `sideDecks`). `moveCard` scans every pile to remove a card. Phase 2 puts the store in place behind the core, so that phase 3 can split components out one at a time.

The replay oracle compares each recording's full state JSON, which phase 2 changes on purpose; it first needs a comparison that doesn't depend on the shape.

## What Changes

- **Shape-independent oracle.** Each recording stores a snapshot built through the core's lookups (every card in creation order with its fields, every investigator, every pile by name, the scenario's state) instead of the raw state, recorded on the current engine before the store changes. The replay test compares snapshots and event logs. The store must reproduce every snapshot and log exactly.
- **The store.** The state holds a `world`: the entities in creation order, one table per component, and one map of piles. In this phase the tables are `card` (today's card records) and `investigator` (today's investigator records keyed by code, without their piles); field-level components wait for phase 3.
- **One pile map.** Every pile lives in `world.piles` under a name (`deck:01001`, `hand:01001`, `discard:01001`, `encounterDeck`, `encounterDiscard`, `actDeck`, `agendaDeck`, `sideDeck:cultists`). A card's pile follows from its zone and owner, so `moveCard` takes it out of exactly one pile.
- **Live views.** `card(g, id)` is still the stored record. `inv(g, i)` is a view whose fields forward to the investigator's record and whose `deck`, `hand` and `discard` read the pile map, so it never goes stale and no caller changes. The UI's six reads of pile arrays use `pileOf(state, name)`.
- **BREAKING** (saves only, handled): `ENGINE_VERSION` goes to 6. A save from version 5 is rebuilt by replaying its setup and choices, as today. Online play already refuses a room whose engine version differs.
- No behaviour change: every recorded game reproduces its snapshot and event log.

Decided with the user (grill-me): tables per kind now, field components in phase 3; investigators keyed by code; one pile map keyed by pile name.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: "Deterministic, serializable game state" compares a shape-independent snapshot; a new requirement describes the store (entities, component tables, the pile map, live views).

## Impact

- `src/engine/core.ts`, `src/engine/records.ts`, `src/engine/types.ts` (the `World` type; `GameState` loses `cards`, `invs` and the pile fields), `src/engine/engine.ts` (setup, `revealed`), `src/engine/rules/skillTest.ts` if it touches them.
- `src/engine/replays/` (snapshot, diff, corpus re-recorded once on the current engine before the swap).
- Six pile reads in `src/ui/hud/PileColumn/PileColumn.tsx` and `src/ui/game/optionHome.ts`.
- Tests that build state directly (about 150 `g.s.cards` / `g.s.invs` uses) move to the record lookups for tests.
- `ENGINE_VERSION` 6. New ADR-0023 for the store layout and the pile map.
