## Why

Cards leave the decks on their own: the upkeep draw, the mythos encounter draw, a treachery's "draw the top card", Surge. The player only sees the card appear in the showcase and has no sense of the deck as a thing on the table. The physical game's rhythm is that you reach for the deck. The piles also give no sign when they can be used: the "Draw 1 card" action lives on the rail, and the deck pile only opens the top card of a discard.

## What Changes

- A new game setting, **Tap decks to draw**, on by default. With it, every draw from the investigator's deck or the encounter deck during play waits for the drawing investigator to tap that deck: the upkeep draw, the mythos encounter draw (each investigator taps in turn), draws from card effects (one tap for "draw 2 cards"), Surge, and the Draw action. Setup draws (opening hands, the mulligan redraw) and the bot's games are unchanged.
- The decks are highlighted when they can be tapped: the investigator's deck when the Draw action is available or a draw waits, the encounter deck when an encounter draw waits; the rest of the table dims as for any choice. The instruction bar says what to do ("Tap your deck to draw a card", "Tap the encounter deck") and offers a Draw button for the phone, where the piles sit in a drawer whose handle glows too.
- The wait is a pending choice in the engine, so saves, replays and undo see an ordinary action; games started before this change replay unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: tapped draws as pending choices when the setup asks for them.
- `game-table-ui`: deck piles that highlight and answer a tap; the setting.

## Impact

- `src/engine/types.ts` (`GameSetup.tapDecks`, pending kind `draw`), `src/engine/rules/investigators.ts` (Draw), `src/engine/rules/scenario.ts` (DrawEncounter), `src/engine/bot.ts`; `src/ui/store.ts` and `Settings.tsx` (the setting, into the setup like `pacePhases`), `src/ui/hud/Panels.tsx` (piles answer options), `players.ts`/instruction strings, the spotlight, the phone drawer handle; tests and the drive scripts, which must tap the decks.
