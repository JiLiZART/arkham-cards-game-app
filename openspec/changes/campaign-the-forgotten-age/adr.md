# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036, 0045, 0046, 0050, 0052, 0053, 0082, 0083 are in force (0027 onward proposed; no `Supersedes` links in `adr/`).

- ADR-0007 campaign definitions generated from the guides: kept; the campaign takes the hand-written path, and the importer skips it as it skips Night of the Zealot.
- ADR-0011 campaign flow as a typed step language: kept; the hand-fixed `flow.json` uses the supply steps of ADR-0053 and one new step for Interlude IV's chaos draw.
- ADR-0012 and ADR-0013: kept; the token tables are data read by `tokensReal`, the campaign and its packs move in `coverage.json` and the program.
- ADR-0015 rules questions against the grimoire: followed for exploration, vengeance and replacing locations (the guide's own rules pages where the grimoire is silent).
- ADR-0028 and ADR-0034: kept; the 10 scenario scripts and ~110 card scripts use the registry's typed hooks and the API's verbs.
- ADR-0050 the scenario records what the guide asks: followed; Yig's Fury, the Harbinger's damage, the jungle watches, the depth, the tasks and the killed come from the scenario.
- ADR-0052 the exploration deck and symbols: followed; every explored scenario lists its deck in setup and its symbols on the cards.
- ADR-0053 supplies as a log section: followed; the interludes' checks are its steps.
- ADR-0001 to 0006, 0008 to 0010, 0014, 0016 to 0027, 0029 to 0033, 0035, 0036, 0045, 0046, 0082, 0083: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. The pursuit area as a flag over the set-aside zone and Body of a Yithian as one swap function are scenario-sized choices under the existing store and view rules.
