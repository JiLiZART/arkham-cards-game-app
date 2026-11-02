# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. No major durable architectural decisions were introduced and no new repository-level ADR files were created. The change routes the game store's 8 public calls through one move path, which applies ADR-0018's "every change to the shared game is a move" to play on one device; that commitment already exists. The reserved number ADR-0037 is left unused. A `Mover` interface and moving `canUndo`/`Save` out of the store were considered and not adopted (see design.md), so there is no boundary decision to record.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020; ADR-0021 to ADR-0026 are proposed. Directly relevant: ADR-0004 (game state vs view state), ADR-0018 (host-ordered move log), ADR-0019 and ADR-0020 (room socket and its fallback for moves).

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
