## Context

`connections(game, loc)` (`src/engine/queries.ts:123`) takes the location's code, collects the other codes from `scen.connections`, `scen.oneWay` and `flags.connections` (`world/flags.ts:130`, a global `[string, string][]` of codes that scripts append to), and returns every location in play whose code is in the set. `distances` and `stepsToward` (`queries.ts:143,159`) walk it; `legalTurnActions` offers moves from it; `connectionsOf(db, s, loc)` (`queries.ts:139`) serves the UI (`src/ui/game/details.ts`). `ScenarioDef.layout` (`src/content/schema.ts:1445`) is `code -> [col, row]` for drawing only; `layout()` in `src/ui/game/layout.ts:74` sets each location's cell as `scen.layout[l.code] ?? [spare++, 3]`, so a second copy shares the first's cell. There is no runtime position in the state. `engine-scenario-structure` adds `STEP.RemoveLocation` and locations entering play from the encounter deck; `engine-tfa-supplies-vengeance-exploration` adds `CardDef.symbol` and `connectsTo` and says `connections()` should add pairs whose symbols match, "and `engine-location-instances-grid` after it reads one table". `campaign-the-dunwich-legacy` builds the Essex line "into `flags.connections` per instance and rebuilds it when a car is removed"; `campaign-the-path-to-carcosa` places catacombs "in named directions with the player's choice among free spots and a failed placement when none"; `tic.md` §6, `tcu.md` M8–M9, `eoe.md` #9–#10, `tsk.md` (Bermuda, Tunguska, Congress), `tdc.md` §2 (levels, the Vault grid), `sides.md` M13–M14 and `boxes.md` (CoB's 3×7) describe the grids and rings.

## Goals / Non-Goals

**Goals:** connections per instance from printed rules plus instance links plus optional orthogonal adjacency; a cell per instance in the state; placement ops with directions and failure; removal drops links; the UI draws the live cells; `ENGINE_VERSION` 10.

**Non-Goals:** rows-and-columns semantics beyond adjacency and "same row/column" reads (levels "above/below", rings and spokes, "across from", shadows, swapping and rotating cells: the EoE, TSK and TDC engine changes build them on `cellOf` and `placeLocation`); the symbols' data (`engine-tfa-supplies-vengeance-exploration`); any scenario's layout or connections (the campaign changes); the camera.

## Diagram (C4-inspired, component level, ASCII; the engine is pure, the browser app the only container)

```
 content/.../<scenario>.json   connections: [[code, code]], oneWay, layout: code -> [col,row]   (printed, per code)
                               adjacency: "none" | "orthogonal"; setup: placeLocation {code|instance, at}; link {a, b, oneWay?}
 content/packs/<pack>/cards.json  symbol, connectsTo (engine-tfa-...)                           (printed, per code)
            |
            v
 +-----------------------------------------------------------------------------------------------+
 | src/engine                                                                                    |
 |  world/types.ts   GameState.map = { cells: Record<InstId,[c,r]>, links: [InstId,InstId][],     |
 |                                     oneWay: [InstId,InstId][] }                                |
 |  world/store.ts   map component in the snapshot; flags.connections removed                     |
 |  index.ts         setup: first instance of each code takes scen.layout[code]; others next free |
 |  queries.ts       connections(game, loc) = printed(code pairs, symbols) ∪ links(loc)           |
 |                     ∪ (adjacency === "orthogonal" ? neighbours(cells) : ∅), oneWay honoured,   |
 |                     in-play only;  cellOf, locationAt, adjacent, inRow, inColumn, freeCellsAround|
 |  movement.ts      a location entering play takes a cell (placement or next free);             |
 |                   leaving play: cell freed, links dropped (RemoveLocation, discard, void)       |
 |  effects/placement.ts  placeLocation {at: cell | {direction, of} | "free" | "choose"}, link,  |
 |                   unlink, linkOneWay; putIntoPlay {at}                                         |
 |  api.ts           verbs placeLocation, link, unlink; reads cellOf, adjacent, inRow, inColumn   |
 |  read.ts          cellsOf(s), connectionsOf(db, s, loc) for the UI (ui-engine-read-adapter)   |
 +-----------------------------------------------------------------------------------------------+
            v
 src/ui/game/layout.ts  cells from read.cellsOf (spare row for a location without one);
 src/ui/scene           lines from connectionsOf; drag-to-move targets from the same
```

## Decisions

