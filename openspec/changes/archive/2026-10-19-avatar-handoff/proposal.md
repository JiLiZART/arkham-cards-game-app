## Why

With hidden hands on, every time the decision passes to another investigator a "Pass to Daisy" screen stops the game until the player presses "I'm Daisy Walker — show my hand". One person playing two investigators presses it dozens of times a scenario, and the pulsing avatar for "Daisy can commit cards" is one more tap. Investigator choices (who takes the damage, who plays next) are answered on the bar's small avatars, with no sign in the middle of the screen, and a choice with a single eligible investigator still waits for a tap.

## What Changes

- The "Pass to" screen is removed, and with it the "Hide hands between turns" setting: the deciding investigator's hand is always shown. When a turn begins or an investigator gets a decision of their own (their own test, in any phase), the existing turn title (portrait and name across the middle) announces them; a help to a teammate (a commit window, a reaction) switches quietly.
- When someone other than the active investigator can act (a commit to a teammate's test, a reaction), the table switches to them by itself after about a second; their avatar pulses with the label meanwhile, and a tap switches sooner.
- Every choice among investigators is shown as a row of large avatars across the middle of the screen (the bar's avatars keep working); a choice with a single eligible investigator shows that avatar for about a second and is made automatically.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: hot-seat play without the pass screen; turn title on every change; automatic switch to whoever can act; investigator choices as avatars with the single-option auto-pick.

## Impact

- `src/ui/hud/Hud.tsx` (HandOff removed), `src/ui/scene/Table.tsx` (`handVisible`), `src/ui/store.ts` and `Settings.tsx` (the privacy setting goes; old saves ignore it), `src/ui/players.ts` and the turn-title and someone-else-can-act logic, a new avatar-choice overlay, `src/ui/hud/Investigators.tsx`; strings; the drive scripts and tests that press the pass button.
- No engine change: the auto-pick dispatches an ordinary choice, so replays and saves are unaffected.
