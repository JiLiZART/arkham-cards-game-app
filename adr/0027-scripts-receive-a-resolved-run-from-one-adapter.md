# ADR-0027: Scripts receive a resolved run from one adapter

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

Data effects get a resolved `EffectRun` (step, investigator, source card) from one runner, but script functions in `content/**/scripts` get `(game, ctx, args?: any, step?)` and resolve everything themselves: 109 `ctx.you!`, 42 `ctx.source!`, 48 `step!`, 36 `if (choice === undefined) return` guards after `ask`, 26 copies of the same option map. Three engine sites call script functions (the Script step, a chaos token's `run`, a scenario setup step), and the eliminated-investigator guard is written twice. What contract should a script function have with the engine?

## Considered Options

- A script function is `(game, run)`: the run has the investigator (always set), the source card (an error naming the script when absent), the step (always set), the rest of the context and `args: unknown`, plus choice verbs. One adapter builds the run, is the only caller of a script function, owns the eliminated guard and auto-pick, and ends a script that has to wait for a choice by a private signal, so code after a choice verb only runs with a value.
- The same run, with choice verbs returning `T | undefined` and the guard left in each script.
- Generator scripts that `yield` a choice.
- Keep the raw signature and only replace `any` with `unknown`.

## Decision Outcome

Chosen option: "a run from one adapter, with waiting ended by the adapter", because it gives scripts the same resolved inputs effect handlers already have and moves the re-entry protocol (prompt, rerun with the choice) out of 36 scripts into one place. Keeping `T | undefined` leaves the protocol spread across scripts. Generators cost every script its shape and still rerun on resume, since the stack is plain JSON and a generator can't be saved. Only fixing `any` leaves the assertions and guards. A step that resumes still runs again from the top, as today, so the rule "change nothing before the first choice" stays.

### Consequences

- Good, because script code has no non-null assertions on its inputs, and a missing source fails where it is read, naming the script.
- Good, because the auto-pick, the eliminated guard and the re-entry rule are each written once and tested once.
- Good, because no script type uses `any`.
- Bad, because ending a waiting script by a thrown signal is a new pattern in the engine; a script that catches errors could swallow it.
- Bad, because every script function under `content/` changes signature at once (by a codemod) and the choice calls are rewritten by hand.
- Follow-up: `engine-script-registry` types hooks and looks scripts up in one place; `engine-script-verbs` gives scripts intent verbs instead of step literals.
