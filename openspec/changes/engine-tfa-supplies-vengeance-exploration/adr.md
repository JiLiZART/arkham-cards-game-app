# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036, 0045, 0046, 0050, 0082, 0083 are in force (0027 onward proposed; no `Supersedes` links in `adr/`).

- ADR-0011 campaign flow as a typed step language: kept; the supply steps and the computed amount are new step kinds and a new `FlowAmount` value in the same language, and lift four kinds off the compiler's unsupported list, as the ADR's follow-up foresaw.
- ADR-0013 a card works when every printed line is accounted for: kept; the supply, vengeance, explore and poison lines get line rules in `implemented.ts` in this change, as the ADR's follow-up requires for a new data-driven line.
- ADR-0021 to ADR-0024 the store, views, tables and piles: kept; the exploration deck is one more pile, supplies and counters are tables or flags, vengeance is a card field read through the views.
- ADR-0025 one-way imports, ADR-0026 closed sets as constants: kept; `ZONE.Exploration`, `STEP.Explore`, the `SUPPLY` names and the symbol set join the constant objects; the Explore handler sits in `rules/scenario.ts`.
- ADR-0028 and ADR-0034 scripts through one registry, an explicit API of reads and verbs: kept; scripts reach the Explore step, `poison` and the deck verbs through `api.ts`, and read `vengeanceInVictory` and `hasSupply` through it.
- ADR-0033 deferred rules are typed step kinds: followed; Explore is a step kind with typed fields, not a string-named function.
- ADR-0050 the scenario records what the guide asks: followed; Yig's Fury and the supplies are recorded by the engine, never asked.
- ADR-0004 deciding is game state: kept; the supplies' copy in the game state is what cards decide on, the log is what persists.
- ADR-0001 to 0003, 0005 to 0010, 0012, 0014 to 0020, 0027, 0029 to 0032, 0035, 0036, 0045, 0046, 0082, 0083: unaffected.

## New Durable ADRs Created

- `adr/0052-the-exploration-deck-is-a-scenario-pile-explored-by-one-typed-step-over-printed-connection-symbols.md`: the exploration deck is a scenario-level pile any scenario builds from listed cards, Explore is one typed step, and connection symbols are data on the location card, so The Forgotten Age, its Return-to box, Relics of the Past and Guardians of the Abyss share one implementation.
- `adr/0053-campaign-supplies-are-a-log-section-copied-into-the-scenario-and-written-back.md`: supplies are a per-investigator campaign-log section kind; a scenario reads and crosses them off in its own state and the scenario end writes them back, the way experience already flows.
- Vengeance and Poisoned follow existing patterns (the Victory X path and Permanent weaknesses) and record no new decision; 0054 is unused.
