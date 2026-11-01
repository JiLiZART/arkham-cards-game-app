# ADR-0022: Cards and investigators are read through views and written through the core

- Status: proposed
- Date: 2026-11-01

## Context and Problem Statement

ADR-0021 moves the engine's state to an entity component store in phases. Phase 1 put scripts behind the engine API and the counters, piles and flags behind the core, but engine modules, scripts and the UI still read card and investigator fields straight off the state's records (about 880 reads) and write some through them (111 writes). Phase 2 replaces those records with component tables. How should code read and write card and investigator data so that phase 2 changes only the core?

## Considered Options

- Lookups return read-only views (`card(g, id)` gives a `Readonly<CardInst>`); every write goes through a named core function. Phase 2's store builds the view from its components.
- One accessor function per field read (`zoneOf(g, id)`, `locationOf(g, id)`, …) and per write.
- Lookups return a Proxy that routes reads and writes to the store.
- Leave reads and writes as they are and rewrite them during phase 2.

## Decision Outcome

Chosen option: "read-only views and core writes", because the ~880 reads stay as they are, writes become a type error outside the core (enforced by the compiler in the engine, scripts and the UI alike), and the store has one thing to provide: a view per entity. Per-field accessors cost hundreds of edits for nothing a view doesn't give. A Proxy hides writes instead of refusing them and costs on every access. Rewriting during phase 2 mixes a storage change with a codebase-wide edit, which the replay oracle can't tell apart.

### Consequences

- Good, because phase 2 swaps storage behind `card`, `inv` and the setters without touching their callers.
- Good, because a stray write through a card or investigator is caught by `pnpm typecheck`, not by a failed replay.
- Bad, because a view is read at once, not held across a write: once the store builds views, a view taken before a change won't show it.
- Bad, because every field a module writes needs a named setter in the core, which grows with the mechanics.
- Follow-up: phase 2's ADR decides the store's layout; ordered piles stay ordered id arrays kept as indexes beside a zone component.
