# ADR-0052: The exploration deck is a scenario pile explored by one typed step over printed connection symbols

- Status: proposed
- Date: 2026-11-03

## Context and Problem Statement

The Forgotten Age (10 scenarios), its Return-to box, Relics of the Past and Guardians of the Abyss put locations into play by exploring: an Explore ability draws from a separate deck of single-sided locations and treacheries, puts a location "connected to your location" into play and moves you there, and sets the others aside until the action ends. Which locations connect is printed as symbols on cards that are not yet in play, so the engine's connection list (`ScenarioDef.connections`, pairs of codes in play) cannot answer "does this drawn card connect to where I stand". No machine-readable source holds the symbols. Thirty Explore abilities, on agendas, acts and locations, share one loop with different costs and match rules.

## Considered Options

- One pile (`ZONE.Exploration`) built by a setup step from listed codes, copies and random picks; one typed step `Explore { inv, match }` (ADR-0033) that draws, matches, puts into play and moves, sets aside and re-draws, or resolves a treachery, then shuffles the set-aside locations back; `symbol` and `connectsTo` on the location card in `cards.json`, transcribed from the scans once, read by the connection query for cards in or out of play.
- A script per Explore ability and a per-scenario pair list naming every exploration location against every other.
- A TFA-only module keyed by campaign id, with the symbols in each scenario file.

## Decision Outcome

Chosen option: "one pile, one typed step, symbols on the card", because the loop is the same thirty times and the ability's data names only what differs (cost, condition, match); because a symbol transcribed once on the card serves the base scenario, the Return-to scenario that mixes the same cards, and the Boundary Beyond's "matching symbol" replacement, where a pair list would be 66 entries per scenario; and because Guardians of the Abyss builds the same deck from other cards, so nothing in it may know The Forgotten Age. A content check walks the symbols from the start location to every exploration location, so a transcription error fails `check:content` instead of stranding a scenario.

### Consequences

- Good, because a scenario adds exploration with a setup step and data on its cards, no engine change.
- Good, because the same seed rebuilds the same deck and the same draws, so replays and the recorded-games oracle hold.
- Good, because `engine-location-instances-grid` reads one symbol table rather than a second source of connections.
- Bad, because the symbols are hand-transcribed from scans: the check catches an unreachable location, not a wrong but reachable one.
- Bad, because the closed symbol set in `constants.ts` grows with each cycle that prints new glyphs.
- Follow-up: the Boundary Beyond's "place on top of the location with the matching symbol" is `engine-scenario-structure`'s location stacking, matched by this table.
