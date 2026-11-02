# ADR-0033: Deferred engine rules are typed step kinds

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

The resolution stack routes each step to the one handler registered for its kind, checked by the compiler (ADR-0021, ADR-0025, ADR-0026). One path bypasses it: a `Script` step with code `"__engine"` names one of 19 engine functions by string (`ENGINE_FNS` in `steps/dispatch.ts`), with its arguments in an untyped `EffCtx` read through non-null assertions. 23 engine pushes and 7 content scripts use it; the scripts name `revealLocation`, `assetDefeatCheck` and `basicFight` around `api.ts`. Only one push crosses a would-be import ring (`cards` queuing `assetDefeatCheck` in `investigators`); the rest use it to defer a rule until the steps queued around it have resolved. How should the engine queue a rule to run later?

## Considered Options

- Each deferred rule is a step kind in `STEP` and the `Step` union, with typed fields and one handler in the rules module that owns the rule; scripts queue the ones they need through `api.ts` verbs.
- A typed internal registry: `ENGINE_FNS` keyed by a closed union of names, under one `Engine` step kind.
- Calling the rules directly where no ring forbids it.

## Decision Outcome

Chosen option: "each deferred rule is a typed step kind owned by its rules module", because it is how the other 52 kinds already work: the compiler checks the kind, its fields and its handler, the handler sits beside the rule, and `dispatch.ts` only collects modules' handlers. A registry would keep a dispatch inside the dispatch and the context bag. Direct calls would change resolution order and every recorded game. Content reaches deferred rules only through named verbs, never by naming an engine function.

### Consequences

- Good, because a misspelt or mis-shaped deferred rule fails the typecheck.
- Good, because `dispatch.ts` no longer imports rule functions, and each rule's deferral lives in its owner.
- Good, because scripts no longer name engine internals by string.
- Bad, because `STEP` grows from 52 to 71 kinds.
- Neutral: no recording, save or online move holds a step, so `ENGINE_VERSION` and saves are unaffected; the corpus replays unchanged.
- Follow-up: a new deferred rule is a new step kind; there is no string-named back channel to add it to.
