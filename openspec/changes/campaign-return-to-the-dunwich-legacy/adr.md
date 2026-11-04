# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0038 are in force (0027–0038 proposed; no `Supersedes` links in `adr/`).

- ADR-0007 campaign definitions generated from the guides: kept; the Return-to campaign takes the hand-written path as the base campaign does.
- ADR-0038 a Return-to scenario is its base plus a setup card, the box's sets an option on the base campaign: followed; this change declares its pairs and composes its scripts.
- ADR-0012 and ADR-0013 coverage committed, a reference card works by its token lines: kept; a setup card with no token lines is accounted for in full, and the reference card stays the base scenario card.
- ADR-0011 campaign flow as typed steps: kept; the flow is the base's with the box's log keys.
- ADR-0028 scripts through one registry with typed hooks, ADR-0034 explicit script API: kept; the Return scripts compose the base scripts' typed hooks through `compose()` in the API.
- Others: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. The shared Return-to shape is ADR-0038 (`scenario-import-fixes`).
