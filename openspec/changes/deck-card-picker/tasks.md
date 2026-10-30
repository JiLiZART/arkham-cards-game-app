## 1. Which cards may stand in

- [x] 1.1 `replacementsFor(db, deck, out, pool)` in `src/ui/game/decks.ts`, tests first: a second Machete for a Flashlight; never the card itself; never a card already at its copy limit; nothing off-class.

## 2. The deck area

- [x] 2.1 `DeckEditArea`: the deck at full width (150 px cards), Add cards in the header on every layout, Replace and Remove on each deck card; the old pool-first Replace, its lit cards and its bar removed.
- [x] 2.2 The picker: one dialog (scrim on the desktop, full screen on the phone) with the pool's filters, a title, Close, Escape and scrim close; add mode with Add per card, replace mode with `replacementsFor` and a swap that closes it; the empty state. Picker cards 200 px (150 px on the phone).
- [x] 2.3 Strings in EN and RU: `deckEditor.replace`, `deckEditor.replaceTitle`, `deckEditor.replaceWith`, `deckEditor.noReplacement`; `deck.replaceWith` removed.

## 3. Verification

- [x] 3.1 Browser check at 1440×900 and 852×393: the deck spans the width; Add cards opens the picker and adds; Replace on a Flashlight lists Extra Ammunition, not Flashlight; a tap swaps and closes; Escape closes. Screenshots under `.playwright-mcp/deck-card-picker/`.
- [x] 3.2 `pnpm typecheck`, lint, tests, `pnpm format`, `openspec validate deck-card-picker --type change --strict`.
