# ADR-0004: The investigator being viewed is view state; the investigator who decides is game state

- Status: accepted
- Date: 2026-10-17

## Context and Problem Statement

Hot-seat play on one device needs two notions that were one: who the engine is waiting on (the deciding investigator, `pending.inv`, with `active` and `lead` as fallbacks) and whose table is on screen. Letting a player look at a teammate, and letting a teammate's pending move show as a signal before the device changes hands, both need the second to move without the first.

## Considered Options

- A `viewing` override in the view store; `shownInv = viewing ?? viewerOf(game)`; choices are offered only when the shown investigator is the deciding one; `viewing` resets when the decision passes.
- Make the engine track a "current player" that the UI changes when someone looks around.
- No looking: the shown investigator is always the deciding one (today).

## Decision Outcome

Chosen option: "`viewing` in the view store", because the engine stays ignorant of presentation (saves and replays can't depend on who was looking), the privacy rule (`handVisible`) keeps working on the shown investigator, and every component already reads one function for whose table to draw.

### Consequences

- Good, because the hand-off, the can-act signal and any future spectator feature are view-store changes only.
- Good, because tests of "what is shown" stay pure over `(game, view)`.
- Bad, because every component that draws a player's things must read `shownInv`, not `viewerOf`; a stray `viewerOf` draws the wrong table while looking.
- Bad, because an option tap while looking must be refused and explained ("back to Roland"), one more state for the instruction bar.
