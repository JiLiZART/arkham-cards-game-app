# ADR-0021: Engine state moves to a JSON-plain entity component store

- Status: proposed
- Date: 2026-11-01

## Context and Problem Statement

The rules engine keeps the whole game in one plain object. Every card instance carries all fifteen fields whatever its type, a card's zone is stored twice (`card.zone` and the ordered pile arrays), and per-card or per-event facts that don't fit the card record live in a string-keyed `flags` bag (17 per-entity key prefixes). Card scripts read and write this shape directly. Each new card mechanic adds a field everyone carries or a new flag key, and keeping the duplicated zones in step has already needed fixes.

The engine also has commitments any new shape must keep: a game is its seed plus its choices and replays exactly (saves replay on a version change; online play replays a host-ordered move log, ADR-0018); state is plain JSON, deep-copied per choice with `structuredClone`; iteration order of cards is insertion order, and reactions and "first copy" lookups depend on it. How should the state be organised so card behaviour composes, without breaking those commitments?

## Considered Options

- A hand-rolled entity component store: entities with stable, creation-ordered ids; one plain table per component (`zone`, `damage`, `engaged`, `uses`, keyword tags...); derived indexes (zone to ordered ids) rebuilt from the tables and never saved. Migrated in phases behind accessors, each phase verified by replaying a recorded-game corpus.
- An ECS library (bitecs, miniplex, becsy).
- Keep the current shape and tidy it: fix the double zone bookkeeping, type the flags, leave the fat card record.
- A rewrite of the engine around the new store in one step.

## Decision Outcome

Chosen option: "a hand-rolled entity component store, migrated in phases", because it gives cards only the data they use and turns the flag bag into typed components, while keeping state plain JSON, ids stable and iteration in creation order, which replay, saves and online play need. Libraries are ruled out: archetype stores reorder entities as components change and keep data in typed arrays or class instances, which breaks deterministic order and plain-JSON copies. Tidying alone fixes the bookkeeping but keeps every card carrying every field. A one-step rewrite can't be verified against the existing game.

The phases: 0, a committed corpus of recorded games whose replay must stay identical; 1, every engine module and script reaches state through accessors in the core; 2, the store replaces the state shape behind those accessors (`ENGINE_VERSION` bumped, saves replayed into it); 3, components split out of the card record and the flags, one at a time; 4, optional, handlers query by component and modifiers become a cached derived component. The step queue and its handlers stay: a resolution stack driven by choices is not a per-tick system scheduler.

### Consequences

- Good, because a card's data is what its type needs, and a new mechanic is a new component rather than a field on every card or a flag key.
- Good, because each phase is checked by replaying the corpus, so the move never breaks a save or an online game silently.
- Good, because scripts lose direct access to the state, so later shape changes touch one module.
- Bad, because the store, its indexes and its JSON form are ours to write and maintain.
- Bad, because phases 1 to 3 touch most engine modules and about 60 card scripts, over several changes.
- Bad, because the UI keeps reading the current shape until a later change routes it through the same accessors.
- Follow-up: how ordered piles are kept (an order field in the zone component, or ordered id arrays as indexes) is decided in phase 2's ADR.
