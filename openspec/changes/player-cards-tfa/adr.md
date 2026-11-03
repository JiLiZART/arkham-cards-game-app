# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036, 0045, 0046, 0050, 0052, 0053, 0082, 0083 are in force (0027 onward proposed; no `Supersedes` links in `adr/`).

- ADR-0006 card data from the snapshot, behaviour in `cards.json`: kept; the generated files are untouched.
- ADR-0012 and ADR-0013: kept; the eight packs' player rows move in `coverage.json` and the program.
- ADR-0014 player windows are engine windows: kept; Leo's and Ursula's reactions use existing windows.
- ADR-0004 deciding is game state: kept; Shrewd Analysis, Arcane Research and On Your Own are rules on the upgrade screen, where deck changes already live.
- ADR-0028, ADR-0034: kept; the card scripts use the API's reads and verbs.
- ADR-0050: followed; Ancient Stone's number is recorded by the scenario, never asked.
- Others: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced; the vocabulary grows as the card-content spec provides, and investigator abilities follow the core's placement.
