## Why

The deck step splits the screen in two: the deck on the left and the card pool on the right, each at half width with cards 118 px wide, too small to read. Replace works backwards: the player picks the incoming card in the pool first, then hunts for a lit card in the deck. The player thinks the other way round: "this card is weak, what can go in its place?"

## What Changes

- The deck takes the whole width of the deck step, with bigger cards (150 px minimum, up from 118).
- The card pool is no longer beside the deck. It opens in a card picker: a dialog over a scrim on the desktop, the whole screen on the phone, with its search and its class, type and level filters, a title and Close (also Escape and, on the desktop, a tap on the scrim).
- **Add cards** (in the deck's header, on every layout) opens the picker with every card the investigator may take, each offering Add, disabled with the reason when it can't go in. The picker stays open to add several.
- Each card of the deck offers **Replace** beside Remove. Replace opens the picker titled "Replace <card> with…", listing only the cards that may stand in for one copy of it; a tap on one swaps them and closes the picker. When no card can, the picker says so.
- The picker's cards are bigger than the deck's (200 px minimum on the desktop, 150 px on the phone).
- **BREAKING** (behaviour only): the old Replace on a pool card that lit the deck's cards, and its "Tap a card of the deck…" bar, go.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `investigator-decks`: Deck configuration: the deck area is the deck at full width; the pool opens in a picker from Add cards; Replace starts from a deck card and offers only the cards that may stand in for it.

## Impact

- `src/ui/menu/DeckEditArea/DeckEditArea.tsx` and its CSS Module: the layout, the picker, the Replace flow. Used by the wizard's deck step and the deck builder (`src/ui/menu/DeckBuilder`).
- `src/ui/game/decks.ts`: `replacementsFor(db, deck, out, pool)`, tested in `decks.test.ts`.
- `content/i18n/{en,ru}/ui.json`: new strings for the replace title, the per-card Replace label and the empty state; `deck.replaceWith` goes.
- No engine or content change.
