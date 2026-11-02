# ADR-0036: The UI reads the engine through one read entry point

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

ADR-0022 made the UI read cards and investigators through the core's lookups, and ADR-0025 layered the engine's own modules, but neither says which engine modules the UI may import. The UI imports the core's lookups, `queries.ts`, four `rules/` modules and the campaign modules directly, and to call any query that takes the engine's `GameContext` it builds `{ s: game, db, events: [] }` by hand (7 sites outside tests). The scripts' surface, `api.ts`, is unused by the UI and is being narrowed to what scripts need. Which part of the engine is the UI's to read, and who builds the context?

## Considered Options

- An engine entry point for reading, `src/engine/read.ts`, in ADR-0025's top layer: the lookups over a state, a `readGame(db, state)` reader that builds the context and answers the queries the UI needs, and the campaign reads; a UI test refuses imports of other engine modules (types, the closed sets of strings, `index.ts` and the bot aside).
- A UI-side adapter wrapping the same functions with the app's content bound in, the engine unchanged.
- The UI imports `api.ts`.
- Keep today's direct imports and add a shared `gOf` helper in the UI.

## Decision Outcome

Chosen option: "an engine entry point for reading", because the engine is the one that knows which of its functions only read, and keeping that list next to them means a rules change that affects it is seen in the same folder and tested by engine tests. A UI-side adapter would remove the hand-built contexts too, but would hold that list outside the engine. `api.ts` is the scripts' surface and includes writes. A shared helper would keep every rules module a possible UI dependency.

### Consequences

- Good, because the UI never builds the context the rules write in, and a read can be tested not to change the state.
- Good, because "what the UI depends on in the engine" is one file's exports plus a short list, enforced by a test.
- Good, because shared derived numbers (an investigator's summary) live once, beside the queries they come from.
- Bad, because a new UI need is a line in `read.ts` before it is a line in a component.
- Bad, because the engine now has three entry points (`index.ts`, `api.ts`, `read.ts`) to keep apart.
- Follow-up: the game store's campaign writes could go through `index.ts` alone, removing its exception (`ui-move-seam`).
