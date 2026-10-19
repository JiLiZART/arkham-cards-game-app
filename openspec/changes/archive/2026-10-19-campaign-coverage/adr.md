# ADR Review Manifest

- Status: completed
- Review date: 2026-10-19

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0007 scenarios and campaigns generated from the guides: kept; `generated` still marks a campaign's origin and the import still skips hand-written folders. Only the "partly implemented" mark stops reading it.
- ADR-0011 the campaign flow as a step language: unaffected; a moved campaign keeps its `flow.json`.
- ADR-0004 viewing is view state: the coverage file is content, read by the picker; no game or view state changes.
- ADR-0006 card data from the vendored snapshot: coverage counts the snapshot's cards; no new source.
- ADR-0001, 0002, 0003, 0005, 0008, 0009, 0010: unaffected.

## New Durable ADRs Created

- `adr/0012-completeness-is-measured-from-the-content-and-committed.md`: completeness computed offline from the content and committed as `content/coverage.json`, guarded by `check:content`; the UI reads it; `generated` only records origin.
