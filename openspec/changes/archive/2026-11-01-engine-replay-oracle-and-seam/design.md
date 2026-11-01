## Context

The engine (`src/engine/`, about 15,500 lines) is a resolution stack: 53 step handlers mutate one plain `GameState` in place, and `dispatch` takes one `structuredClone` per choice. A game is its setup plus its choices; `replay()` rebuilds it, saves are replayed when `ENGINE_VERSION` changes (`src/ui/state/store.ts:552`), and online play syncs only choices (ADR-0018).

The state shape leaks everywhere:

- cards carry all fifteen fields whatever their type (`CardInst`, `types.ts:48`);
- a card's zone is stored twice, in `card.zone` and in ordered pile arrays (`inv.deck/hand/discard`, `encounterDeck`, `actDeck`, `agendaDeck`, `sideDecks`), kept in step by `moveCard` (`core.ts:203`) except where 20 sites write the arrays directly (`effects.ts:212-216, 813-824, 1056-1058`, `rules/scenario.ts:27, 160, 228`, `01145.ts:32`);
- `g.s.flags` is an untyped bag with 17 per-entity key prefixes and 9 global keys, 86 sites, cleaned up by scattered `delete`s, and parsed again by the campaign (`campaign.ts:216-226`);
- 62 of 100 scripts take `g: any` and read `g.s`; about 40 write it; 5 write skill-test fields.

ADR-0021 sets the direction: a hand-rolled, JSON-plain entity component store. This change is its first step: prove behaviour is kept (phase 0), then hide the shape behind the core (phase 1), without changing it.

## Goals / Non-Goals

**Goals:**

- A recorded-game corpus whose replay is the definition of "nothing changed", for this change and every later phase.
- One module that knows how cards, piles, counters, flags and the skill test are stored; every engine module and script goes through it.
- Scripts typed and kept off the raw state by the linter.

**Non-Goals:**

- Changing the state shape, `ENGINE_VERSION` or save format (phase 2).
- Splitting `CardInst` into components or turning flags into components (phase 3).
- Query-by-component systems or modifier caching (phase 4).
- Routing `src/ui` reads through the seam (a later change; the UI only reads).

## Decisions

### 1. The corpus: bot-played games, stored results compared field by field

```
  scripts/record-games.ts                       vitest
  +----------------------------+               +--------------------------------+
  | for each recipe:           |   writes      | replays.test.ts                |
  |  setup(scenario, invs,     | ----------->  |  for each recorded game:       |
  |        seed, pace flags)   |  corpus/      |   replay(db, setup, actions)   |
  |  autoPlay(bot) to the end  |   <id>.json   |   compare state  -> diff path  |
  |  or N choices              |   {setup,     |   compare events -> first      |
  |  store setup, actions,     |    actions,   |                     differing  |
  |  final state, events       |    state,     |   fail: game id + where        |
  +----------------------------+    events}    +--------------------------------+
           ^                                                 |
           | explicit run only                               | read only
           +--------- pnpm record:games -------------------- +
```

- Recipes: each hand-written scenario (The Gathering, The Midnight Masks, The Devourer Below, and the core 2026 ones) with one, two and four investigators across the starter decks, seeds fixed; bot `autoPlay` to the scenario's end or a choice cap; one Night of the Zealot campaign from prologue to the last resolution through the campaign flow.
- Stored per game: setup, choices, final state and the event log. The comparison reports the first differing path (`cards.c42.clues: 2 != 1`) and the first differing event, so a failure points at a rule, not at a 400 KB blob.
- Size is controlled by the recipe count and the choice cap; the log is already capped at 300 events (`LOG_LIMIT`).
- Rejected: snapshot files written by `vitest -u` (too easy to accept a behaviour change by accident); replaying the UI's saves (not in the repo, and not covering every scenario).

### 2. The seam: accessors in the core, not a new layer

```
  content/**/scripts  ---+
  rules/*.ts, effects.ts +--> api.ts (re-exports) --> core.ts accessors --> GameState
  flow.ts, campaign.ts --+                            +-----------------+
                                                      | piles: moveCard,|
  src/ui (reads)  -------------------------------------> putOnTop,      |
  (unchanged, later)                                  |  putUnder,      |
                                                      |  shuffleInto    |
                                                      | counters:       |
                                                      |  counter, add,  |
                                                      |  set            |
                                                      | flags: per key  |
                                                      |  family module  |
                                                      | test: named     |
                                                      |  setters        |
                                                      +-----------------+
```

- Accessors live in `core.ts` (and a new `flags.ts` beside it for the key families), because `core.ts` already owns `card`, `inv`, `moveCard` and the queries, and `api.ts` already re-exports it. No class, no wrapper object: plain functions over `G`, as the rest of the engine is written.
- Pile helpers keep the zone and the arrays in step in one place: `putOnTop(g, id, deck)`, `putUnder(g, id, deck)`, `shuffleInto(g, id, deck)`, `takeTop(g, deck)`. `moveCard` stays the single writer.
- Counters: `counter(g, id, "clues")`, `addCounter(g, id, "clues", n)`, `setCounter(...)`, for cards and investigators alike, so phase 3 can move a counter into a component by changing one function.
- Flags: one typed helper pair per key family (`noReady.get/set/clear`, `attacked.get/set`, `prevented.take/put` ...), each owning its key format. `campaign.ts` reads `xp`, `log` and `count` through the same module.
- Skill test: setters for the fields scripts change (`setExtraReveal`, `setOnChoose`, ...); handlers inside `rules/skillTest.ts` keep direct access, since that file owns the test.
- Rejected: a Proxy that records reads and writes (hides the seam instead of making it, and costs on every access); moving to the component store now (phase 2 needs the corpus and the seam first).

### 3. Scripts typed and fenced by the linter

- `ScriptFn`, `conditions`, `icons`, `modifiers`, `extraPlayable`, `blanks`, `extraActionCost`, `wouldPlaceDoom` take `G` (or a narrowed `ScriptG`) instead of `any`.
- An oxlint `no-restricted-syntax` rule in an override for `content/**/scripts/**` refuses member access to `.s` on the engine context. Engine modules themselves are not restricted in this change.
- Scripts that need something the API lacks get an accessor added, not an exception.

## Risks / Trade-offs

- [The corpus misses a path a script uses] -> recipes include every scenario's scripts; scripts with no recorded coverage are listed by a small check and get a hand-written replay test before their migration.
- [Bot games are long and repetitive] -> choice cap per game, and the corpus is split per scenario so a failure names the scenario.
- [Insertion order of `cards` and option ids are part of replay] (survey top risk) -> accessors never re-create or re-key cards; `createCard` stays the only id allocator.
- [Re-entrant handlers re-run code before `ask`] -> accessors are side-effect-free reads or plain writes; no handler's order of writes changes during the move.
- [62 scripts in one change is a large diff] -> migrate by pack in separate tasks, each replay-verified.

## Migration Plan

No save or format change. Order: record the corpus on the current engine and commit it; add the replay test (green); add accessors; move engine modules; move scripts pack by pack; turn on the lint rule last. Rollback is reverting the change; the corpus stays useful on its own.

## Open Questions

- Corpus location: `src/engine/replays/` (beside the tests that read it) or `content/replays/` (beside the data). Leaning to the former, since it is test data, not game content.
- In-force ADRs reviewed: ADR-0002, 0004, 0007, 0011, 0013, 0014, 0015, 0018, 0020. This design stays within them; ADR-0021 records the ECS direction.
