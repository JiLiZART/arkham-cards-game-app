# ADR Review Manifest

- Status: completed
- Review date: 2026-11-05

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

49 ADRs in `adr/` (0001–0042, 0045, 0046, 0050, 0052, 0053, 0082, 0083); ADR-0019 is superseded in part by ADR-0020, every other one is in force.

- ADR-0025 the engine organised by game concept with one-way imports, ADR-0022 cards and investigators read through views: kept; the bot stays in `src/engine` and reads the state through queries.
- ADR-0013 a card works when every printed line is accounted for, ADR-0012 completeness measured and committed: unaffected; coverage is measured on content, not on what the bot wins.
- ADR-0039 scenario cards as instances, ADR-0041 the map per location instance: kept; the bot's routing reads instance connections through `connections()`.
- ADR-0015 the Grimoire as the rules reference: unaffected; no rules change.
- All others: unaffected.

## New Durable ADRs Created

- None - the bot reading its strategy from card data is a tactical choice inside `bot.ts`. A per-scenario hint field in the scenario schema is not planned; if implementation needs one, it becomes a content contract and gets an ADR then.
