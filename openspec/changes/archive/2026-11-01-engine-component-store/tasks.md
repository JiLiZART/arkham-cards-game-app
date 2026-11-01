## 1. A shape-independent oracle (on the current engine)

- [x] 1.1 `snapshotOf(state)` in `src/engine/replays/`: cards in creation order with every field, investigators in turn order with their piles, every pile by name, the scenario's scalars, flags and pending choice; built through the lookups only. Tests first, including one showing the snapshot holds every field of the raw state.
- [x] 1.2 Recordings store the snapshot instead of the state; the replay test and `pnpm record:games` use it. Re-record the corpus on the current engine; corpus green; commit before any storage change.

## 2. The store behind the core

- [x] 2.1 Types: `World` (`entities`, `tables.card`, `tables.investigator`, `piles`), `PileName`, `InvRecord` (an investigator without piles); `GameState.world` in place of `cards`, `invs`, `encounterDeck`, `encounterDiscard`, `actDeck`, `agendaDeck`, `sideDecks`.
- [x] 2.2 `pileKey(zone, owner)` and the pile lookups (`pile`, `pileOf`, `pileRec`), tests first: every zone with a pile names exactly one.
- [x] 2.3 Live investigator views (getters over the record and the piles, cached per record), tests first: a held view shows later changes.
- [x] 2.4 `records.ts`, `createCard`, `moveCard` (one pile out, one pile in), the counters, setters and queries onto the store; `allCards` / `cardsOf` in creation order (a test holds `entities` equal to the table's order).
- [x] 2.5 `engine.ts` (empty state, setup, `revealed`) and `rules/skillTest.ts` onto the store; `ENGINE_VERSION` 6.

## 3. Callers

- [x] 3.1 Tests that build state directly onto `cardRec`, `invRec`, `pileRec`; the boundary test allows `records.ts` in test files.
- [x] 3.2 `PileColumn.tsx` and `optionHome.ts` onto `pileOf`; the save path opens a version-5 save by replay (test).

## 4. Verification

- [x] 4.1 Every recording reproduces its snapshot and event log; corpus replay time before and after recorded in the summary.
- [x] 4.2 Browser pass: the table, piles (encounter deck and discard, the cultist deck), a skill test, a reload of a save.
- [x] 4.3 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:content`, `pnpm format` (on the files this change touches only), `openspec validate engine-component-store --type change --strict`.
