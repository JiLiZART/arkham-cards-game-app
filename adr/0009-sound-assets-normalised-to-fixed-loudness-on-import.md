# ADR-0009: Sound assets are normalised to fixed loudness targets on import; manifest gains are mix offsets

- Status: accepted
- Date: 2026-10-19

## Context and Problem Statement

The game's effects come from many CC0 packs recorded at different levels (ADR-0001 fixes the licence and provenance, not the level). Measured, their mean loudness spans 22 dB and a third of them peak at full scale, so the table sounds loud and uneven. Hand-set per-clip gains in the manifest were the only correction, and every new clip needed a new guess. Sounds will keep being added, one slot at a time, by whoever picks them.

## Considered Options

- Normalise every file on import in two passes (measure with ffmpeg's EBU R128 meter, then apply the exact gain) to fixed targets: effects −18 LUFS integrated, music −23 LUFS, never past a −2 dBTP peak ceiling (a click-like transient is peak-normalised instead, because a limiter squashes it). The manifest `gain` becomes a small mix offset (0.5–1.5), and the content check measures the converted files.
- Keep hand-set gains and lower the effects slider default.
- A compressor or limiter on the effects bus at run time.

## Decision Outcome

Chosen option: "normalise on import", because a fixed target is a contract any future clip meets without listening tests, the check can verify it mechanically, the shipped files already are what the player hears (no run-time processing to tune per device), and the character of each sound is untouched. Hand gains leave clipping and the spread in place; a bus compressor changes the sound and hides the problem from the check.

### Consequences

- Good, because adding a sound means choosing it, not levelling it; the picker compares candidates at the same level.
- Good, because `check:content` fails on a clip more than 2 LU above its target, more than 2 LU below it unless its peak is held at the ceiling, or peaking above −1 dBTP.
- Bad, because `check:content` and the import now need ffmpeg with the `ebur128` meter (reported as a warning, with those checks skipped, where ffmpeg is missing).
- Bad, because every converted file is rewritten once (one commit of binaries).
- Follow-up: if a category needs a different target (a quieter ambient bed), change the target in one place in the importer and re-import.
