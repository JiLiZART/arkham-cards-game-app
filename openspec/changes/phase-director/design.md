## Context

- The engine resolves a phase in one `dispatch`; the UI replays the `ANIMATED` events one by one in `EventPlayer` with fixed `DURATION`s, and already supports a "wait for the player" branch (`waits`) for the chaos token and test result when `drawByHand` is on.
- `PhaseTitle` derives its queue from new `phase` log entries; the feed hides some entry types through `HIDDEN`. Both show how a log-derived component works here.
- The map camera (`MapCamera` in `Table.tsx`) eases to `focus`, which is the deciding investigator's location.
- `view.playing` holds the event currently playing and `view.spotlight` what it is about (from `spotlightOf`).
- Enemy moves (`enemyMove`) aren't animated events today: the card's position changes in the layout and the mesh slides there.

## Goals / Non-Goals

**Goals:**
- One log-derived caption, no new timer system.
- The camera and the spotlight read the same event, so they always agree.
- Tap mode reuses the existing wait branch.

**Non-Goals:**
- The phase ribbon, the turn order and enemy intents (round-tracker).
- Rewording prompts and the instruction bar (choice-bar). The caption takes the prompt's slot and the choice-bar later shares it.
- Per-event pace tuning. Three fixed values.

## Decisions

### 1. Steps are log entries emitted by the phase handlers
`emit(g, "step", text, { inv?, data: { step, phase } })` at the start of each automated step:
- `mythosHandler`: `doom` before pushing `PlaceDoom` (only when an agenda is in play), so `PlaceDoom` from card effects doesn't log a step.
- `mythosDrawHandler`: `encounter` with the investigator, before `DrawEncounter`.
- `hunterMovesHandler`: `hunters` on the first entry (`done` empty) when the filtered list is non-empty.
- `enemyAttacksHandler`: `attacks` on the first entry when an attack is about to be pushed.
- `upkeepHandler`: `upkeep` after the ready event, before the draws.
- `handSizeHandler`: `handSize` with the investigator when `excess > 0` and `step.choice` is undefined (the first visit).

*Why log entries, not steps or state:* the UI already derives everything from the log and the queue; a step entry needs no new state, is replay-safe, and the Journal gets its section lines for free. *Alternative:* a `view.step` set by the UI from event shapes (an `attack` event implies "Enemies attack"). It can't tell an enemy-phase attack from an attack of opportunity, and it would have to guess the hunters step from an `enemyMove`.

### 2. The caption is derived from the shown log
`StepCaption` reads the feed's `shown` count (entries up to the next unplayed animated event) and shows the latest `step` entry at or below it, provided an event is playing or queued, or the entry is the last thing in the log and no choice is pending yet. It clears when a choice is pending and nothing plays. No timers: the caption changes exactly when the events it introduces start playing, because `shown` moves with `current`.

The `step` type joins `HIDDEN` for the live feed. The Journal renders it as a `feed-step` divider.

### 3. Enemy moves join `ANIMATED`
`enemyMove` gets a 800 ms `DURATION` and is a stage-free event (not `CENTER`). `spotlightOf` already picks `e.card`, so the dim and lift work. The mesh's travel is the existing position tween; the event only gives it time. `FLOAT_KINDS` doesn't include it.

### 4. The camera focus comes from the playing event
`SceneInner` computes `focus` as today, then overrides it while `view.playing` is set: the location of `playing.card` if it is an enemy or a location, the location of `playing.inv`, or `data.at` for a spawn. `focusKey` includes the event's `logIndex` so `MapCamera` eases once per event. A drag sets a `view.camHeld` flag that the next event clears, so the player wins while the event lasts. Reduced motion: `MapCamera` already jumps when motion is reduced (confirm; otherwise add the branch).

*Alternative:* a `cameraCommand("look", id)` fired from `EventPlayer`. Two sources of truth for the focus; the derived override keeps one.

### 5. Pace is a setting read by EventPlayer
`pace: "normal" | "slow" | "tap"` in `UiState`, persisted in `settings` beside `drawByHand`. In `EventPlayer`:
- duration = `DURATION[type] * (pace === "slow" ? 1.6 : 1)`;
- `waits` becomes `byHand && (token || testResult) || pace === "tap" && TAP.has(type)`, where `TAP` = encounter, token, testResult, attack, spawn, enemyMove, enemyDefeated, defeated, agendaAdvance, actAdvance, resolution.
`StepCaption` shows a Next button while `waits` holds, and a window keydown for Space/Enter calls `nextEvent` (guarded so the showcase and phase pause keep their own handling: only when `view.playing` is a held event). Clicking the spotlit card also continues.

Tap mode and `drawByHand`: the token draw already waits for the circle click; in Tap mode it keeps that, and the result panel's Continue serves as Next.

## Risks / Trade-offs

- **The camera hops during a busy enemy phase.** Each hop is eased and lasts an event (≥ 450 ms); follow-on events (damage) keep the same focus because they name the same enemy or investigator. If it still feels jumpy, drop `inv`-only events from the override.
- **A step with no visible event** (upkeep when every draw is for a hidden hand) shows a caption with nothing playing. Acceptable: the caption clears as soon as the next choice is pending, and the draws still fly to the piles.
- **Tap mode makes a long enemy phase many taps.** That is what the setting is for; Normal stays the default. Space held down doesn't auto-repeat through events (keydown with `repeat` ignored).
- **Old saves gain log entries on replay.** Harmless: the log is derived, and the Journal just shows the new dividers.
