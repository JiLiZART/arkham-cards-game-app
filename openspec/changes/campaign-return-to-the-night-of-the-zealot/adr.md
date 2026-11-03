# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 are in force (0027–0036 proposed; no `Supersedes` links in `adr/`).

- ADR-0007 campaign definitions generated from the guides: kept; the Return-to campaign takes the hand-written path as the base campaign does, and the importer skips it.
- ADR-0011 campaign flow as typed steps: kept; the flow is empty as the base's, resolutions in the scenario files.
- ADR-0012 and ADR-0013 coverage committed, a reference card works by its token lines: kept; the base card stays the scenario's `card` and the setup card is a `setupCards` entry real without token lines, as `campaign-return-to-the-dunwich-legacy` records.
- ADR-0015 the grimoire is the rules reference: kept; the printed cards and the guide settle the setup and connections, the grimoire the rules questions the scripts raise.
- ADR-0028 scripts through one registry with typed hooks, ADR-0034 explicit script API: kept; the Return scripts compose the base scripts' typed hooks through the API, and the card scripts import `api.ts` only.
- ADR-0025, ADR-0026: the new ops, flags and conditions sit in their concept's file and the closed constant sets.
- ADR-0004 deciding is game state: kept; the replacement-sets option lives in the campaign state.
- Others: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. Hand-writing a Return-to campaign over its base, composing its scripts and crediting its setup card follow `docs/campaign-program.md` and the shared decisions of `campaign-return-to-the-dunwich-legacy`; the vocabulary grows as the card-content spec provides. The reserved number 0047 is unused.
