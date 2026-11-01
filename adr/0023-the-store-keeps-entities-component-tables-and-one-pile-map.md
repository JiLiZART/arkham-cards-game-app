# ADR-0023: The store keeps entities, component tables and one pile map

- Status: proposed
- Date: 2026-11-01

## Context and Problem Statement

ADR-0021 moves the engine to a JSON-plain entity component store in phases; ADR-0022 put every read and write of card and investigator data behind the core. The state still keeps cards and investigators as two records, an investigator's deck, hand and discard inside their record, and the scenario's piles in five more fields, so moving a card means scanning every pile. What layout should the store have, and where do piles live?

## Considered Options

- Entities in creation order, one table per component (for now `card` and `investigator`, holding today's records, investigators keyed by code), and one map of piles keyed by pile name (`deck:<investigator>`, `hand:<investigator>`, `discard:<investigator>`, `encounterDeck`, `encounterDiscard`, `actDeck`, `agendaDeck`, `sideDeck:<name>`), a card's pile following from its zone and owner.
- One table per field from the start (zone, damage, horror, clues, engagement…), views assembled from them.
- Investigators as a component on their investigator card's entity, with a code-to-entity lookup.
- Today's pile fields, moved inside the store unchanged.

## Decision Outcome

Chosen option: "entities, tables per kind and one pile map", because it gives the store its final structure (an entity list, a table per component, a pile index) while each table still holds today's records, so a view is the record itself or a cheap live view, and phase 3 can split fields into their own tables one at a time under the replay oracle. Per-field tables now would do phase 3's work in one change and make every lookup assemble a view. Moving investigators onto their card entity would put a mapping in front of every investigator id in actions, saves and online moves. Keeping the pile fields keeps `moveCard`'s scan over every pile.

### Consequences

- Good, because a card sits in exactly one pile, named by its zone and owner, and moving it touches that pile alone.
- Good, because creation order is explicit in `entities`, not a side effect of object key order.
- Good, because a new component is a new table, the shape phase 3 needs.
- Bad, because an investigator's view becomes a getter object over the record and the pile map, not a plain object.
- Bad, because the state's JSON changes (`ENGINE_VERSION` 6); saves of version 5 are rebuilt by replay, and the replay oracle must compare a shape-independent snapshot.
- Follow-up: phase 3 splits fields of `card` into their own tables and moves the flag families (ADR-0021) into components.
