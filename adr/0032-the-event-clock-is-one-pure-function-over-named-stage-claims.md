# ADR-0032: The event clock is one pure function over named stage claims

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

ADR-0002 makes every presentation channel (the table, sound, floats, the spotlight) follow `view.playing`, which `EventPlayer` sets. That component decides, inside hooks and effects, whether the current event is on screen, whether it waits for the player and how long it holds; its pace tables live in the game store's module and nothing tests it. The middle of the screen is ordered by a stage of string claims (`test:`, `event:`, `pause:`, `title:`, `turn:`, `showcase`, `intro`), and seven components ask "is it free?" with their own inline prefix checks, which mean three different things. ADR-0002 already names the risk: any change to how `EventPlayer` decides affects every channel at once. Where should that decision, and the question of who may use the middle, live?

## Considered Options

- One pure function, `conduct`, from the current event, the stage, the settle mark, the pace and the draw-by-hand setting to what plays, the claim it needs and how it advances; the stage keeps a FIFO of strings, but claims are built from a closed set of kinds and freedom is asked through three named predicates beside `conduct`.
- Keep the logic in `EventPlayer` and add component tests with a DOM and fake timers.
- A store slice that owns the queue's timer and the stage.

## Decision Outcome

Chosen option: "one pure function over named stage claims", because the clock is a rule, not a view: as a function it is tested in Node against recorded games at every pace, and the component that runs it is left with a timeout and two `setState` calls. Component tests would test the same rule through React and timers, slower and with less reach. A store slice would put a timer in the store, whose tests run synchronously, and would duplicate `current` and `queue`. Naming the stage's kinds and its three kinds of freedom turns "which overlays wait for which" from seven copies into one module the spec can describe.

### Consequences

- Good, because the timing every channel follows is covered by tests, which is what ADR-0002's last consequence lacked.
- Good, because a new overlay picks a claim kind and one of three predicates instead of writing a prefix check.
- Good, because the stage's stored form doesn't change: its queue tests and debugging stay as they are.
- Bad, because there is one more module between a component and the stage; a reader of `EventPlayer` has to open `conductor.ts` to see why an event waits.
- Bad, because the title queues (`PhaseTitle`, `TurnTitle`) still decide their own timing in their components; the clock is whole only for queued events.
- Follow-up: the input gate (`ui-input-gate`) asks the stage through these predicates; the title queues may join the conductor later.
