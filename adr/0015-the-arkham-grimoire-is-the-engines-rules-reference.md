# ADR-0015: The Arkham Grimoire is the engine's rules reference; deviations are stated in the spec

- Status: accepted
- Date: 2026-10-20

## Context and Problem Statement

The engine was written from the rulebook and from whatever each card being implemented needed. Nothing named a single rules authority, so a handler's behaviour was right when its tests passed, and its tests encoded whoever wrote them's reading of the rules. An audit against the Arkham Grimoire (`inspired/arkham_grimoire-web.md`), the complete rules reference, found fourteen places where the engine disagreed with it (failed attacks, helper commits, automatic results, unique cards, exhaust timing, among others), some of them encoded in tests. One deliberate deviation already exists (assets with no uses left are discarded) and is stated in the game-engine spec; the others were accidents nobody could tell from choices.

## Considered Options

- The Grimoire is the rules reference: a rule the engine implements behaves as the Grimoire says; a deliberate deviation is written in the game-engine spec as one, with its reason; anything else that disagrees is a bug.
- The rulebook (Learn to Play) is the reference, the Grimoire consulted for edge cases.
- No named reference; each change decides from the cards it implements.

## Decision Outcome

Chosen option: "the Grimoire is the rules reference", because it is the document that settles timing (framework events, player windows, the skill-test steps) and edge cases, which are exactly where the engine went wrong, and it is in the repository. The rulebook leaves those cases out; no reference left the accidents undetectable.

### Consequences

- Good, because an audit against one document can find every disagreement, and a reviewer can tell a bug from a choice by looking in the spec.
- Good, because card changes (one per pack) write against fixed rules instead of re-reading them.
- Bad, because the Grimoire is a living document: a newer version may change a ruling, and the engine must follow with its own change.
- Bad, because a deliberate deviation now costs a spec sentence and a reason, which is more friction than writing the code.
- Follow-up: when the Grimoire in `inspired/` is updated, audit the difference against the engine.
