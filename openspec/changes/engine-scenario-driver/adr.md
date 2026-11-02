# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It adds test tooling inside the layout ADR-0025 set (helpers in `kits/`, tests in each folder's `__tests__`) and introduces one durable decision: engine tests drive games through a scenario driver and read only prompts, events and views, with a ratchet in the boundary test. No prior ADR is superseded.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020; the proposed ADR-0030 and ADR-0032 of parallel changes (UI only). Directly relevant: ADR-0025 (folders by game concept, tests in `__tests__`, kits at the top layer), ADR-0026 (closed sets: the driver uses `CHOICE`, `EVENT`), ADR-0022 (the core's lookups tests read), ADR-0021 (the step stack this keeps private), ADR-0014 (player windows are engine windows, which `untilWindow` waits for).

## New Durable ADRs Created

- ADR-0029: Engine tests drive games through a scenario driver (`adr/0029-engine-tests-drive-games-through-a-scenario-driver.md`), status proposed.
