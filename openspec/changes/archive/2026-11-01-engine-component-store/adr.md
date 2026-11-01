# ADR Review Manifest

- Status: completed
- Review date: 2026-11-01

## Review Summary

ADR review completed for this change. It implements phase 2 of ADR-0021 behind the boundary ADR-0022 set, and introduces one durable decision: the store's layout (entities, component tables per kind, investigators keyed by code, one pile map keyed by pile name). That decision is recorded as a new repository-level ADR.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0022, with ADR-0019 superseded by ADR-0020. Directly relevant: ADR-0021 (the phased move to a component store), ADR-0022 (views and core writes: what lets the store change without touching callers), ADR-0018 and ADR-0020 (online play replays a move log; the session compares engine versions), ADR-0004 (the UI only reads game state).

## New Durable ADRs Created

- ADR-0023: The store keeps entities, component tables and one pile map (`adr/0023-the-store-keeps-entities-component-tables-and-one-pile-map.md`), status proposed.