1. **Printed connections stay per code; runtime connections are per instance.** `connections()` is the union of: (a) printed pairs and one-way pairs from `scen.connections`/`scen.oneWay`, matched by code against every in-play instance, plus symbol matches from `CardDef.symbol`/`connectsTo` when those fields exist (the TFA change's rule, read here); (b) `s.map.links` and `s.map.oneWay` by instance; (c) when `scen.adjacency === "orthogonal"`, instances whose cells differ by one in exactly one coordinate. Every source filters to `ZONE.Location`. _Alternative:_ compile printed pairs into instance links at setup — rejected: a copy entering play later (from the encounter deck, the exploration deck) must inherit its printed symbols without a script, and the Return-to files reuse the base pairs.

2. **The map is a store component, not a flag.** `GameState.map` with `cells`, `links`, `oneWay`; `flags.connections` is removed and `flags.ts` no longer exports it (the scripts that used it: City of Elder Things 05136 per `tcu.md`, and the hand-written NotZ files, are rewritten to `link`). The snapshot lists `map`. ADR-0023/0024: each fact its own table.

3. **Every location instance has a cell.** At setup the first instance of a code takes `scen.layout[code]`, further instances of that code and codes without a layout entry take the next free cell in the spare row (what `layout.ts` does today, moved into the engine so it is state). A location entering play later (`moveCard` to `ZONE.Location` from any zone) takes the cell of its pending placement, else the next free cell. `placeLocation { location, at }` where `at` is `[col, row]`, `{ direction: "left" | "right" | "above" | "below", of: InstId }`, `"free"` (the next free cell), or `{ choose: cells }` (the investigator picks, `CHOICE.Target` with cells as options, key `placeWhere`); a placement into an occupied cell emits `EVENT.PlacementFailed` and the op's `else` effects run (The Pallid Mask's and the Pit's "if you cannot"). `swapCells`, `slide` and rotation are left to the cycle changes on top of `cells`.

4. **Removal and the void free the cell and drop the links.** `RemoveLocation` (`engine-scenario-structure`) and any `moveCard` out of `ZONE.Location` call `map.forget(id)`; a location returning from the void takes a new placement (Spaces Between's reshuffle sets cells again through `placeLocation`).

5. **Reads for the rules that come next.** `cellOf(game, loc)`, `locationAt(game, cell)`, `adjacent(game, loc)` (sharing a side, regardless of `adjacency`), `inRow(game, row)`, `inColumn(game, col)`, `freeCellsAround(game, loc)`; the EoE "level" and TDC "row above" rules are `inRow` over `cellOf`.

6. **The UI reads cells and connections through `read.ts`.** `layout()` takes `cellsOf(s)` (the state's cells; a location without one goes to the spare row as today) and the map scene takes `connectionsOf(db, s, loc)` as it does; the presented table (`ui-presented-table`) holds a removed location until its event has played. _Alternative:_ keep `scen.layout` by code in the UI — rejected: that is the bug.

7. **Setup data.** `ScenarioDef.adjacency?: "orthogonal"`, `ScenarioDef.layout` unchanged (by code, first instance), setup steps `placeLocation { code, copy?: n, at }` and `link { a, b, oneWay?: true }` (by code, first instance each; `copy` names the n-th); `check:content` reports two codes on one cell and a `link` to a code not in play at setup.

## Implementation notes

- **Store shape (2).** The map is three store tables keyed by location instance (`cell`, `links` with both ends listed, `oneWay` from → to), not a `GameState.map` field. `links` and `oneWay` are in a recording's snapshot (none exist in the corpus); `cell` is not, since every location has one and it says where, not what. The corpus replays unchanged.
- **Cells (3).** A location takes a cell as it enters play: its layout cell if free (The Gathering puts the Study and the Hallway on [0,0] in turn), else the next free cell of a spare row below the map (row 3, or below the layout's lowest row). Leaving play frees the cell and drops the links at both ends.
- **Placement (3, 7).** `placeLocation { code, at, else }` takes a set-aside location of that code; `at` is a cell, `{ direction, of }` with `of` "self", "yourLocation" or a code in play, `"free"`, or `{ choose: cells }`. `link`/`unlink` name locations the same way. In setup, `placeLocation { code, copy?, at }` and `link { a, b, oneWay? }`; there is no `putIntoPlay { at }`, the `placeLocation` step covers it.
- **Content check (7).** Two codes put into play on one cell, and a `link` to a code not put into play before it, are errors; steps behind a log condition are versions of the setup and are skipped (Smoke and Mirrors' two campuses share a cell).
- **UI (6).** `layout()` reads `cellsOf(s)` and draws one line per connected pair from `connectionsOf`, an arrow where it connects one way. Holding a removed location on the table until its event has played waits for `ui-presented-table`.
- **Symbols.** `CardDef.symbol`/`connectsTo` have not landed; `connections()` reads code pairs, instance links and the grid, and the symbol read is one more source when they do.

## Risks / Trade-offs

- [Scripts that read `flags.connections`] → removed from `flags.ts`, so the typecheck finds every one; `link`/`unlink` replace them.
- [A grid scenario with printed pairs as well] → both sources apply; the campaign change leaves `connections` empty where the grid is the map (In Too Deep) and keeps pairs where the card says so (Devil Reef's Churning Waters).
- [Symbols field not landed when this lands] → source (a) reads code pairs alone; adding the symbol read is one line when `CardDef.symbol` exists.
- [Cells for every instance change the UI layout of today's scenarios] → the first instance keeps its `layout` cell, so Night of the Zealot draws as before; `layout.test.ts` pins it.

## Migration Plan

`ENGINE_VERSION` 10; `flags.connections` gone from `flagsForSnapshot`, the corpus re-recorded by the script only if a snapshot lists it (the NotZ scripts add no connections at setup, so none is expected). No content changes beyond the schema.

## Open Questions

- None for the user. ADR-0021/0023/0024 (proposed) cover the store shape this adds to; ADR-0035 (presented table) is where the UI reads placement.
