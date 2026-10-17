# ADR Review Manifest

- Status: completed
- Review date: 2026-10-17

## Review Summary

ADR review completed for this change. `adr/` did not exist before this change, so no supersession graph applied; the two decisions below are the first repository-level ADRs. ADR style for the project recorded as MADR minimal.

## In-Force ADRs Reviewed

- None - `adr/` had no ADRs before this change.

## New Durable ADRs Created

- `adr/0001-cc0-audio-assets-with-provenance-manifest.md`: CC0-only audio, converted files committed, provenance manifest validated by `check:content`.
- `adr/0002-presentation-follows-the-animation-clock.md`: presentation channels (sound now, haptics later) key off `view.playing` and UI moments, never off the event log.

Design decisions left tactical (in `design.md` only): the pure `sounds.ts` / thin `audio.ts` split, state-derived music selection, the MP3 / AAC + Opus formats, the manifest's exact shape, the settings fields.
