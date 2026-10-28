## Why

"Tap decks to draw" is on by default and does what the player asked for when it is off: no "Tap your deck to draw" wait, no Draw button in the instruction bar, the card just comes. But it is read once, when a scenario starts (`tapDecks` goes into the engine's setup), so turning it off in a running game changes nothing until the next scenario, and turning it on mid-game can never make an untapped game wait. The player sees the checkbox, unticks it, and the deck keeps asking.

The other one-button waits were checked and already take care of themselves: the phase title starts by itself after 3 s, a commit window with nothing to commit and no fast ability is skipped by the engine, and the test result closes on its own at the Normal and Slow paces. The encounter and weakness showcase keeps its Continue on purpose: the player must read the card.

## What Changes

- **The setting takes effect at once, in both directions.** Every UI game is created with tapped decks, so the engine always offers the "draw" choice before a draw in play. While "Tap decks to draw" is off, the UI answers that choice itself the moment it appears, in the same update that produced it: no deck glow, no instruction, no Draw button, no table switch for the drawing investigator; the cards leave the deck and fly as usual. While it is on, the deck waits for its tap exactly as today. Switching it off while a deck is waiting draws at once; switching it on makes the next draw wait.
- **Replays, saves and undo are unchanged.** The automatic answer is a recorded choice like a tap, so a save, a bug report or a replay reproduces the game exactly, and Undo's limits are what they are now (a draw reveals hidden information, so it can't be undone; with the setting off the draw follows its cause at once, so the window for undoing that cause closes at once).
- **A hint under the checkbox** says what "off" does: cards are drawn by themselves, nothing to tap; in both locales.
- Not in scope: the encounter and weakness showcase (the player asked that it keep waiting for a tap so the card can be read), the phase countdown, the chaos token draw (its own setting), old saves and imported logs started without tapped decks (they never asked and never will), the bot.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `game-table-ui`: "Tap decks to draw setting" — the setting is read on every draw, not at scenario start; off means the UI draws by itself with nothing shown to tap, on means the deck waits; switching mid-game applies to the current wait and the next draw; a hint explains "off".

## Impact

- `src/ui/state/store.ts`: `startScenario` always passes `tapDecks: true`; a small `settleDraws()` step runs after every dispatch that can leave a pending choice (`choose`, `startScenario`, a save or report loaded) and on `setTapDecks(false)`: while the pending choice is a `draw` and the setting is off, dispatch its one option and append the events, recording the action. It bypasses `choose()`'s input gate (it is not input) and records `logMarks` and `undoFloor` the same way.
- `src/ui/menu/Settings/Settings.tsx` and `content/i18n/{en,ru}/ui.json`: the hint under the checkbox (`menu.tapDecks.hint`).
- Tests: `src/ui/state/store.test.ts` (off: the upkeep draw's cards are in hand with no `draw` pending and the action recorded; on: it waits; toggling off answers a waiting draw; a loaded save with a waiting draw and the setting off draws at once; replaying the actions gives the same game).
- No engine change: `tapToDraw` and the `game-engine` spec stay as they are. No new dependency.
