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

### 2. The caption is derived from the log and the playing event
`captionIndex` (pure, in `feed.ts`) picks the latest `step` entry at or before the playing event (or before the feed's `shown` count when nothing is current), looking back no further than the current phase's `phase` entry. It shows while events play or are queued, or while something else holds the stage (drawn cards after upkeep), but not during a phase pause. The prompt banner gives way while a caption shows. No timers.

*Why the playing event, not `shown`:* `shown` runs ahead to the next queued event, so a caption from it would name the next step while the previous event still plays. *Why the phase, not the last choice:* a step goes on across choices inside it (a reaction to an attack), so bounding by the last burst cut "Enemies attack" off after a Dodge window.

The `step` type joins `HIDDEN` for the live feed. The Journal renders it as a `feed-step` divider.

### 3. Enemy moves join `ANIMATED`, and wait for their beat on the table
`enemyMove` gets a 800 ms `DURATION`, is a stage-free event (not `CENTER`), joins the spotlight's event set and stays out of `FLOAT_KINDS`.

The table lays cards out from the final state, so a hunter would slide at dispatch, before its event. The engine now logs the move's origin (`data.from`, log-only). `heldGame(game, queue)` shows an enemy whose move is still queued at its origin and unengaged; `Table` and `PlayStrip` render from it. When the move plays, the existing position tween carries the card to its destination during the event.

### 4. The camera focus comes from the playing event
`SceneInner` computes `focus` as today, then overrides it while `view.playing` is set: the location of `playing.card` if it is an enemy or a location, the location of `playing.inv`, or `data.at` for a spawn. `focusKey` includes the event's `logIndex` so `MapCamera` eases once per event. A drag sets a `view.camHeld` flag that the next event clears, so the player wins while the event lasts. Reduced motion: `MapCamera` already jumps when motion is reduced (confirm; otherwise add the branch).

*Alternative:* a `cameraCommand("look", id)` fired from `EventPlayer`. Two sources of truth for the focus; the derived override keeps one.

### 5. Pace is a setting read by EventPlayer
`pace: "normal" | "slow" | "tap"` in `UiState`, persisted in `settings` beside `drawByHand`. In `EventPlayer`:
- duration = `DURATION[type] * (pace === "slow" ? 1.6 : 1)`;
- `waits` becomes `byHand && (token || testResult) || pace === "tap" && TAP.has(type)`, where `TAP` = encounter, token, testResult, attack, spawn, enemyMove, enemyDefeated, defeated, agendaAdvance, actAdvance, resolution.
`needsNext(event, pace, byHand)` decides whether the caption shows Next: a held event without a button of its own. The caption renders for a held event even when no step applies (an attack of opportunity in the investigation phase), so a held event always has Next, and the prompt banner gives way meanwhile. Space/Enter (not auto-repeat) calls `nextEvent` only while `view.playing` needs Next, so the showcase and the phase pause keep their own keys. Clicking the spotlit map card also continues.

Tap mode and `drawByHand`: the token draw keeps its circle click. The result panel shows its Continue at the Tap pace even when drawing by hand is off, and that Continue serves as Next.

## Risks / Trade-offs

- **The camera hops during a busy enemy phase.** Each hop is eased and lasts an event (≥ 450 ms); follow-on events (damage) keep the same focus because they name the same enemy or investigator. If it still feels jumpy, drop `inv`-only events from the override.
- **A step with no visible event** (upkeep when every draw is for a hidden hand) shows a caption with nothing playing. Acceptable: the caption clears as soon as the next choice is pending, and the draws still fly to the piles.
- **Tap mode makes a long enemy phase many taps.** That is what the setting is for; Normal stays the default. Space held down doesn't auto-repeat through events (keydown with `repeat` ignored).
- **Old saves gain log entries on replay.** Harmless: the log is derived, and the Journal just shows the new dividers.
