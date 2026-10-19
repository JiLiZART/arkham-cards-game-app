## Context

`HandOff` (`Hud.tsx`) shows "Pass to {name}" with one button when `handVisible(privacy, players, viewer, revealedFor)` is false; `confirmHandoff` sets `revealedFor`. The turn title (`Turn title` requirement) already plays "Daisy's turn" when hands aren't private. `playersCanAct`/the pulse (`players.ts`) waits for a tap to switch the view to the investigator who can act. Investigator choices come from the engine as options whose `card` is an investigator card; `investigatorOptions` routes them to the bar's avatars (`answers`) or the decider's sheet (`abilities`); `ask(..., { auto: true })` already resolves single-option asks for some engine asks, not all (the next turn, a spawn's engaged investigator).

## Goals / Non-Goals

**Goals:** no blocking screen between players; one obvious place to answer "which investigator"; nothing to tap when there is only one answer.

**Non-Goals:** real privacy for strangers sharing a device (dropped; a later change can bring back an opt-in screen); changing the phase pause's Continue.

## Decisions

1. **Remove, don't hide:** `HandOff`, `confirmHandoff`, `revealedFor` and the privacy setting go; `handVisible` becomes "the viewer is the decider or hands are being looked at", so teammates' hands show when looked at (there is no one to hide them from). Saves with `settings.privacy` load fine (ignored). `ENGINE_VERSION` unchanged.
2. **Turn title for turns and own decisions:** it plays when a turn starts and when an investigator who wasn't deciding gets a decision of their own (their own test or choice, in any phase), holding the middle as today; the first turn after the phase title keeps its exception. A help (a commit to a teammate's test, a reaction) plays no title.
3. **Automatic switch to whoever can act:** when `playersCanAct` names someone and the table isn't theirs, the view switches to them after about 1 s with no title; the pulse and the bar's button stay until then and switch at once on a tap.
4. **Avatar choice overlay:** when the pending choice's options are all investigator cards and there are several, an overlay in the middle shows their avatars large with names, lit as the bar lights them; tapping one chooses. With exactly one option (an ask the engine didn't auto-resolve), the overlay shows that avatar for 1 s and then dispatches the choice; a tap chooses sooner. The timer is view state (ADR-0004) and the dispatch is an ordinary `choose`, so undo and replays see a normal action. The engine's `auto: true` asks are unchanged.
5. **Scripts:** `drive-calm.js` and the hand-off checks stop pressing the button; the player-bar tests that assume the pass screen are rewritten.

## Risks / Trade-offs

- [A hidden-hand player loses privacy] → the user asked for it; noted in the README.
- [An auto-pick a second after a choice appears could surprise] → the avatar is shown for the second with the prompt above it, and the feed logs the choice as any other.

## Migration Plan

Old saves load; the privacy field is ignored. Rollback: revert the commit.

## Open Questions

None.
