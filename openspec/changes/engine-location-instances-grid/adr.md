# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0007 Scenario and campaign definitions are generated from ArkhamCards' campaign guides: `layout` and `connections` by code stay the generated shape; `adjacency` and placement steps are written by the campaign changes.
- ADR-0021, ADR-0023, ADR-0024 (proposed, in force for the store): the map is a component with its own tables (`cells`, `links`, `oneWay`).
- ADR-0022 Cards and investigators are read through views: cells are read through `cellOf`, never from the table directly.
- ADR-0026 Closed sets of strings: directions are a constant set.
- ADR-0029 Engine tests drive games through a scenario driver: `mapInstances.test.ts` and `grid.test.ts` use the driver.
- ADR-0034 The script API is an explicit list of reads and intent verbs: `placeLocation`, `link`, `unlink`; reads `cellOf`, `adjacent`, `inRow`, `inColumn`.
- ADR-0035 Surfaces that draw card placement read one presented table: the map's cells and lines come through it.
- ADR-0036 The UI reads the engine through one read entry point: `cellsOf` and `connectionsOf` in `read.ts`.
- ADR-0039 Scenario cards are instances with faces, in named decks, with piles beneath: removal and the void are where the map forgets an instance.
- ADR-0052 The exploration deck is a scenario pile explored by one typed step over printed connection symbols: symbols stay per code and are one of this query's three sources.

## New Durable ADRs Created

- ADR-0041 The map is state per location instance; printed connections are rules per code (`adr/0041-the-map-is-state-per-location-instance-printed-connections-are-rules-per-code.md`).
