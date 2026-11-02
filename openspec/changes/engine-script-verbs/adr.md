# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change. It introduces one durable decision: the script API is an explicit, test-pinned list of reads and intent verbs, verbs queue through `queue` in resolution order, and the step union stays engine-private. No prior ADR is superseded. ADR numbers 0029 to 0033 are reserved by other changes in flight.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0026, with ADR-0019 superseded in part by ADR-0020, and the proposed ADR-0027 and ADR-0028 this change builds on; ADR-0030 and ADR-0032 (proposed, UI) seen and unrelated. Directly relevant: ADR-0022 (views read, core writes), ADR-0025 (`api` sits at the top layer), ADR-0026 (closed sets as constants: `STEP` stays a constant, only its export to scripts goes), ADR-0007 and ADR-0011 (scripts cover what data can't).

## New Durable ADRs Created

- ADR-0034: The script API is an explicit list of reads and intent verbs (`adr/0034-the-script-api-is-an-explicit-list-of-reads-and-intent-verbs.md`), status proposed.
