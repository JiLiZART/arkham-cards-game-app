## Why

Every change to the shared game is already a `Move` (`src/net/moves.ts`), and the store already knows how to make each one: `applyMove` (`src/ui/state/store.ts:731-770`) maps a move to the store's own `run*` functions. But the store's public calls don't use that map when playing alone. Each of the 8 calls (`newCampaign`, `upgradeDeck`, `startScenario`, `answerFlow`, `choose`, `cancelTest`, `undo`, `finishScenario`, `store.ts:636-704`) has its own `if (net) return net.propose(...)` branch and its own local path, so a call exists twice: once as a move for rooms, once as direct code for one device. The two copies can drift (the local `choose` doesn't check that the move's investigator is the one deciding; `applyMove` does), and `store.test.ts` (52 cases) exercises only the local copies while `storeNet.test.ts` checks the room copies by what they send.

The review behind this change also suggested a `Mover` interface with a local and a room adapter, and moving `canUndo` and `Save` out of the store because `src/net/session.ts:10` and `src/net/moves.ts:8` import them. Checked against the code, that is more than the friction justifies:

- `NetLink` (`{ propose(move) }`, `store.ts:193`) is already the room's adapter, and `applyMove` is already the local one. A new interface would rename them.
- AGENTS.md lets `src/net` depend on the stores through their public calls; `canUndo` is shared on purpose so the host checks the same Undo rule as the player's browser, and `Save` is the store's own save format, which the `load` move carries. The `store.ts` ↔ `net/moves.ts` import is type-only in both directions.

What remains worth doing is small: route every public call through one path, so a call is written once.

## What Changes

- **One move path.** The store gets one private `submit(move)`: in a room it proposes the move (`net.propose`), alone it applies it through the same switch `applyMove` uses. The 8 public calls build their move, run their own guard (the input gate, Undo's rule, the test-cancel rule), and call `submit`; none keeps a local copy of what the move does.
- **Answers that come back at once stay.** `upgradeDeck` still tells the player now whether the upgrade will be refused (it checks with the engine's pure `upgradeDeck` before submitting, in both modes), and `cancelTest` still returns whether it was sent.
- **The store tests run both ways.** The tests in `store.test.ts` that make moves run twice: on a store alone, and on a store whose `NetLink` is a loopback that applies each proposed move straight back through `applyMove` (a one-browser room without the network). Both must give the same state, actions, undo floor and save.
- No change to `NetLink`, `Move`, the session, `canUndo`'s home or the save format. No behaviour change for players.

Assumed (to confirm with the user in grill-me):

- No `Mover` interface: `NetLink` plus the local switch are the two adapters, and the loopback is a test helper, not production code.
- `canUndo`, `canUndoHere` and `Save` stay in `src/ui/state/store.ts`; the net's imports of them are within AGENTS.md's rule.
- The local path keeps answering lone draw prompts by itself while "Tap decks" is off (`answer` in `store.ts`), exactly as today; in a room the seat's own browser still does it through the session.
- The input gate in `choose` (queue, current event, intro, showcase) is `ui-input-gate`'s; this change only moves the call after that gate onto `submit`.
- `resume` (loading this device's save) stays a direct call, not a move: it is not a change to a shared game.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `online-play`: a new requirement that a game on one device and a room make every change through the same moves, so the same choices give the same state either way.

## Impact

- `src/ui/state/store.ts`: `submit`, the 8 public calls, `applyMove`'s switch shared with the local path (about 60 lines shorter).
- `src/ui/state/store.test.ts` (move-making cases parameterised over alone and loopback), `src/ui/state/storeNet.test.ts` (unchanged expectations: what is sent in a room).
- No change in `src/net/`, the engine, saves or `ENGINE_VERSION`.
- No ADR: the decision that every shared change is a move is ADR-0018's; this change applies it to play on one device.

## Open questions

1. Is collapsing the 8 branches worth a change of its own, or should it ride along with `ui-input-gate`, which already edits `choose` and its guard?
2. Should the local `choose` gain `applyMove`'s check that the move's investigator is the one deciding (it is always true when the store builds the move from `pending`), or should `submit` skip it alone?
3. Should `canUndo` and `Save` move to a module of their own anyway (say `src/ui/state/save.ts`) so `src/net` stops importing the 940-line store module, even though the dependency is allowed?
4. Is the loopback store test enough proof of "same either way", or should the session tests (`src/net/session.test.ts`) also replay a recorded hot-seat game through a two-browser room?
