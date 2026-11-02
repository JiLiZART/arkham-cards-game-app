# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It applies ADR-0002 (input waits for the animation clock) and ADR-0004 (viewing is view state, deciding is game state) in one place and introduces one durable decision: whether a choice can be answered is decided by one pure function that `choose()` and every surface use. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020. Directly relevant: ADR-0002 (presentation follows the animation clock), ADR-0004 (viewing is view state, deciding is game state), ADR-0005 (one layout mode), ADR-0014 (player windows are engine windows: the gate never invents or skips a window, it only says when the engine's pending choice can be answered), ADR-0016 (components in folders), ADR-0018 and ADR-0020 (online play: only the seat's device sends the answer).

## New Durable ADRs Created

- ADR-0030: One input gate decides when a choice can be answered (`adr/0030-one-input-gate-decides-when-a-choice-can-be-answered.md`), status proposed.
