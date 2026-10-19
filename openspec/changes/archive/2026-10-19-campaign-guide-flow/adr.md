# ADR Review Manifest

- Status: completed
- Review date: 2026-10-19

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0007 scenarios and campaigns generated from the guides: kept and extended; the import still generates, hand-written still takes precedence, and the flow is one more generated file.
- ADR-0004 viewing is view state, deciding is game state: the picker's filters and focus are component state; the pick and the flow's answers are campaign state.
- ADR-0006 card data from the vendored snapshot and ADR-0008 card images by code from the CDN: the sidebar's cards are codes resolved the same way; no new image source.
- ADR-0003 (icon sprite): the guide's icon markup renders through the existing text formatter; no change.
- ADR-0001, 0002, 0005, 0009, 0010: unaffected.

## New Durable ADRs Created

- `adr/0011-campaign-flow-is-a-typed-step-language-run-by-the-engine.md`: the step language as the contract between content and engine, compiled from the guides, run by one pure interpreter over a serialisable cursor and a sectioned log.
