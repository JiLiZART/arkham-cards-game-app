## Why

A treachery test drawn in the mythos phase (Crypt Chill, "Chill of the Grave" in Russian) opens the skill-test screen with no Done: the step caption "Roland Banks draws an encounter card" keeps the instruction bar's place while the test screen holds the middle, so the window can never be closed. It is a soft lock in every mythos test for an investigator who holds a matching card (the engine skips the window otherwise), reproduced with a Ghoul engaged in the strip as reported, which turned out not to matter. Two smaller things come with it: the test screen's line ("Willpower test · 3 vs 4") is centred on a column left of the calculation strip, so the two don't line up; and when the game locks there is no easy way to send me the state, so a copy-paste game report is added.

## What Changes

- **The caption yields to the instruction bar whenever a choice waits for the player and only the skill-test screen holds the middle.** The commit window's Done is back in the mythos phase. The caption still shows while events play and while the hand showcase holds the middle after an upkeep draw.
- **The test screen's line is centred on the screen**, on the same axis as the calculation strip, instead of on the asymmetric middle column.
- **A game report to copy and paste.** The Debug panel gets **Copy report**: the replay log (setup, actions, campaign), the settings, the view (who is looked at, privacy), the pending prompt and the app version as one JSON on the clipboard (with a fallback that selects the text when the clipboard is refused). **Paste report…** loads such a report (a textarea and Load), which replays it, so a pasted report recreates the exact table.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: MODIFIED "Step captions" (yields to a waiting choice when only the test screen holds the middle); ADDED "Skill-test line alignment"; ADDED "Game report".

## Impact

- `src/ui/feed.ts` (`captionIndex` input: the stage keys that count as busy) and `src/ui/hud/StepCaption.tsx`; `feed.test.ts`.
- `src/ui/styles.css` (`.st-middle`).
- `src/ui/store.ts` (`exportReport`/`importReport` beside `exportLog`/`importLog`), `src/ui/hud/Hud.tsx` DebugPanel, strings in en and ru.
- Scripts: a new `check-mythos-test.js` (the reported flow, through the store, to Done and the draw); `check-treachery-test.js` extended with the mythos case.
