# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It refines ADR-0002 (presentation follows the animation clock) without superseding it: the clock that ADR relies on becomes one pure, tested function, and the stage's claims and its three kinds of freedom get names. That is a durable decision about where presentation timing lives, recorded as ADR-0032. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020; ADR-0021 to ADR-0026 are proposed. Directly relevant: ADR-0002 (presentation follows `view.playing`), ADR-0004 (the clock's state is view state), ADR-0005 (no layout-specific timing), ADR-0016 (components unchanged in structure), ADR-0018 (each browser runs its own clock), ADR-0026 (closed sets of strings as constant objects, the pattern for stage kinds).

## New Durable ADRs Created

- ADR-0032: The event clock is one pure function over named stage claims (`adr/0032-the-event-clock-is-one-pure-function-over-named-stage-claims.md`), status proposed.
