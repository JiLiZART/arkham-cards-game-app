# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It introduces one durable decision: the contract between script functions and the engine (a resolved run built by one adapter that owns re-entry after a choice, the auto-pick and the eliminated guard). No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020; ADR-0030 and ADR-0032 (proposed, UI) seen and unrelated. Directly relevant: ADR-0007 and ADR-0011 (behaviour as data, scripts for what data can't say), ADR-0013 (coverage), ADR-0018 and ADR-0020 (online play replays a move log, so behaviour must stay deterministic), ADR-0022 (views read, core writes), ADR-0025 (folders by game concept, one-way imports), ADR-0026 (closed sets as constants).

## New Durable ADRs Created

- ADR-0027: Scripts receive a resolved run from one adapter (`adr/0027-scripts-receive-a-resolved-run-from-one-adapter.md`), status proposed.
