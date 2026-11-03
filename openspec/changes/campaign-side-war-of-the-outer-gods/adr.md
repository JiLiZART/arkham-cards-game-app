# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 are in force (no `Supersedes` links in `adr/`); ADR-0082 and ADR-0083 are proposed by this change set.

- ADR-0007 scenarios generated from the guides: kept; the generated folder is replaced by a hand-written campaign, the path the ADR left open.
- ADR-0011 campaign flow as a typed step language: kept; the flow is hand-written in the same language, the side-story cost through the existing `sideScenario` step.
- ADR-0012 / ADR-0013 completeness measured and committed, a card works when every line is accounted for: kept; the change is done when the scenario reports complete with real tokens on four difficulties.
- ADR-0027 / ADR-0028 / ADR-0034 script run adapter, registry, explicit API: the scenario script and card scripts import only `src/engine/api.ts` and are found through the registry.
- ADR-0033 deferred rules are typed steps: the Warring attacks and faction advances queue engine steps through the API verbs, no `__engine` strings.
- ADR-0004, 0005, 0015, 0025, 0026: unaffected or followed (hot-seat one table; the Grimoire for the enemy-phase order).

## New Durable ADRs Created

- `adr/0082-side-scenarios-are-played-single-group-epic-multiplayer-is-out-of-scope.md`: side scenarios list their single-group sets only and read "per group" as the table; Epic Multiplayer is out of scope and out of the measure. Shared by Machinations Through Time, The Labyrinths of Lunacy and the Blob changes.
