## 1. The map component and connections per instance

- [x] 1.1 Failing driver test `src/engine/__tests__/mapInstances.test.ts`: two instances of one code, one linked by `link` to a third location and one not, give different `connections()`; both keep the printed pairs; a one-way `link` offers the move one way only; `connectionsOf` for the UI agrees; removing a location drops its links and frees its cell.
- [x] 1.2 `world/types.ts GameState.map`, `world/store.ts` (component, `flagsForSnapshot`/snapshot), `world/flags.ts` without `connections`; the scripts that used it rewritten to `link` (grep `flags.connections` in `content/`).
- [x] 1.3 `queries.ts connections()` over the three sources (printed code pairs and one-way, `CardDef.symbol`/`connectsTo` when present, instance links, orthogonal neighbours); `cellOf`, `locationAt`, `adjacent`, `inRow`, `inColumn`, `freeCellsAround`; `movement.ts`: a location entering `ZONE.Location` takes a cell, leaving it forgets cell and links.
- [x] 1.4 `index.ts createGame`: first instance of each code takes `scen.layout[code]`, the rest the next free spare-row cell; `ENGINE_VERSION` 10.

## 2. Placement ops and setup data

- [x] 2.1 Failing test `grid.test.ts`: with `adjacency: "orthogonal"`, cells sharing a side are connected and diagonals are not; `placeLocation` below an occupied cell fails and runs `else`; `{ choose: cells }` asks the investigator; `"free"` takes the next free cell; `inRow`/`inColumn` list the right instances.
- [x] 2.2 `src/content/schema.ts`: `ScenarioDef.adjacency`, `Placement`, setup steps `placeLocation { code, copy?, at }` and `link { a, b, oneWay? }`, `putIntoPlay { at }`; `check:content`: two codes on one cell, a `link` to a code not in play.
- [x] 2.3 `effects/placement.ts`: ops `placeLocation`, `link`, `unlink`; `EVENT.PlacementFailed`, `EVENT.Linked`; verbs and reads in `api.ts` (pin `scriptApi.test.ts`); `read.ts` gains `cellsOf`.

## 3. The UI draws the live map

- [x] 3.1 Failing test `src/ui/game/layout.test.ts`: two copies of one code get two cells; a location without a cell goes to the spare row; Night of the Zealot's cells are unchanged.
- [x] 3.2 `src/ui/game/layout.ts` reads `cellsOf(s)`; the map scene and drag-to-move targets read `connectionsOf`; a removed location leaves the presented table after its event.

## 4. Verification

- [x] 4.1 The replay corpus replays unchanged (re-recorded by the script only if `flags.connections` appeared in a snapshot).
- [x] 4.2 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm coverage`, `pnpm check:content`; `openspec validate engine-location-instances-grid --type change --strict`.
