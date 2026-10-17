## 1. The model

- [ ] 1.1 Add `src/ui/decks.ts` with `decks.test.ts`: `poolFor(inv)` (level 0, allowed classes and neutral, no signatures or weaknesses, loaded packs), `applySwaps(base, ops)` → resolved `DeckDef`, `swapBudget(ops)` (5 removals), `basicWeaknesses()`, custom-deck storage (`customDecks`, `saveCustomDeck`, `renameCustomDeck`, `deleteCustomDeck`) over `safeStorage()` with validation and reasons. Cover: Roland's pool excludes Mystic cards and signatures, a sixth removal is refused, a third copy fails validation with the card named, a saved deck round-trips and is invalid when a card's pack is missing.
- [ ] 1.2 Add `weakness` to `GameSetup.investigators[]` and use it in `scenarioSetup` instead of the random draw when set; `campaign.test.ts` case. Verify `npm test`.

## 2. The editor

- [ ] 2.1 Add `src/ui/menu/DeckEditor.tsx` on the wizard's deck step: grouped list with cost, copies and glance chips (when available), remove/add with the budget shown, the pool as a searchable list, the weakness picker (random by default), live validation messages in plain words (`deck.*` strings in en and ru), Save (name field, disabled while invalid), Cancel. The deck step lists custom decks with rename and delete and marks invalid ones. Verify in the browser with a new `check-deck-editor.js`: swap Flashlight ×2 for Physical Training ×2, save as "Roland · test", start a campaign with it and confirm the deck in play; a sixth removal is refused; a third Machete shows the message and disables Save; the saved deck appears in a second new game.

## 3. Verification and docs

- [ ] 3.1 Run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with 0 errors; `check-deck-editor.js` passes.
- [ ] 3.2 README play notes: editing a deck, the swap limit, choosing the weakness, custom decks. Run `openspec validate deck-configuration --type change --strict`.
