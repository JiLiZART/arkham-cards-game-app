## 1. Confirm and record the baseline

- [ ] 1.1 Settle the proposal's open questions with the user (grill-me) and update proposal, spec and design where an answer differs from the assumption.
- [ ] 1.2 In the browser (own dev server on port 5174, Playwright, screenshots under `.playwright-mcp/`), record the mismatches the design's table predicts: a map card lit while drawn cards wait in the showcase, a deck lit while events play. Keep the screenshots as the before state.

## 2. The gate (tests first)

- [ ] 2.1 `src/ui/state/inputGate.test.ts`: a table of inputs, one row per reason and its precedence (`noChoice`, `animating`, `intro`, `showcase`, `middle`, `notYourSeat`, `notShown`, open), including the skill-test claim and the phase-pause claim leaving the gate open, built on a real state from `src/engine/kits/testkit.ts`.
- [ ] 2.2 `src/ui/state/inputGate.ts`: `inputGate(input): Gate`, using `shownInv`, `viewerOf` and `holdsSeat` from `players.ts`; `choicesOffered` reimplemented on top of it or removed.
- [ ] 2.3 `useInputGate()` beside `useChoicesOffered()` in `src/ui/state/usePlayers.ts`, selecting only the fields the input needs.

## 3. The store

- [ ] 3.1 Test first (`src/ui/state/store.test.ts`; the online case in `storeNet.test.ts`): `choose` is ignored with events queued, with drawn cards in the showcase, during the introduction, with a phase title on the stage, and online for a seat this device doesn't hold; it is taken with only a `test:` or `pause:` claim on the stage.
- [ ] 3.2 `choose()` builds the input from `get()` and `useView.getState()` and returns when the gate is closed; the inline `mySeats` check goes.

## 4. Surfaces, one at a time

- [ ] 4.1 `useOptionsByCard` (`src/ui/game/cardClick.ts`) and `useCardOptions` (`Modals.tsx`) return nothing when the gate is closed.
- [ ] 4.2 `useHand` (`HandFan.tsx`), `MulliganRow.tsx`, `Showcase.tsx` (its deck pick and `choosePick`), `PileColumn.tsx` (the lit decks), `Hud.tsx`'s `PhoneDrawers`.
- [ ] 4.3 `InstructionBar` and `ActionRail` (`ActionRail.tsx`): the bar hides on a closed gate except `notYourSeat` and `notShown`, which keep `barAsk`'s waiting and hand-off lines; the rail dims on `animating`.
- [ ] 4.4 `InvestigatorChoiceOverlay`: `show` is `investigatorChoice(game) && gate.open`.
- [ ] 4.5 `rg "s.queue.length > 0" src/ui` finds only timing consumers (`AutoSwitch`, `ScenarioEnd`, `TipLayer`, `SoundLayer`, `feed.ts`); no surface keeps a local busy test.

## 5. Verification

- [ ] 5.1 Every bot playthrough in `src/ui/game/optionHome.test.ts` still answers every choice once the gate opens (the gate closes only on view state, never on the game).
- [ ] 5.2 Browser pass (desktop and phone): a full round of The Gathering with two investigators; the before-state screenshots from 1.2 now show nothing lit; an encounter card in the showcase; a skill test with a commit; an online room with two tabs where the waiting device lights nothing.
- [ ] 5.3 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format` (on the files this change touches only), `openspec validate ui-input-gate --type change --strict`.
