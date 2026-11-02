# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It reorganises the engine whose data side ADR-0021 to ADR-0024 laid out, without revisiting them, and introduces two durable decisions: how the engine's modules are arranged and which way they may import, and how closed sets of strings are written. The context's rename (`GameContext`, `game`) is a naming change recorded in the design, not an ADR. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0024, with ADR-0019 superseded in part by ADR-0020. Directly relevant: ADR-0021 (the engine's phased move to a component store; step handlers are not a tick scheduler), ADR-0022 (views and core writes), ADR-0023 and ADR-0024 (the store's layout), ADR-0011 (the campaign flow), ADR-0016 (UI components; the React context renamed).

## New Durable ADRs Created

- ADR-0025: The engine is organised by game concept, with one-way imports (`adr/0025-the-engine-is-organised-by-game-concept-with-one-way-imports.md`), status proposed.
- ADR-0026: Closed sets of strings are constant objects (`adr/0026-closed-sets-of-strings-are-constant-objects.md`), status proposed.
