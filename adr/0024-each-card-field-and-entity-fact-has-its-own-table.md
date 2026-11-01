# ADR-0024: Each card field and entity fact has its own table

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

ADR-0023 gave the store its structure (entities, tables, one pile map) with each table still holding the old records, and left splitting them to phase 3 of ADR-0021. Every card record carries fourteen fields, but in the recorded games' final states only `zone`, `owner` and `controller` are set on most cards; each other field is set on under 3%. Facts about one card, one investigator, or an enemy and an investigator that the record has no field for are string keys in `state.flags`. Every caller already goes through `card(g, id)`, the core's setters and `flags.ts` (ADR-0022). How should a card's fields and these facts be stored?

## Considered Options

- A table per card field, keyed by card id, beside a `card` table holding only the identity (`id`, `code`); a table per entity flag family; an entry only for a value other than the field's default (0, false, none), the zone always present; `card(g, id)` a live view whose getters read the tables.
- Tables only for the sparse fields, with `zone`, `owner` and `controller` kept on the record.
- Grouped components (one `tokens` table with damage, horror, clues, doom, uses and resources; one `placement` table…).
- The current records, with the flag families typed but left in `flags`.

## Decision Outcome

Chosen option: "a table per field and per entity fact, default-free, behind a live card view", because it makes a card hold only what it uses and makes a new mechanic a new table, which is the point of ADR-0021, while no caller changes: the view keeps `card(g, id)` and the setters working, and `flags.ts` keeps its API. Keeping dense fields on the record or grouping fields would cost the same view and leave two ways to store a field. Typing the flags in place keeps facts about entities apart from the entities. Facts keyed by a card code or an event, campaign log entries and scenario globals stay in `flags`: they aren't about an entity.

### Consequences

- Good, because a card's stored data is its zone plus whatever is set, and the state's JSON shrinks with it.
- Good, because a new card field or entity fact is one new table, with a default, and nothing else to change.
- Good, because "which cards have doom" or "which enemies don't ready" is one table's keys, ready for phase 4's queries.
- Bad, because every card read goes through a getter over a table, which costs more than a property read; the cost is measured on the replay corpus and capped by a budget.
- Bad, because the state's JSON changes again (`ENGINE_VERSION` 7); saves of versions 5 and 6 are replayed into it, and the snapshot rebuilds the moved flags under their old keys so the corpus stays as recorded.
- Follow-up: the investigator record can be split the same way; phase 4 queries tables directly and caches modifiers.
