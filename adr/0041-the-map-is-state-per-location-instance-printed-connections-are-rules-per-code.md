# ADR-0041: The map is state per location instance; printed connections are rules per code

- Status: proposed
- Date: 2026-11-03

## Context and Problem Statement

`connections()` keys the map by card code, and the UI's layout keys cells by code. Every copy of a card is therefore the same location: four copies of one Lost in Time and Space card share links, two Unvisited Isles share a cell, and nothing can say that the Essex County Express's cars are a line, that a catacomb was placed to the left of another, or that Tidal Tunnels on cells sharing a side are connected. Six cycles and four side boxes lay their maps out as positions.

## Considered Options

1. Keep code pairs; every positional map is a scenario script keeping its own structure.
2. Compile everything into instance links at setup, and scripts maintain them.
3. The map is a store component per instance (a cell and runtime links, two-way and one-way); printed connections (the scenario's code pairs and the location card's symbols) stay rules per code that apply to every instance; a scenario may declare orthogonal adjacency of cells as a third source; `connections()` is the union.

## Decision Outcome

Chosen option: "a store component per instance, with printed connections as rules per code", because the two kinds are different in nature: a printed symbol is a property of the card and must hold for a copy that enters play later without a script, while a position or a runtime link is a fact about one instance that the engine, the snapshot, undo and the table must all see. Grid adjacency is derived from cells, so a scenario says it once and placement ops write only cells.

### Consequences

- Good, because two copies of one card differ where the game says they do, and the UI draws what the engine computes.
- Good, because the Explore step (ADR-0052) and the grid cycles read one query.
- Good, because a location leaving play frees its cell and drops its links in one place.
- Bad, because `flags.connections` is removed and the scripts that appended code pairs are rewritten to instance links.
- Bad, because `ENGINE_VERSION` bumps.
- Follow-up: levels, rings, spokes, shadows, cell swaps and rotation (Edge of the Earth, The Scarlet Keys, The Drowned City) are reads and ops over cells in their own changes.
