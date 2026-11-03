# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 are in force (no `Supersedes` links in `adr/`).

- ADR-0007 scenarios generated from the guides: kept; the campaign takes the hand-written path the ADR leaves open, moving out of `campaigns-generated/`.
- ADR-0011 campaign flow as a typed step language: kept; the moved `flow.json` stays in that language, with `logCompare`, `removeAllChaosTokens` and split `xp` added to the interpreter.
- ADR-0012 and ADR-0013 completeness measured and per-line accounting: kept; done means coverage reports the eight scenarios and seven packs complete.
- ADR-0006 card data from the snapshot: kept; behaviour in `cards.json` and scripts, generated files untouched.
- ADR-0024 each entity fact has its own table: followed; clues on enemies and assets read the clues table.
- ADR-0025, ADR-0028, ADR-0034 engine layers, script registry, script API: followed; scripts import `api.ts` only and reach the engine through verbs.
- ADR-0033 deferred rules are typed step kinds: followed by the new steps.
- ADR-0014 player windows are engine windows: the `parleyed` window follows its pattern.
- Others (0001–0005, 0008–0010, 0015–0023, 0026, 0027, 0029–0032, 0035, 0036): unaffected.

## New Durable ADRs Created

- `adr/0050-the-scenario-records-what-the-guide-asks-the-players.md`: a flow prompt whose answer the game knows is recorded by the scenario script and dropped from the flow; the flow keeps the questions only the players can answer. The vocabulary additions, the token sources and the location-keyed costs extend the card-content vocabulary under ADR-0013's pattern and record no new decision.
