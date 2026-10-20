# ADR Review Manifest

- Status: completed
- Review date: 2026-10-19

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0012 completeness is measured from the content and committed: kept; the offline computation, the committed file and its check are unchanged. This change narrows what "works" means, recorded as ADR-0013, which amends it without superseding it.
- ADR-0007 scenarios and campaigns generated from the guides: kept; `generated` still records origin; the generated scenarios' placeholder tokens are now reported as not working, not changed.
- ADR-0011 the campaign flow as a step language: unaffected; token effects are scenario data, not flow steps.
- ADR-0006 card data from the vendored snapshot: the printed text the line rules read is the snapshot's; no new source.
- ADR-0001, 0002, 0003, 0004, 0005, 0008, 0009, 0010: unaffected.

## New Durable ADRs Created

- `adr/0013-a-card-works-when-every-printed-line-is-accounted-for.md`: per-line accounting for "works", scenario reference cards measured by their token lines and counted in coverage.
