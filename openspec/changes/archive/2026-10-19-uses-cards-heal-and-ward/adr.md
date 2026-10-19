# ADR Review Manifest

- Status: completed
- Review date: 2026-10-20

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0013 a card works when every printed line is accounted for: kept; the 12 cards count as working once their abilities are in data; the cards left out keep counting as not working.
- ADR-0012 completeness measured and committed: kept; `content/coverage.json` is regenerated with the change.
- ADR-0006 card data from the vendored snapshot: kept; the abilities are hand-written overrides over the snapshot's cards, and the audit confirms the snapshot's rules fields are already read.
- ADR-0004 viewing is view state, deciding is game state: kept; the prevention is game state (`prevented`), the labels are view text by key.
- ADR-0001 to 0003, 0005, 0007 to 0011: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. The new window follows the engine's existing "would" windows, and the effect and cost additions extend the effect vocabulary the card-content spec already defines.
