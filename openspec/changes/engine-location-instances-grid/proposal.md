## Why

`connections()` in `src/engine/queries.ts` keys the map by card code: it reads `scen.connections`, `scen.oneWay` and the `flags.connections` pairs as code pairs and returns every in-play location whose code matches. That is right for printed symbols, where every copy of a card shares them, and wrong wherever two instances of one code must differ or a position decides a link: Lost in Time and Space has four copies of 02324; the Essex County Express is a line of cars connected left to right and loses its leftmost each agenda; The Pallid Mask places catacombs in named directions as they are revealed; The Pit of Despair, In Too Deep, Devil Reef, A Light in the Fog and Into the Maelstrom lay Tidal Tunnels on a grid where "adjacent orthogonally" means connected; Before the Black Throne's cosmos, The Witching Hour's "locations in front of you", the Unvisited Isles, Edge of the Earth's ladders, rings and spokes, The Scarlet Keys' Bermuda and Tunguska grids and shadows, The Drowned City's levels and the Vault, the Blob's diamond, Carnevale's ring, Children of Blood's 3×7 all say the map as positions. The UI's `layout()` (`src/ui/game/layout.ts:74`) also keys cells by code, so two copies of one card land on one cell. `campaign-the-dunwich-legacy`, `campaign-the-path-to-carcosa` and its Return, `campaign-the-forgotten-age`, `engine-tfa-supplies-vengeance-exploration` (symbols on the card, read by one query) and every grid cycle are written against this change.

## What Changes

- **The map is state.** A `map` component in the store holds, per location instance, its cell (`[col, row]`) and the instance links and one-way links added at runtime; `scen.layout` seeds the cells of the starting locations; a location put into play later gets the cell its placement names (a direction from another location, a free cell, a named cell) or the next free one.
- **`connections()` reads three sources and prunes removed locations:** printed code pairs and symbols (`scen.connections`, `scen.oneWay`, and `CardDef.symbol`/`connectsTo` from `engine-tfa-supplies-vengeance-exploration`), which apply to every instance of the code; instance links (two-way and one-way); and grid adjacency when the scenario says `adjacency: "orthogonal"` (cells that share a side are connected). `flags.connections` becomes instance pairs; a location leaving play drops its links.
- **Placement ops and reads:** `placeLocation { location, at: cell | { direction, of } | "free" }`, `connect`, `disconnect`, `connectOneWay` as effect ops and verbs; reads `cellOf`, `locationAt`, `adjacent`, `inRow`, `inColumn`, `freeCellsAround`; the Explore and Tidal-Tunnel style "put it below/left/right of" is one op with a direction, refusing an occupied cell.
- **The UI draws the live map.** `layout()` reads cells from the state through the presented table; `connectionsOf` already takes a state; two copies of one card get two cells.
- **BREAKING**: `ENGINE_VERSION` 10; `flags.connections` pairs are instances, not codes (the three scripts that add connections are rewritten).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: locations (connections per instance, grid adjacency, placement, links dropped on removal).
- `campaign-play`: data-defined scenario setup (`adjacency`, cells for the starting locations by instance, placement ops at setup).
- `game-table-ui`: table layout (locations drawn at their live cells; two copies of a card apart).

## Impact

- `src/engine/world/types.ts` (`GameState.map: { cells: Record<InstId, [number, number]>; links: [InstId, InstId][]; oneWay: [InstId, InstId][] }`), `world/store.ts` (the component, snapshot), `world/flags.ts` (`connections` removed), `queries.ts` (`connections()`, `cellOf`, `adjacent`, `inRow`, `inColumn`, `locationAt`, `freeCellsAround`), `movement.ts` (a location entering play takes a cell; leaving play drops cell and links), `rules/scenario.ts` (`RemoveLocation` prunes links; `putIntoPlay` with a placement), `effects/placement.ts` (the ops), `index.ts` (setup seeds cells from `scen.layout` by instance; `ENGINE_VERSION`), `api.ts` (verbs and reads), `read.ts` (`ui-engine-read-adapter`: `cellsOf`, `connectionsOf`).
- `src/content/schema.ts` (`ScenarioDef.adjacency`, `Placement`, setup step `placeLocation`, `putIntoPlay { at }`), `check:content` (a `layout` cell used twice).
- `src/ui/game/layout.ts` (cells from the state; a card without a cell gets the spare row as today), `src/ui/game/details.ts`, the map scene (links from `connectionsOf`), the drag-to-move targets.
- Tests through `kits/driver.ts`: `src/engine/__tests__/mapInstances.test.ts`, `grid.test.ts`; `src/ui/game/layout.test.ts`.
- Depends on `engine-scenario-structure` (`RemoveLocation`, locations entering from the encounter deck) and on `engine-tfa-supplies-vengeance-exploration`'s `CardDef.symbol`/`connectsTo` (read here if landed; otherwise `scen.connections` alone, no change in shape). Followed by `campaign-the-dunwich-legacy` (the Essex line), `campaign-the-path-to-carcosa` (the catacombs), `engine-tic-keys-flooding`, `engine-tcu-haunted-spectral-breaches`, `engine-eoe-partners-frost`, `engine-tsk-world-map`, `engine-tdc-flood-levels-tasks`, `campaign-side-blob-that-ate-everything`, `campaign-side-carnevale-of-horrors`, `campaign-children-of-blood`, `campaign-fortune-and-folly`.
