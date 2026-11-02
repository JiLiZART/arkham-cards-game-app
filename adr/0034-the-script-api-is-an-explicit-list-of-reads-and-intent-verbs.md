# ADR-0034: The script API is an explicit list of reads and intent verbs

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

`src/engine/api.ts`, the only module card and scenario scripts may import, re-exports six engine modules wholesale: about 175 names, of which scripts use 90. Scripts queue engine steps by writing step objects (127 literals over 20 step kinds, 110 `push` calls), so the step union's kinds and required fields are part of the content contract. ADR-0027 gave scripts a run and ADR-0028 one way to find scripts; what scripts can call is still whatever the core happens to export. What should the script API be?

## Considered Options

- An explicit export list in `api.ts`, pinned by a test, with one intent verb per step kind scripts queue; verbs build an opaque value and `queue(game, ...)` pushes them in resolution order; the step union, `STEP` and `push` stay inside the engine.
- The same, with verbs that push at once.
- Keep `export *`; export typed step builders but leave `push` and `STEP` available.
- Split `context.ts` so a script-facing module can be re-exported whole.

## Decision Outcome

Chosen option: "an explicit list with verbs and `queue`", because it makes the content contract a list someone reads and reviews, and lets the engine reshape its steps without touching content. Verbs that push at once would resolve last-call-first, the opposite of reading order, and break the 8 scripts that queue several steps at once unless rewritten in reverse. Leaving `push` and `STEP` available keeps the step union in the contract. Splitting `context.ts` is a larger refactor that still needs a list of what scripts may call.

### Consequences

- Good, because the script surface is a named list, and adding to it is a visible diff a test catches.
- Good, because a step can gain, lose or rename a field with only its verb changing.
- Good, because scripts read as what they do (`spawn`, `dealDamage`, `placeDoom`), not as stack entries.
- Bad, because every script that queues steps is rewritten, and each new step kind a script needs gets a verb first.
- Bad, because `queue(game, verb(...))` is one level more than a direct call.
- Follow-up: verbs on the run, filling the source from it; pinning type exports too.
