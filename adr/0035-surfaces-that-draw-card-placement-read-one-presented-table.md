# ADR-0035: Surfaces that draw card placement read one presented table

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

ADR-0002 makes sound, floats and the dim follow the animation clock (`view.playing`), not the event log. It says nothing about state: the store holds the engine's state as soon as a dispatch returns, while that dispatch's events still play. The map and the play strip each hold back queued enemy moves and cards waiting for the showcase (`heldGame`, `heldCards`); the investigators' modal, the phone's strip modal and the encounter discard pile don't, so they show the outcome before it has played. Counters run ahead everywhere, and the engine's events carry deltas, not prior values. Which surfaces should show the table as played so far, and how?

## Considered Options

- One pure `presented(game, current, queue)` giving the game with placement held back (queued enemy moves, cards waiting for the showcase) and one hook; every surface that draws where cards are reads it; the pending choice, the hand, the feed and the counters read the live game.
- Every surface reads the presented game.
- The store holds back `game` itself until the queue drains.

## Decision Outcome

Chosen option: "one presented table for placement; the choice and the counters stay live", because placement is what the two existing rules already hold and can be held from the events alone, while the pending choice must stay the engine's (undo, online moves and the input gate key off it) and counters can't be rewound without prior values. Switching every reader would hide which surfaces matter and still leave counters ahead; holding the store's `game` would make a second game state in the UI.

### Consequences

- Good, because the map, the strip and the modals can't disagree about where a card is while events play.
- Good, because a new surface that draws placement has one hook to use, and a new held rule (a card travelling to the victory display) is one edit.
- Bad, because counters still change before their events play; the line between "placement" and "counter" has to be kept in reviews.
- Follow-up: holding counters needs prior values in the events or from the engine; a later decision.
