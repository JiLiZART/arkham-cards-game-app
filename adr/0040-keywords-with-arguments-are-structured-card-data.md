# ADR-0040: Keywords with arguments are structured card data the engine resolves

- Status: proposed
- Date: 2026-11-03

## Context and Problem Statement

`CardDef.keywords` is a list of names, and `implemented.ts` counts a printed keyword line as working when a regex matches it. Patrol names a target ("nearest location with a Key Locus"), Swarming a number or an amount, Bonded another card, Predator a trait, Researched a log entry. Six cycles and the side boxes use them. The engine must know what the argument means, and the coverage must stop counting a line it cannot resolve.

## Considered Options

1. Keep names only; a script per card reads the argument from the printed text.
2. A keyword with an argument is an object in `keywords` (`{ patrol: <spawn expression> }`, `{ swarming: <amount> }`, `{ bonded: <code> }`, `{ predator: <trait> }`, `{ researched: { log } }`); the importer parses what it can, `cards.json` writes the rest, the engine resolves the object, and `implemented.ts` counts the line only when the object is there.
3. A parallel table beside `keywords` (`patrol: …`, `swarming: …`) per keyword.

## Decision Outcome

Chosen option: "an object in `keywords`", because the argument belongs to the keyword and nowhere else, the engine reads data and never card text (ADR-0013 measures text; the rules run on data), and a list that is either a name or an object keeps `hasKeyword` one function. Patrol's argument is the spawn expression of ADR-0039's change, so one parser serves spawning and patrolling.

### Consequences

- Good, because a keyword line's coverage is honest: the object is there or the card is not working.
- Good, because a new argued keyword is a union member, an importer rule and a handler, not a new table.
- Good, because `grantKeyword` can give an enemy Patrol with a target for the scenario, as data.
- Bad, because every pack's `cards.generated.json` is re-imported, and the generated keyword objects for cards the parser misses have to be written by hand in `cards.json`.
- Bad, because `keywords` is no longer a `string[]`; UI code that joins it for display reads the key of an object.
- Follow-up: Concealed and Mirage (cycle changes) take the same shape.
