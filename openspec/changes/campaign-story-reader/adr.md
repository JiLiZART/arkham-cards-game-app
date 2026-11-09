# ADR Review Manifest

- Status: completed
- Review date: 2026-11-09

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0042, 0045, 0046, 0050, 0052, 0053, 0082, 0083 are in force (only ADR-0020 supersedes another, ADR-0019).

- ADR-0002, ADR-0032 presentation follows the event clock and stage claims: kept; the reader is a screen with the table unmounted, so it claims no stage.
- ADR-0004 viewing is view state: followed; reading pace and the turned pages are view state, answers are game state.
- ADR-0005 one layout mode: kept; the reader reads it for its phone layout.
- ADR-0011, ADR-0037 the campaign flow: kept; the reader renders the flow's steps; the interpreter gains a "continue" stop before a scenario's own setup steps, no new step kind.
- ADR-0016 CSS Modules: followed for the reader's component.
- ADR-0018, ADR-0020 online moves: kept; no new moves, the reader shows moves by others using the log's mover.
- ADR-0030 one input gate: unaffected; the table is not mounted while reading.
- ADR-0036 one read entry point: followed; the reader reads campaign state through the store as the campaign screen does.
- ADR-0001, ADR-0009 audio: kept; existing effects and music only.
- ADR-0008 card scans from the CDN: the agenda painting fallback reads scans through the same path.
- The others are unaffected.

## New Durable ADRs Created

- `adr/0084-a-scenario-opening-is-read-in-a-story-reader-screen-paged-from-campaign-state.md`
- `adr/0085-story-paintings-come-from-a-manifest-of-the-guide-editions-with-the-agenda-painting-as-fallback.md`
