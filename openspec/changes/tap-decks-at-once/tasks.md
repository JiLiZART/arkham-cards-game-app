## 1. Store: the UI answers draws when the setting is off

- [x] 1.1 In `src/ui/state/store.ts` factor the bookkeeping of `choose()` after a successful dispatch (game, actions, logMarks, undoFloor, enqueue) into one helper used by `choose` and by the new step.
- [x] 1.2 Add `settleDraws()`: while `game.pending?.kind === "draw"`, the prompt has exactly one option and `tapDecks` is off, dispatch that option through the helper; stop otherwise. Call it after `choose`, after `startScenario`, after a save is restored and a report is loaded, after `undo`, and in `setTapDecks` when turning the setting off.
- [x] 1.3 `startScenario` always passes `tapDecks: true` in the setup.
- [ ] 1.4 Tests in `src/ui/state/store.test.ts`: setting off, the upkeep draw's card is in hand, no `draw` is pending and the action list holds the draw; setting on, the draw waits; turning the setting off while a draw waits draws at once; turning it on, the next draw waits; a save with a waiting draw loaded with the setting off draws on load; replaying the recorded actions reaches the same state; two investigators in the mythos phase with the setting off draw in turn with both reveals queued in order; a `draw` prompt with two options is left to the player.

## 2. Settings hint

- [x] 2.1 Add `menu.tapDecks.hint` to `content/i18n/en/ui.json` ("Off: cards are drawn by themselves, nothing to tap") and `content/i18n/ru/ui.json`.
- [x] 2.2 In `src/ui/menu/Settings/Settings.tsx` render the hint under the checkbox like the pace hint (`small`, `aria-describedby`).

## 3. Checks

- [ ] 3.1 In the browser (dev server on port 5174): start a scenario with the setting on, untick it mid-game, confirm the next upkeep and mythos draws happen with no glow, instruction or Draw button; tick it again and confirm the next draw waits; save screenshots under `.playwright-mcp/`.
- [x] 3.2 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm check:content`.
- [x] 3.3 `openspec validate tap-decks-at-once --type change --strict`.
