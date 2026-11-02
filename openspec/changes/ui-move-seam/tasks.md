## 1. Both ways under test first

- [ ] 1.1 A `loopback(store)` test helper beside `storeNet.test.ts`: `setNet({ propose: (m) => void store.getState().applyMove(m) })`.
- [ ] 1.2 In `store.test.ts`, run the cases that call `newCampaign`, `startScenario`, `choose`, `answerFlow`, `upgradeDeck`, `undo`, `cancelTest` and `finishScenario` under `describe.each` over alone and loopback, with "Tap decks" on, comparing `game`, `actions`, `undoFloor` and the persisted save minus `room`. They pass on today's code.
- [ ] 1.3 New case: the same choices from seed 7 through the mulligan and Roland's first turn give equal state alone and through the loopback; an unaffordable upgrade is refused at once in both, and nothing is sent or applied.

## 2. One move path

- [ ] 2.1 Extract `apply(move)` from `applyMove`'s switch inside `createGameStore`; `applyMove` keeps the room bookkeeping and calls it. Tests green.
- [ ] 2.2 Add `submit(move)`: `net ? net.propose(move) : apply(move)`.
- [ ] 2.3 Move the 8 calls onto `submit` one at a time, each keeping its guard (`canUndoHere`, `testStartIndex`, the input gate and seat check, `upgradeDeck`'s pure pre-check) and return value; remove the local branch. Tests green after each; `storeNet.test.ts` unchanged.
- [ ] 2.4 `grep -n "if (net)" src/ui/state/store.ts` finds only `submit`.

## 3. Verification

- [ ] 3.1 Browser pass on a dev server of your own (`pnpm dev --port 5174`, Playwright, screenshots under `.playwright-mcp/`): a hot-seat game through a choice, an undo, a skill test called off and a deck upgrade between scenarios; then a two-tab room through the same steps, both tabs showing the same state. Stop the server.
- [ ] 3.2 `pnpm lint:fix`, `oxfmt` on the files this change touches only, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `openspec validate ui-move-seam --type change --strict`.
