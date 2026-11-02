# ADR-0026: Closed sets of strings are constant objects

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

The engine writes its closed sets of strings as bare literals: zones (about 250 sites), phases, step kinds (about 300), pending choice kinds, skill test stages. They are typed unions, so a typo fails the typecheck, but the values are repeated everywhere. Event types are worse: `GameEvent.type` is `string`, the engine emits 77 distinct types and scripts more, and 99 comparisons `type === "..."` go unchecked, though the UI's feed, sounds and animations switch on them. The repository has no TypeScript `enum`; its idiom for closed sets is an `as const` array with `z.enum` in the content schema. How should these sets be written?

## Considered Options

- A constant object per set (`export const ZONE = { Enemy: "enemy", ... } as const`) with its type derived from it, every site using it; event types become such a set.
- TypeScript `enum`s.
- Keep the literal unions and type only `GameEvent.type`.

## Decision Outcome

Chosen option: "a constant object per set", because each set's values are then written once, a reader sees the set's name at each use, the values stay the same strings (so the state's JSON, saves, recordings and translations are untouched), and it is plain TypeScript in the project's existing `as const` idiom. String `enum`s are nominal: the plain strings in a parsed save, a recording or a zod-checked card file are not assignable to `Zone.Enemy` without a cast, and `const enum`s can't be shared across files under the project's `isolatedModules`. Typing only events fixes the unchecked set but leaves the repetition the user wants gone.

### Consequences

- Good, because a misspelt event type fails the typecheck, and so does a step handler missing from the dispatch table.
- Good, because renaming a value is one edit, and the sets a module depends on are visible in its imports.
- Bad, because `card.zone === ZONE.Enemy` is longer than `card.zone === "enemy"`, and every site changes once.
- Bad, because the event catalogue must list the event types scripts emit too, so a script's new event type is a catalogue entry.
- Follow-up: a lint rule refusing bare literals where a constant exists, after the codemod.
