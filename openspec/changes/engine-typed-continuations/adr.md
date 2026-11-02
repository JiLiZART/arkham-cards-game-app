# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It applies the step dispatch of ADR-0021/ADR-0025 and the closed sets of ADR-0026 to the one path that bypassed them, and introduces one durable decision: a rule queued to run later is a typed step kind owned by its rules module, with no string-named back channel, and scripts queue such rules only through `api.ts` verbs. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020; the proposed ADR-0029 (scenario driver), ADR-0030 and ADR-0032 of parallel changes. Directly relevant: ADR-0021 (the resolution stack), ADR-0025 (folders by game concept, one-way imports, the boundary test), ADR-0026 (step kinds in `STEP`), ADR-0011 and ADR-0007 (scripts beside data), ADR-0018 and ADR-0020 (online play replays a move log of choices, so step shapes never travel).

## New Durable ADRs Created

- ADR-0033: Deferred engine rules are typed step kinds (`adr/0033-deferred-engine-rules-are-typed-step-kinds.md`), status proposed.
