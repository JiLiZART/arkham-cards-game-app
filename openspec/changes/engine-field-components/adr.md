# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It implements phase 3 of ADR-0021 inside the store ADR-0023 laid out (whose follow-up named this split), behind the boundary ADR-0022 set, and introduces one durable decision: each card field and each entity flag family has its own default-free table, read through a live card view. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0023, with ADR-0019 superseded in part by ADR-0020. Directly relevant: ADR-0021 (the phased move to a component store), ADR-0022 (views and core writes), ADR-0023 (entities, tables, the pile map), ADR-0018 and ADR-0020 (online play replays a move log; the session compares engine versions), ADR-0004 (the UI only reads game state).

## New Durable ADRs Created

- ADR-0024: Each card field and entity fact has its own table (`adr/0024-each-card-field-and-entity-fact-has-its-own-table.md`), status proposed.
