## Why

Drawing a card is the most frequent moment in the game and it reads as a card materialising: the pile does nothing, a small box flies to the centre and flips, and the showcase that holds it has a scrollbar, a shadow that shows as a dark box mid-flip, a card too small to read, and a "To hand" button under cards the player can just tap. Searches that show three cards to choose from use the same box. The draw should look like a card coming out of the deck, the showcase should be a clean reading place, and hovering a showcased card should tell you what it is, as the fan does.

## What Changes

- **Rise and arc.** A drawn card rises face down out of the deck pile, then arcs to the centre growing and turning face up, settling in the showcase; several cards leave the pile one after another and line up. Deck picks (search the top cards, look at the discard) come out the same way. Under reduced motion the cards appear in place.
- **A cleaner showcase.** Cards 340 px wide at 1080p (from 260), one shadow per card and none on the flip faces, up to four in a row, five to eight shrink into two rows, more shrink further; never a scrollbar. The dark backdrop stays.
- **No button, a help line.** "To hand" goes. Under drawn cards: "Tap a card to take it to your hand" (a tap on any card or on the backdrop, or Space or Enter, sends them all to the fan). Under a pick: "Choose one", or "Choose one, or take nothing" with the none option as a text link rather than a button. Other non-card options of a pick (done, a named choice) stay as small text links in the same line.
- **Details on hover.** The fan's details column (name, type, cost, icons, traits, text) appears beside a hovered or focused showcased card, to its right or, for the rightmost, to its left; on touch screens on a long press. The enlarged hover copy is not shown there: the card is already large.

Out of scope: the opening hand and mulligan (they fly straight to the fan, as now), draws into another investigator's hand, the phone layout of the showcase beyond the shrink rule.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `game-table-ui`: the card showcase (animation, size, dismissal, help text, hover details) and picking cards from a deck (same animation, help line instead of buttons).

## Impact

- `src/ui/hud/Showcase.tsx` (the rise-and-arc flight, the layout rule, the help line, the details column, the backdrop tap), `src/ui/hud/flights.ts` (a `riseAndArc` flight shared with picks), `src/ui/hud/HandDetails.tsx` (`DetailsColumn` reused beside a showcased card), `src/ui/hud/Panels.tsx` (the deck pile exposes its box for the rise; the pile's count drops as the card leaves), `styles.css` (`.showcase`, `.sc-*`), `content/i18n/{en,ru}/ui.json` (`showcase.take`, `showcase.choose`, `showcase.chooseOrNone`; `showcase.toHand` removed), `drive-calm.js` (it clicks `.sc-buttons .primary`).
- No engine change; the showcase stays a view-state hold on the stage.
