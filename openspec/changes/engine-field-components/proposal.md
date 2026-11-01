## Why

Phase 2 (ADR-0023) put the store in place, but each table still holds the old fat record. Every card carries all fourteen fields whatever its type, although in the recorded games' final states only `zone`, `owner` and `controller` are set on most cards: `location`, `revealed`, `clues`, `doom`, `damage`, `uses`, `exhausted`, `engagedWith`, `horror`, `resources` and `attachedTo` are each set on under 3%. Facts about a card or an investigator that the record has no field for live as string keys in `state.flags`. Phase 3 of ADR-0021 gives each fact its own table, so that a card holds only what it uses and a new mechanic is a new table rather than a field on every card or a new flag prefix.

## What Changes

- **A table per card field.** The `card` table keeps only `id` and `code`. Each of the other fourteen fields (`owner`, `controller`, `zone`, `exhausted`, `revealed`, `damage`, `horror`, `clues`, `doom`, `uses`, `resources`, `location`, `engagedWith`, `attachedTo`) gets its own table in `world.tables`, keyed by card id. A table holds an entry only when the field has a value other than its default (0, `false` or `null`); writing the default removes the entry. A card's zone always has an entry.
- **A live card view.** `card(g, id)` and the other card lookups return a view whose getters read each table, cached per card, as investigators' views already do. No caller in the rules, scripts or UI changes. The core's setters write through it.
- **Entity flag families become tables.** The 11 flag families keyed by a card, an investigator or an enemy and an investigator (`noReady`, `surge`, `dying`, `costMod`, `beneath`, `aside`, `xp`, `hunch`, `hunchRevealed`, `attacked`, `noAttack`) move from `state.flags` into tables. `flags.ts` keeps its API, so its callers don't change. Families keyed by a card code or an event key (`defeated`, `prevented`, `attackBonus`, `damageBonus`, `isabelle`), the campaign log entries, the scenario's globals and the free names scenario scripts read stay in `flags`.
- **The oracle stays as recorded.** The snapshot rebuilds the moved flag families under their old keys, so every recording in the corpus replays to its stored snapshot and event log with the corpus unchanged.
- **BREAKING** (saves only, handled): `ENGINE_VERSION` goes to 7. Saves from versions 5 and 6 replay into the new store, since only storage changed; older saves restart their scenario as today. Online play already refuses a room whose engine version differs.
- No behaviour change.

Decided with the user (grill-me): every card field in its own table, not only the sparse ones; a live getter view for `card(g, id)`; entity-keyed flag families move into tables while scenario facts stay in `flags`; one change, moving one group of tables at a time, with the corpus replayed after each.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: "Entities, component tables and piles" describes a table per card field and per entity flag family, with entries only for values other than the default, read through a live card view.

## Impact

- `src/engine/records.ts` (field tables, the card view), `src/engine/types.ts` (`World` gains the tables; `CardInst` stays as the view's type), `src/engine/core.ts` (`createCard`, `patchedState`, setters that replace records), `src/engine/flags.ts` (families over tables), `src/engine/engine.ts` (version, `replaysSave`).
- `src/engine/replays/snapshot.ts` (cards from views, moved flags rebuilt under their old keys); the corpus itself doesn't change.
- Tests that write card records directly (`withCardsIn`, assignments to `world.tables.card[id]`) write through the record lookups instead.
- Replay time is measured before and after; investigators' views cost 8% in phase 2, and card reads are far more frequent.
- New ADR for the field tables and default-free entries.
