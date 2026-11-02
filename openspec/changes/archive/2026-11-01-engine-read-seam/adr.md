# ADR Review Manifest

- Status: completed
- Review date: 2026-11-01

## Review Summary

ADR review completed for this change. It implements phase 1b of ADR-0021 and introduces one durable decision: card and investigator data is read through read-only views and written only through the core, so the component store of phase 2 can replace the state's shape behind those functions. That decision is recorded as a new repository-level ADR.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0021, with ADR-0019 superseded by ADR-0020. Directly relevant: ADR-0021 (the phased move to a component store this change continues), ADR-0018 and ADR-0020 (online play replays a move log: why replays must stay exact), ADR-0004 (the UI reads game state, never writes it), ADR-0013 (scripts as the escape hatch, behind the API).

## New Durable ADRs Created

- ADR-0022: Cards and investigators are read through views and written through the core (`adr/0022-cards-and-investigators-are-read-through-views-and-written-through-the-core.md`), status proposed.
