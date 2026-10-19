# ADR Review Manifest

- Status: completed
- Review date: 2026-10-19

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0001 CC0 audio with a provenance manifest: kept exactly; candidates and chosen clips are CC0, listed with provenance, and only converted files are committed.
- ADR-0002 presentation follows the animation clock: every new sound is a `moment()` at the UI or keyed to `view.playing`; none reads the log.
- ADR-0004 viewing is view state: the picker is a dev modal over the view, not game state.
- ADR-0005 one layout mode: the picker is a desktop dev tool; no layout change.
- ADR-0003, 0006, 0007, 0008: unaffected.

## New Durable ADRs Created

- `adr/0009-sound-assets-normalised-to-fixed-loudness-on-import.md`: fixed loudness targets at import, manifest gains as mix offsets.
- `adr/0010-dev-only-tooling-served-by-the-dev-server.md`: dev-only screens behind the DEV flag, a dev middleware that serves working assets and writes content.
