# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It introduces one durable decision: scripts are looked up only through a registry in `world/`, hooks are a typed list with returned results, and script functions and hooks are called only through the adapter of ADR-0027. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020, and the proposed ADR-0027 this change builds on; ADR-0030 and ADR-0032 (proposed, UI) seen and unrelated. Directly relevant: ADR-0022 (which modules read the state), ADR-0025 (layers and one-way imports, checked by the boundary test), ADR-0007 and ADR-0011 (data first, scripts for the rest), ADR-0013 (coverage counts scripted cards).

## New Durable ADRs Created

- ADR-0028: Scripts are found through one registry, with typed hooks (`adr/0028-scripts-are-found-through-one-registry-with-typed-hooks.md`), status proposed.
