# ADR-0082: Side scenarios are played Single Group; Epic Multiplayer is out of scope

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

Four side scenarios (The Labyrinths of Lunacy, The Blob That Ate Everything, War of the Outer Gods, Machinations Through Time) ship two modes: Single Group, and Epic Multiplayer for several tables playing at once with cross-group trades, per-group doom thresholds and a shared pool. Their packs carry an `epic_multiplayer`/`_single_group` set pair, and the importer picks whichever card comes first by code (Machinations Through Time's generated scenario uses the Epic Tindalos 87005b). The game is one table, hot-seat, one to four investigators (ADR-0005's one device). Coverage (ADR-0012, ADR-0013) counts every card of the sets a scenario lists, so the epic sets would make those scenarios never complete. Which mode do the side-scenario changes implement, and how does the measure treat the other?

## Considered Options

- Single Group only: a side scenario lists its single-group set and never its epic set; "per group" and "each group" on a card read as "the table"; epic-only cards stay in the pack data (catalog, text) but out of every scenario's `encounterSets`, so coverage does not count them.
- Both modes, with Epic Multiplayer as a flow choice and the extra tables simulated.
- Epic Multiplayer only, as the "full" version.

## Decision Outcome

Chosen option: "Single Group only", because the game has one table and no cross-table channel; because the single-group sets are the printed way to play these scenarios at one table; and because the measure must be satisfiable: a card nobody can play must not count against a scenario. Both modes were rejected for three extra play areas and trade rules nothing else needs; Epic only for being unplayable hot-seat.

### Consequences

- Good, because each side scenario is one lean scenario group with one setup, and its coverage reaches 100%.
- Good, because the importer rule is simple: prefer the `_single_group` card of a pair, never list an `epic_multiplayer` set.
- Bad, because the epic-only cards (Labyrinths' 25, the Blob's Mi-Go Incursion variants where epic-only, WotOG's and MTT's epic faces) show in the catalog without ever being drawn.
- Follow-up: `scenario-import-fixes` encodes the preference; each side change lists its sets accordingly; `docs/campaign-program.md` notes the exclusion so the side rows read as complete.
