# ADR-0030: One input gate decides when a choice can be answered

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

ADR-0002 makes input wait for the animation clock and ADR-0004 keeps who is looking in the view store and what is being decided in the engine. Neither says where "can the player answer now" is computed. Today it is computed in `choose()` (`src/ui/state/store.ts`) and again in about a dozen surfaces, each from a different subset of the event queue, the introduction, the showcase, the stage, the table on screen and the seat. The copies disagree: cards light while `choose` drops their click (the showcase, the introduction), and a deck lights while events play. How should the UI decide whether a choice can be answered?

## Considered Options

- One pure function over plain data (pending choice, event clock, intro, showcase, stage, viewing, seats) that returns open or closed with a reason; one hook for components; `choose()` calls the same function.
- Keep the check in `choose()` only and let surfaces light whatever is pending (a dropped click is harmless).
- A shared `busy` selector, with each surface still adding its own extras.

## Decision Outcome

Chosen option: "one pure function, one hook, and `choose()` calls it", because the screen and the store can then only disagree by a bug in one place, the rule is tested in Node without React, and a new surface or a new reason (a new overlay that holds the screen) is one edit. Checking only in `choose()` leaves lit cards that do nothing, which is what players report as "not playable cards". A shared `busy` selector fixes the most common copy but keeps the extras divergent.

### Consequences

- Good, because what is offered and what is taken are the same by construction, at every pace and in online rooms.
- Good, because the reason (`animating`, `intro`, `showcase`, `middle`, `notYourSeat`, `notShown`) lets a surface pick its look (dim or hide) without deciding input.
- Bad, because a change to the gate changes every surface at once; a surface that needs an exception has to argue for a new reason rather than add a local test.
- Bad, because the store reads the view store to build the input, as it already does for `intro`; the dependency is now load-bearing.
- Follow-up: option placement (ADR-0031) is computed behind the gate; typed stage claims (`ui-event-conductor`) replace the gate's reading of string claims.
