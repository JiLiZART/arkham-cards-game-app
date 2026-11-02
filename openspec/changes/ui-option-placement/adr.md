# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It builds on ADR-0030 (the input gate, proposed in `ui-input-gate`) and ADR-0005 (one layout mode), and introduces one durable decision: which surface offers each option is decided by one pure function with an explicit list of mirrors, and every surface reads its slice. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020. Directly relevant: ADR-0004 (viewing is view state: the placement takes `looking` as input), ADR-0005 (one layout mode read by components: the mode is an argument to the placement), ADR-0014 (player windows are engine windows: placement only places the engine's options), ADR-0016 (components in folders, found by `data-testid`).
- ADR-0030 (proposed, `ui-input-gate`): the placement is computed behind its gate.

## New Durable ADRs Created

- ADR-0031: Option placement is one pure function every surface reads (`adr/0031-option-placement-is-one-pure-function-every-surface-reads.md`), status proposed.
