# ADR-0028: Scripts are found through one registry, with typed hooks

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

The engine indexes `db.scripts` itself in 24 places across 12 files, and the UI, the content loader and the replay tracer do it too. "The card's own function, else the scenario's" is written three ways in the engine and a fourth, looser, in the loader. Hooks are `Partial<Record<string, ScriptFn>>`: a misspelt name type-checks and never runs, two hooks return results by mutating their argument, and one is a presence flag. ADR-0027 made one adapter the caller of script functions, but not the finder. Where should scripts be looked up, and what may a hook be?

## Considered Options

- A registry of lookup functions in `world/scripts.ts`, the only reader of `db.scripts` besides the loader that fills it; one fallback rule for functions and conditions; a typed `ScriptHooks` list with a signature per hook and results returned; calls to functions and hooks only through the adapter in `rules/scripts.ts`; a boundary test refusing other reads.
- A registry object built at load time, holding resolved functions.
- Keep direct reads; type the hook names only.

## Decision Outcome

Chosen option: "lookup functions in `world/`, typed hooks, calls through the adapter", because it gives one place to change how scripts are found and lets the compiler refuse a hook the engine never fires. Lookups sit at the lowest layer so `queries.ts` can reach conditions and modifiers without bending the one-way imports of ADR-0025, while calling stays in `rules/`, above `context.ts`'s `ask`. A load-time object would be a second copy of `db.scripts` to keep in step with the loader and the replay tracer, which wraps members on the loaded objects. Typing hook names alone leaves the fallback rule written three ways and lookups spread over the engine.

### Consequences

- Good, because a misspelt or unknown hook, or a hook with the wrong signature, fails `pnpm typecheck`.
- Good, because "card, else scenario" is one function, and the engine, the loader and the UI use it.
- Good, because a new script member is listed once, and the replay tracer's unrun list can't miss it.
- Bad, because adding a hook means adding it to `ScriptHooks` and a fire site, not just calling a name.
- Bad, because the scripts with `spawnRedirect`, `healHorror` and `searched` change shape in content.
- Follow-up: splitting `CardScript` into card, investigator and scenario scripts would let the compiler also refuse a scenario hook on a card.
