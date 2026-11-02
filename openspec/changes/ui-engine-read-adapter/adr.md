# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It adds a boundary that no ADR covers yet: which engine modules the UI may import, and that the engine, not the UI, builds the context for reads. It complements ADR-0022 (the UI reads through lookups, not tables) and ADR-0025 (the engine's internal layers) without superseding either; recorded as ADR-0036.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020; ADR-0021 to ADR-0026 are proposed. Directly relevant: ADR-0004 (the UI reads game state only), ADR-0021 to ADR-0024 (the store and its views), ADR-0022 (lookups, not tables), ADR-0025 (layers and one-way imports inside the engine), ADR-0018 (online play is unaffected).

## New Durable ADRs Created

- ADR-0036: The UI reads the engine through one read entry point (`adr/0036-the-ui-reads-the-engine-through-one-read-entry-point.md`), status proposed.
