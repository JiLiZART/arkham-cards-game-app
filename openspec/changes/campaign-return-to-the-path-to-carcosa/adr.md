# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0038 and ADR-0050 are in force (no `Supersedes` links in `adr/`).

- ADR-0038 a Return-to scenario is its base plus a setup card, the box's sets an option on the base campaign: followed; this change declares its pairs and composes its scripts.

- ADR-0007 scenarios generated from the guides: kept; the Return-to campaign takes the hand-kept path after its base.
- ADR-0011 campaign flow as a typed step language: kept; the base flow is reused with the Return-to ids.
- ADR-0012 and ADR-0013 completeness measured and per-line accounting: kept; the setup card counts through `setupCards` as `scenario-import-fixes` defines, and the token table is copied so the file is measured whole.
- ADR-0028 and ADR-0034 script registry and explicit script API: followed; Return scripts compose the base hooks through `compose()` in `api.ts`.
- ADR-0050 the scenario records what the guide asks: followed; the six-way act 2 record of Return to Curtain Call is written by the base script.
- Others (0001–0006, 0008–0010, 0014–0027, 0029–0033, 0035–0037): unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. The composition of Return scripts, the setup-card coverage rule and the replacement-sets option are ADR-0038 (`scenario-import-fixes`), reused unchanged.
