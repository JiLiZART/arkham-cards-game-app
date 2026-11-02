# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It extends ADR-0002 (presentation follows the animation clock) from presentation channels to the table state the HUD draws, and introduces one durable decision: surfaces that draw card placement read one presented table, while the pending choice, the hand, the feed and the counters read the live game. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020. Directly relevant: ADR-0002 (presentation follows the animation clock), ADR-0004 (viewing is view state, deciding is game state: the choice stays on the live game), ADR-0005 (one layout mode: the phone's strip modal joins), ADR-0016 (components in folders), ADR-0018 and ADR-0020 (online moves key off the live state).
- ADR-0030 (proposed, `ui-input-gate`): keeps the choice closed while events play, so options never point at a card the presented table doesn't show yet.

## New Durable ADRs Created

- ADR-0035: Surfaces that draw card placement read one presented table (`adr/0035-surfaces-that-draw-card-placement-read-one-presented-table.md`), status proposed.
