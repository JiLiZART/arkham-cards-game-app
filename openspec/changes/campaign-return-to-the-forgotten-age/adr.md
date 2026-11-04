# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0038, 0045, 0046, 0050, 0052, 0053, 0082, 0083 are in force (0027 onward proposed; no `Supersedes` links in `adr/`).

- ADR-0007 campaign definitions generated from the guides: kept; the Return-to campaign takes the hand-written path as the base does.
- ADR-0038 a Return-to scenario is its base plus a setup card, the box's sets an option on the base campaign: followed; this change declares its pairs (and the Rainforest addition under `addSets`) and composes its scripts.
- ADR-0012 and ADR-0013: kept; a setup card with no token lines is accounted for in full and the reference card stays the base card, as `scenario-import-fixes` established.
- ADR-0011 campaign flow as typed steps: kept; the flow is the base's with the box's keys and the supply step's `xpRate`.
- ADR-0028 and ADR-0034: kept; the Return scripts compose the base scripts' typed hooks through the API.
- ADR-0052 the exploration deck and symbols: followed; the "one of two per symbol" decks are the setup step's `bySymbol` pick over the base and Return-to cards' symbols, and the box's after-exploration rule is the scenario's `afterExplore`.
- ADR-0053 supplies as a log section: followed; the Key of Eztli is a supply id, the resupply's conversion a field of the buy step.
- Others: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. Composing a Return scenario from its base and the campaign option follow ADR-0038 (`scenario-import-fixes`).
