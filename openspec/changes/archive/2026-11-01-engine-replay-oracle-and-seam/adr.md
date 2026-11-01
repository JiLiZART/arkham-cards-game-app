# ADR Review Manifest

- Status: completed
- Review date: 2026-11-01

## Review Summary

ADR review completed for this change. The change keeps the engine's determinism and plain-state commitments and records the direction it starts: the move to an entity component store. That direction is a major durable decision, so a new repository-level ADR records it; this change implements its phases 0 and 1 only.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0020, with ADR-0019 superseded by ADR-0020. Directly relevant: ADR-0011 (the campaign flow run by the engine, which the corpus's campaign run covers), ADR-0013 (a card works when every printed line is accounted for: scripts stay the escape hatch, now behind the API), ADR-0014 (player windows are engine windows: unchanged), ADR-0015 (the Grimoire as rules reference: unchanged), ADR-0018 and ADR-0020 (online play replays a move log: why replay must stay exact).

## New Durable ADRs Created

- ADR-0021: Engine state moves to a JSON-plain entity component store (`adr/0021-engine-state-moves-to-a-json-plain-entity-component-store.md`), status proposed.
