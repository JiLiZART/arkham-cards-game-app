# ADR-0029: Engine tests drive games through a scenario driver

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

The engine's tests get a game to the moment they care about by hand: rigged chaos bags cast `as never` (39), loops answering until the turn prompt (29 lines), local `toTurn`/`finish`/`until`/`offered`/`fresh` helpers (19 files), reaction windows found by reading `pending.step` (12 lines), and 46 lines in 16 files reading or writing `queue` or `skillTest`. Those tests pin the step stack's shape, so changing the stack (typed continuations, script verbs) breaks tests that are about something else. ADR-0025 says where tests and kits sit, not what a test may look at. What should an engine test drive the game with, and what may it read?

## Considered Options

- A scenario driver in `kits/` (start at the first turn, rig the bag, answer until the turn prompt or a reaction window, take actions by intent, read the last test's result from events); tests assert on prompts, events and the core's lookups only, and a ratchet in the boundary test keeps the files that still read the step stack from growing.
- The same driver as a convention, without the ratchet.
- Keep the testkit as it is and let each file grow its own helpers.

## Decision Outcome

Chosen option: "a scenario driver, with tests limited to prompts, events and views, and a ratchet", because it is what makes the step stack private in practice: the driver and `mutate` are the only test code that know the stack's shape, so a change to it is fixed in one file. The convention alone is what led to today's count. The step stack's own tests (`steps/__tests__/`) still read it; it is their subject.

### Consequences

- Good, because changing the step stack touches `kits/driver.ts` and the stack's own tests, not 16 files.
- Good, because a test reads like a game: setup, a few actions, what the player sees.
- Good, because actions picked by option value, not label, survive label changes and the Russian locale.
- Bad, because a driver's neutral answer can differ from a hand-written loop, so migrating a test can change what it reaches; files move one at a time.
- Bad, because the ratchet is a text match over test files, with possible false positives.
- Follow-up: UI tests may adopt the driver later; the files left on the ratchet's list move when next edited.
