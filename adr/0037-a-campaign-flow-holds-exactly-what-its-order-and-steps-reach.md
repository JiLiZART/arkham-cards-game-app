# ADR-0037: A campaign flow holds exactly what its order and steps reach

- Status: proposed
- Date: 2026-11-03

## Context and Problem Statement

ADR-0011 made the campaign flow a step language compiled from ArkhamCards' guides. The compiler treated three constructs of the guides as unsupported or ignored them, although they are structure, not game mechanics: the `set_scenarios` effect that sets a campaign's order, the `resolution` step that continues one resolution with another's steps, and the `$`-prefixed shared steps a campaign defines once in its `core` scenario. It also kept every interlude of the guide it was given, so a single-scenario flow carried another scenario's checkpoint. The result was flows whose order, endings and interludes differed from the printed guide in ways no campaign change should repeat.

## Considered Options

- The compiler follows the guide's graph: the order is the `set_scenarios` effect the campaign setup reaches (else the guide's list), a resolution link expands the named resolution's steps in place, a `$` step is resolved in the shared then the own steps, a guide-version test is true, and an interlude is in the flow only when the order holds it or a step names it; the content check reports an interlude nothing reaches.
- Add flow step kinds that mirror the guide (`setOrder`, `gotoResolution`, `shared`) and let the engine resolve them at run time.
- Leave the compiler and fix each campaign's flow by hand in its campaign change.

## Decision Outcome

Chosen option: "follow the guide's graph at compile time", because the step language stays the game's (ADR-0011: the surface is what the game can offer), the engine's interpreter needs no change, `check:content` can verify every reference before a player meets it, and the fixes land once for 36 campaigns instead of 36 times.

### Consequences

- Good, because every generated campaign plays the printed order with its interludes and epilogue, every resolution runs its full text, and the unsupported list counts only what the game truly can't offer.
- Good, because a hand-written flow is held to the same rule: a dead interlude is a content error.
- Bad, because a shared resolution tail is compiled once per resolution that links to it, so its steps repeat under different ids; translations follow by id, so nothing is lost, but the flow files grow.
- Bad, because an order set inside a later choice can't be expressed; no official guide does that beyond Carcosa's reprint question, which the compiler collapses to one order.
- Follow-up: the cycle engine changes add the input and effect kinds the shared steps need (Hemlock Vale's per-investigator choices, The Scarlet Keys' map and time), after which those steps leave the unsupported list without further compiler work.
