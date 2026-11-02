# ADR-0031: Option placement is one pure function every surface reads

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

There is no option sidebar: each option of the pending choice is offered on the card or control it belongs to. `optionHome()` names a home per option and a test checks over bot playthroughs that every option has one, but most surfaces key `pending.options` by card themselves (`useOptionsByCard`, `useCardOptions`, hand-written filters, `investigatorOptions`, `deckOptions`), so the tested placement is not the one on screen. ADR-0005 adds a layout mode in which the instruction bar takes the rail's and the act's options. Where should "which surface offers this option" be decided?

## Considered Options

- One pure function `placeOptions(game, looking, mode)` returning, per home, the options and a by-card map; a fixed list of mirrors (an option offered in two places); every surface reads its slice through one hook behind the input gate (ADR-0030).
- Keep the per-surface by-card lookups and delete `optionHome` and its test.
- One function per surface (`handOptions`, `boardOptions`…).

## Decision Outcome

Chosen option: "one placement function with explicit mirrors, read by every surface", because "every option is reachable, and a card never offers one twice" can only be tested where all homes are decided together, and the test then checks what the player sees in both layout modes. Per-surface lookups leave the property untestable; one function per surface can't see the other homes.

### Consequences

- Good, because the reachability test covers the screen as drawn, desktop and phone.
- Good, because a new surface or a new mirror is a change to one function and its test, not a new filter in a component.
- Bad, because every surface that offers options depends on one module; its homes are a closed set that a new surface has to join.
- Bad, because mirrors are a list to maintain; a mirror missing from it shows up as an option the phone can't reach, which the test catches.
- Follow-up: a typed `ChoiceOption.value` in the engine would remove the UI's narrowing on `pending.kind`.
