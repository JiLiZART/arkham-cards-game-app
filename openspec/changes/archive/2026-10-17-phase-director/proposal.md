## Why

Between two choices the engine resolves a whole phase at once, and the screen replays it as a cascade: doom, two encounter cards, a hunter sliding across the map, two attacks, then upkeep, with nothing saying which step the game is in or where to look. The camera stays on the player while enemies act elsewhere. Timings are fixed, so a player who wants to follow along can't slow the game down. Turn-based games solve this with a director: a caption for each step, the camera on whoever acts, and a pace the player controls.

## What Changes

- **Step events.** The engine logs the start of each automated step of a phase: doom in the mythos phase, each investigator's encounter draw, hunters moving, enemies attacking, upkeep's ready/draw/resource, and the hand-size check. A step is logged only when it does something (no "Hunters move" without a hunter). These are log entries, not choices: saves and replays are unaffected.
- **Step captions.** While a step's events play, a caption under the top bar names it with its actor: "Enemies attack", "Roland draws an encounter card". It sits where the prompt sits when there is a choice, so the top of the screen always says either what is happening or what to do.
- **The camera follows the event.** While an animated event plays, the map pans to the card or investigator it is about (the hunter that moves, the enemy that attacks, the location a card spawns at) and returns to the deciding investigator when input is needed.
- **Enemy moves get a beat.** A hunter's move becomes an animated event with the spotlight, instead of a card sliding while the feed says so.
- **Pace setting.** A menu setting with three values: _Tap_ (each big event waits for a tap, Space or Enter, like the chaos token draw by hand), _Slow_ (longer timings) and _Normal_ (today's timings). Saved with the other settings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: adds the step events requirement.
- `game-table-ui`: adds step captions, the event camera, the enemy-move beat and the pace setting.

## Impact

- `src/engine/rules/flow.ts`, `enemies.ts`, `scenario.ts`, `investigators.ts`: emit `step` events. Engine tests cover when a step is and isn't logged.
- `src/ui/store.ts`: `ANIMATED` gains `enemyMove`; a `pace` setting in the save's settings.
- `src/ui/hud/Hud.tsx` (`EventPlayer`): durations scale with the pace; Tap mode generalises the existing `waits` branch.
- New `src/ui/hud/StepCaption.tsx` in the centre column, with the Next button for Tap mode.
- `src/ui/scene/Table.tsx`: the camera focus comes from the playing event when there is one.
- `src/ui/feed.ts`: `step` entries hidden from the live feed, shown as dividers in the Journal.
- `src/ui/Screens.tsx` and `content/i18n/{en,ru}/ui.json`: the setting and the caption strings.
