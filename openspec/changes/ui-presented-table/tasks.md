## 1. Confirm and record the baseline

- [ ] 1.1 In the browser (own dev server on port 5174, Playwright, screenshots under `.playwright-mcp/`): with two investigators, open the other investigator's modal while a hunter's move is queued, and watch the encounter discard pile while a no-choice treachery waits in the showcase. Record which run ahead; drop from the change any surface that doesn't.
- [ ] 1.2 Settle the proposal's open questions with the user (grill-me) and update proposal, spec and design where an answer differs from the assumption.

## 2. The presented table (tests first)

- [ ] 2.1 `src/ui/game/presented.test.ts`: move `heldGame`'s tests from `spotlight.test.ts`; add that a queued `encounter` or `weakness` event's card is in `waiting`, a played one isn't, and that the same `game` object comes back when nothing is held.
- [ ] 2.2 `src/ui/game/presented.ts`: `presented(game, current, queue)` with `heldGame` and `heldCards` moved in; `spotlight.ts` and `store.ts` stop exporting them and import nothing back.
- [ ] 2.3 `usePresented()` in `src/ui/state/usePlayers.ts` (or a sibling file), memoised on `game`, `current` and `queue`.

## 3. Surfaces

- [ ] 3.1 `Table.tsx` (`Scene` and the arrival hold) and `PlayStrip.tsx` read `usePresented()`; no visible change.
- [ ] 3.2 `Investigators.tsx` (`investigatorCards`) and `AssetsModal.tsx` read the presented game and leave out `waiting`; tests first where these have pure helpers (extract `investigatorCards` if needed).
- [ ] 3.3 `PileColumn.tsx`: the encounter discard's count and top card leave out `waiting`.
- [ ] 3.4 `rg "heldGame|heldCards" src/ui` finds only `presented.ts` and its test.

## 4. Verification

- [ ] 4.1 Browser pass, desktop and phone: the cases from 1.1 now hold back; a hunter's move and an encounter enemy's spawn still glide on the map; the strip and the modal agree throughout.
- [ ] 4.2 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format` (on the files this change touches only), `openspec validate ui-presented-table --type change --strict`.
