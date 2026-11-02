## Context

The game store (`src/ui/state/store.ts`, 940 lines) exposes 8 calls that change the shared game. Each reads `get().net` and either proposes a `Move` to the room (`NetLink.propose`, wired by `src/net/session.ts:130`) or runs a private function (`runNew`, `runStart`, `runFlow`, `runUpgrade`, `runUndo`, `runCancelTest`, `runFinish`, or `answer` + `persist` for a choice). `applyMove` (`store.ts:731-770`), which the session calls for every numbered move, switches on `move.t` to those same private functions. So the mapping "move → what the store does" exists once in `applyMove`, and a second time spread across the 8 calls' local branches.

Differences between the two copies today:

- `choose`: the local branch calls `answer` + `persist`; `applyMove` first checks `pending.inv === move.inv`. The room branch also checks the browser's seats.
- `upgradeDeck`: alone it returns `runUpgrade`'s result; in a room it checks with the engine's pure `upgradeDeck` first, so the player hears a refusal at once, and proposes only if allowed.
- `cancelTest`: returns whether the cancel was made or sent.
- `answer` answers lone draw prompts by itself only when `!net` and "Tap decks" is off; in a room the session does that per seat (`session.ts:503-508`).

`src/net` imports `canUndo`, `Save` and `UiState` from the store module; AGENTS.md allows `src/net` to depend on the stores through their public calls, and `canUndo` is shared so the host checks the player's Undo rule. `store.ts` imports `Move` and `RoomSave` as types from `src/net/moves.ts`, which imports `Save` as a type back.

Constraints: ADR-0018 (every change to the shared game is a move the host orders; a browser never applies its own move before the numbered copy), ADR-0020 (the transport may be the room socket; the store doesn't care), ADR-0004.

## Goals / Non-Goals

**Goals:**

- Each of the 8 calls written once: its guard, then a move.
- The store's move-making tests run alone and through a loopback room, with equal results.

**Non-Goals:**

- A `Mover` interface or a new module; moving `canUndo`/`Save`; any change to `src/net`, `Move`, the save format or the session.
- The input gate's conditions (`ui-input-gate`).
- Making `resume` a move.

## Decisions

### 1. Before and after (C4 component view inside the browser app)

Rigor: lightweight C4-inspired, component level; ASCII.

Before:

```
  HUD / menus
      | choose, undo, startScenario, ... (8 calls)
  +---v-------------------------------------------------------------+
  | game store (store.ts)                                           |
  |  call: guard; if (net) net.propose(move)  ---------------------+---> NetLink --> session --> host
  |        else run*()/answer()  <-- local copy of the mapping     |                    |
  |  applyMove(move): switch move.t -> run*()  <-- room copy  <----+--------------------+
  +-----------------------------------------------------------------+   numbered move
```

After:

```
  HUD / menus
      | 8 calls: guard, then submit(move)
  +---v-------------------------------------------------------------+
  | game store                                                      |
  |  submit(move): net ? net.propose(move) : apply(move) ----------+---> NetLink --> session --> host
  |  apply(move):  switch move.t -> run*()   (the one mapping)     |                    |
  |  applyMove(move, room) = room bookkeeping + apply(move)  <-----+--------------------+
  +-----------------------------------------------------------------+
  tests: store.test.ts move cases x { alone, loopback NetLink: propose = applyMove }
```

- The mapping lives in one switch; the room's bookkeeping (saving `room`, restoring it on refusal) stays in `applyMove`.
- Assumption: `submit` is a closure inside `createGameStore`, not exported; the loopback lives in a test helper.

### 2. Why not a `Mover` interface

The review proposed `interface Mover { make(move): … }` with `LocalMover` and `RoomMover`. `NetLink` is already the room's half and `apply` the local half, and the store chooses between them by one field. An interface would add a type and a module to name what one conditional does, with exactly two implementations and no third in sight (a spectator applies moves through `applyMove`, not `submit`). Rejected for now; open question 3 in the proposal covers the module split if the net's import of the store becomes a problem.

### 3. Guards stay in the calls

What may be asked (`canUndoHere`, `testStartIndex`, the input gate, the seat check in a room, `upgradeDeck`'s pure pre-check) runs in the public call before `submit`, as today, because a refused call must not reach the host and must tell the player at once. `apply` keeps `applyMove`'s own checks (the deciding investigator), so the host still refuses a stale move.

### 4. The loopback test

`loopback(store)` sets `NetLink` to `{ propose: (m) => void store.getState().applyMove(m) }`. Tests that call the 8 public calls run under `describe.each([alone, loopback])` and compare `game`, `actions`, `undoFloor` and the persisted save (minus `room`). "Tap decks" is on in those cases, since lone draws are answered by the session per seat in a room and by the store alone otherwise. The existing `storeNet.test.ts` keeps checking what is sent.

## Risks / Trade-offs

- [The local `choose` gains the deciding-investigator check] -> it is always true for a move the store builds from `pending`; a test covers that a local choice still applies.
- [`apply` is async (`new` and `load` wait for packs) where some local calls were sync] -> `runStart`, `runFlow`, `runUndo`, `runCancelTest`, `runFinish` stay sync inside the switch; only `new` and `load` await, as they do today in `runNew` and `restoreSave`. The calls keep their return types.
- [The friction is modest] -> the change is about 60 lines out of `store.ts` and one parameterised test; if `ui-input-gate` lands first and rewrites `choose`, this can fold into it (open question 1).

## Migration Plan

Loopback helper and parameterised tests first (they pass on today's code, since both copies agree); then `apply` extracted from `applyMove`; then each call onto `submit`, one at a time, tests green after each. Rollback is reverting the change; nothing persisted changes.

## Open Questions

- The four questions in the proposal (fold into `ui-input-gate`, the deciding-investigator check, moving `canUndo`/`Save`, a two-browser replay test).
- In-force ADRs reviewed: 0004, 0018, 0019, 0020. None needs revisiting; this change applies ADR-0018's "every change is a move" to play on one device, which needs no new ADR.
