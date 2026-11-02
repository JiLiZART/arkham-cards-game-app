## Why

The engine's queries take a `GameContext` (`{ s, db, events }`), the mutable context the rules run in; the UI holds a `GameState` and builds that context by hand to ask anything beyond a lookup: 12 times (`testScreen.ts:16`, `details.ts:72`, `intent.ts:15`, `players.ts:109`, `Stats.tsx:48`, `assets/sounds.ts:116`, `ScenarioPanel.tsx:19`, and 5 in tests). The same health and sanity maths is written twice, in `invNumbers` (`src/ui/hud/Stats/Stats.tsx:47-61`) and `barModel` (`src/ui/state/players.ts:108-133`), so the stat bar and the player bar agree only by copy.

What the UI may read from the engine is not written down anywhere. Non-test UI files import the engine's core lookups (`engine/context`) 43 times, `engine/queries` 4 times (`maxHealth`, `maxSanity`, `skillValue`, `enemyStat`, `invsAt`, `connectionsOf`), `engine/rules/*` 6 times (`playBlock`, `handLimit`, `actClueCost`, `doomInPlay`, `testParts`, `tokenTotal`) and `engine/campaign/*` 14 times (5 of them the store's writes). Nothing in `src/ui` imports `src/engine/api.ts`, the scripts' surface, which `engine-script-verbs` narrows to an explicit list. ADR-0025 layers the engine's own folders; it says nothing about which of them the UI reaches, so any rules module can become a UI dependency without anyone deciding it.

## What Changes

- **One read entry point.** A new `src/engine/read.ts`, beside `index.ts` (moves) and `api.ts` (scripts), is the UI's surface for reading a game. It re-exports the lookups over a state the UI already uses (`cardOf`, `cardOfIf`, `cardsOf`, `invOf`, `invOfIf`, `invsOf`, `pileOf`, `pileMap`, `patchedState`) and gives `readGame(db, state)`, an object whose methods answer the context-taking queries the UI asks today (`def`, `maxHealth`, `maxSanity`, `skillValue`, `handLimit`, `enemyStat`, `invsAt`, `connectionsOf`, `playBlock`, `doomInPlay`, `actClueCost`, `testParts`, `tokenTotal`). The context is built once, inside it.
- **One investigator summary.** `readGame(db, state).investigatorSummary(inv)` returns health and sanity remaining and their maximums, resources, clues, hand size, hand limit and the four skills. `invNumbers` and `barModel` both read it; the copy goes.
- **The 7 hand-built contexts go.** Each non-test site calls `readGame`; tests use it or the engine's test kit.
- **A boundary test.** A test in `src/ui/` fails when a non-test UI file imports from `src/engine/` anything but `index.ts`, `read.ts`, `bot.ts`, `world/types`, `campaign/types`, `world/constants` and `events/event`, with `src/ui/state/store.ts` (which dispatches and runs the campaign) allowed `campaign/*` as well.
- **Campaign reads.** The menus' campaign reads (`validateDeck`, `needsChoice`, `whyNot`, `whyNotReplace`, `deckChangeCost`, `currentScenarioId`, `NOTES`, the flow's `test`) are re-exported from `read.ts`, so the menus pass the same test.
- No behaviour change; no state or save change.

Assumed (to confirm with the user in grill-me):

- The seam lives in the engine (`src/engine/read.ts`), not in `src/ui`: the engine knows which of its functions only read, and the queries it wraps stay tested by engine tests. `src/engine` still imports nothing from the UI. A UI-side adapter was considered and set aside in the design.
- `readGame` takes `db` explicitly. UI code that reads the app's global `db` from `src/ui/state/context.ts` passes it; tests pass their own.
- `investigatorSummary` belongs to the engine's read surface (it is game facts), not to `players.ts`; `barModel` keeps the UI-only fields (turn pips, ring, grey, `canAct`).
- The UI keeps importing state types (`world/types`), the closed sets (`world/constants`, `events/event`) and the bot directly: they are already read-only and shared.
- This change and `engine-script-verbs` touch neighbouring files but not the same list: `api.ts` stays the scripts' surface, `read.ts` the UI's. `ui-presented-table` and `ui-option-placement` call `readGame` where they need a query.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: a new requirement that the UI reads a game through one entry point, which builds the engine's context itself, and that a test refuses UI imports of other engine modules.
- `game-table-ui`: a new requirement that the stat bar, the player bar and the avatar sheet take an investigator's numbers from one summary, so they always agree.

## Impact

- New `src/engine/read.ts` and `src/engine/__tests__/read.test.ts`; `src/engine/__tests__/boundary.test.ts` places `read.ts` in ADR-0025's top layer with `api.ts`, `bot.ts` and `campaign/`.
- `src/ui/game/testScreen.ts`, `details.ts`, `intent.ts`, `src/ui/state/players.ts`, `src/ui/hud/Stats/Stats.tsx`, `src/ui/hud/ScenarioPanel/ScenarioPanel.tsx`, `src/ui/assets/sounds.ts`; the 42 files importing `engine/context` switch to `engine/read`; the menus' campaign imports likewise.
- New `src/ui/engineImports.test.ts` (the UI's boundary).
- `src/net/` is out of scope: its non-test files import engine types, `ENGINE_VERSION` and `EVENT` only.
- New ADR-0036: the UI reads the engine through one read entry point.

## Open questions

1. Should the seam be in the engine (`src/engine/read.ts`, assumed) or in the UI (`src/ui/game/read.ts`, wrapping the same functions with the app's `db` baked in)? The first lets the engine decide what is safe to read; the second leaves the engine untouched.
2. Should `readGame` cache per state (a `WeakMap` from state to reader), or is building the context on each call cheap enough? Today each site builds one per render.
3. Do the menus' campaign reads belong in the same `read.ts`, or in a second surface for the campaign screens?
4. Should the store's writes (`dispatch`, the campaign's `advance`, `upgradeDeck`, `startCampaign`) also go through `index.ts` only, so `store.ts` loses its `campaign/*` exception? That overlaps `ui-move-seam`.
