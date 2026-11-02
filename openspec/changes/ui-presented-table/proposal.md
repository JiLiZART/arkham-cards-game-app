## Why

The engine applies a whole dispatch at once and the UI plays its animated events afterwards (ADR-0002), so for a moment `game` is ahead of the screen. Two rules hold the table back until the events have played: `heldGame()` (`src/ui/game/spotlight.ts:87`) keeps an enemy whose `enemyMove` is still queued at its old location and unengaged, and `heldCards()` (`src/ui/state/store.ts:62`) names the encounter cards and weaknesses still waiting for the showcase. Only two surfaces apply them, each its own way: the map (`scene/Table/Table.tsx:239` uses `heldGame`, `:343` holds a held card's arrival) and the play strip (`hud/PlayStrip/PlayStrip.tsx:93-94` uses both). Every other surface reads `useGame(s => s.game)` raw (36 files do). Most of them should, but three draw where cards are on the table and so run ahead of the animation: the investigators' modal (`Investigators.tsx:24-25`, another investigator's threat area and engaged enemies), the phone's strip modal (`AssetsModal.tsx:29-30`), and the encounter discard pile in `PileColumn.tsx:112-128`. A hunter that has not yet moved shows as engaged in the modal, and a treachery that resolves with no choice tops the discard pile while it still waits in the showcase (the last one is read from the code, not yet seen in the browser; task 1.1 confirms it).

## What Changes

- **One presented table.** A pure `presented(game, current, queue)` in `src/ui/game/presented.ts` returns `{ game, waiting }`: the game with queued enemy moves held back (today's `heldGame`) and the set of cards still waiting for the showcase (today's `heldCards`). Same input, same object (no copy when nothing is held).
- **One hook.** `usePresented()` in `src/ui/state/` subscribes to `game`, `current` and `queue` and memoises the result.
- **Every surface that draws card placement uses it:** the map, the play strip (both as today), the investigators' modal, the phone strip modal and the encounter discard pile. Cards in `waiting` are left out of strips, modals and piles, as the play strip does now.
- **Surfaces that stay on the live game, deliberately:** anything that offers or answers the pending choice (options, the instruction bar, the skill-test screen, the showcase), the hand (drawn cards are already held by the view's `showcase`), the feed (its own `shown` index), and the counters (damage, horror, clues, doom, resources, actions). The engine's events carry deltas, not prior values, so holding counters is a different change (open question).
- `heldGame` and `heldCards` move into `presented.ts`; `spotlight.ts` and `store.ts` no longer export them.

Assumed (to confirm with the user in grill-me):

- The rule stays "placement only": where a card is, whether it is engaged, whether it is on the table yet. No counters, no exhausted state.
- The pending choice is always read from the live game; the input gate (`ui-input-gate`) already keeps it closed while events play, so options never point at a card the presented table doesn't show yet.
- Modals that show a card's details (the card modal, the hover card) show the live card: by the time the player can open one on a held card, the move has played.
- `ui-event-conductor` may change how `current` and `queue` are held; `presented` takes them as arguments and doesn't care. If `ui-engine-read-adapter` lands first, `usePresented` is one of its reads.

## Open questions

1. Should the counters (agenda doom, clues on a location, an investigator's damage and horror) also wait for their events, so a treachery's doom isn't on the agenda while the card is still in the showcase? That needs prior values from the events or the engine.
2. Should the camera's focus and the spotlight read the presented table too (today the map's `SceneInner` already gets the presented game, so they do; the HUD's spotlight doesn't)?
3. Are there other surfaces the user has seen run ahead (the location details, the act and agenda viewer) that should join the list?

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: a new requirement says every surface that shows where cards are shows only what has been played, and lists the surfaces that show the live game.

## Impact

- New `src/ui/game/presented.ts` and `presented.test.ts`; `heldGame` and its tests move from `spotlight.ts` / `spotlight.test.ts`, `heldCards` from `store.ts`.
- New `usePresented()` in `src/ui/state/` (beside `usePlayers.ts`).
- `scene/Table/Table.tsx` (`Scene`, the arrival hold), `hud/PlayStrip/PlayStrip.tsx`, `hud/Investigators/Investigators.tsx`, `hud/AssetsModal/AssetsModal.tsx`, `hud/PileColumn/PileColumn.tsx`.
- No engine change. Related: `ui-event-conductor` (the event clock), `ui-engine-read-adapter` (the UI's reads), `ui-input-gate`.
- New ADR-0035.
