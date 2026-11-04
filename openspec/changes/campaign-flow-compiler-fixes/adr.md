# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 and ADR-0038 are in force (0027–0038 proposed; no `Supersedes` links in `adr/`).

- ADR-0007 scenarios generated from the guides: kept; the compiler reads more of the guide (shared steps, resolution links, the order effect), the hand-written path untouched.
- ADR-0011 campaign flow as a typed step language compiled from the guides: kept and corrected; no new step kind; the "unsupported" list shrinks by what was structure mistaken for unsupported.
- ADR-0012 completeness measured and committed: kept; the program document is rewritten to the program of changes, the coverage tables and `content/coverage.json` remain the measure.
- ADR-0013 a card works by its lines: unaffected.
- ADR-0038 a Return-to scenario over its base: unaffected; the Return-to flows gain the same order and links as their base.
- ADR-0025, ADR-0026: unaffected; `scripts/` and `src/content/` only.
- Others: unaffected.

## New Durable ADRs Created

- `adr/0037-a-campaign-flow-holds-exactly-what-its-order-and-steps-reach.md`: a flow's order comes from the guide's graph (`set_scenarios`, else the list), a resolution link is structure expanded in place, shared steps are resolved, and an interlude nothing reaches is not in the flow; the content check enforces it for hand-written flows too.
