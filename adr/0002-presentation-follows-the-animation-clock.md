# ADR-0002: Presentation reacts to the animation clock, not the event log

- Status: accepted
- Date: 2026-10-17

## Context and Problem Statement

The engine appends events to `game.log` in bursts; the UI plays the animated ones one at a time through a queue and a pace (normal, slow, tap), and `view.playing` marks the event that is on screen now. Sound is the second channel after visuals that must line up with what the player sees, and more may follow (haptics on the phone). If each channel subscribed to the log, a queued attack at the tap pace would be heard seconds before it is seen, and a burst of three events would fire three cues at once.

## Considered Options

- Every presentation channel keys off `view.playing` (the start of an event on screen) and off explicit UI moments; skipped events produce nothing.
- Each channel subscribes to the log and plays on append, with its own delay logic.

## Decision Outcome

Chosen option: "key off `view.playing` and UI moments", because the event player already resolves pace, stage and settling once, and every channel that reuses it stays in sync with the screen by construction. Per-channel delay logic would duplicate that and drift after undo, reload or a skip.

### Consequences

- Good, because sound, floats and the dim share one timeline at every pace, and a skipped event is silent everywhere.
- Good, because a new channel is one subscriber, with no timing code of its own.
- Bad, because events the player never animates (resource gain, draw) have no `playing` moment; their feedback must come from a UI moment (the card landing in the fan) instead, which a channel author must know.
- Bad, because any future change to how `EventPlayer` decides "on screen now" affects every channel at once.
