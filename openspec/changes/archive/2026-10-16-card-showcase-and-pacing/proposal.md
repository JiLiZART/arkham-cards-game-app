## Why

Playing a few rounds shows the table still moves faster than a player can follow:

- A drawn card only pauses at the show spot for a moment before it lands in the fan, so you don't get to read it.
- Searching or looking at your deck is a list of names in a prompt.
- Phase titles stack, so you see "Enemy phase" and a second later "Upkeep phase" with nothing in between.
- When a location or treachery hurts you, nothing on the table says where the damage came from.
- A card committed by mistake can't be taken back once you press Done.
- The chaos bag pops into the middle of the screen.
- Advancing the act means opening the full viewer and looking for the button in a side column.

## What Changes

- **Card showcase:**
  - A card you draw flies from your deck to a showcase area in the centre of the screen, face up and large. It stays there until you click it (or press Space/Enter), then flies into your hand.
  - Several cards drawn together show side by side and go to hand with one click.
  - Game choices wait while the showcase is open.
- **Picking from a deck:** choices that pick cards out of your deck or discard pile (Old Book of Lore's search, look at the top cards, choose a card from your discard) show those cards large in the same central area. Click a card to pick it, and it flies to your hand; "none" stays a button.
- **Investigate in the action rail:** the rail with Draw and Gain resource gets an Investigate button whenever investigating is legal. Clicking the location still works.
- **Effect hits:** when a card's effect makes an investigator take damage or horror, or lose resources or clues, the source card pulses and a streak flies from it to that investigator's portrait. The numbers then change. Sources include a location's forced ability, a treachery in their threat area and an enemy attack.
- **Phases paced by the lead investigator:**
  - When a phase begins, the engine waits for the lead investigator.
  - The phase title stays on screen with a Continue button (or Space/Enter), and the phase resolves only after it is pressed.
  - The pause is a recorded choice, so replays stay exact, and the bot answers it.
  - New games pace phases. Engine tests and old saves don't.
- **Undo:**
  - An Undo button takes back your last choices (a commit, Done, starting Fight or Investigate, a move, and so on).
  - It works back to the last moment hidden information was revealed: a chaos token drawn, a card drawn, an encounter card, a search or a shuffle.
  - It replays the recorded choices without the undone ones, so the result is exactly the game you would have had.
- **Chaos bag entrance:** for a token draw, the bag grows out of the chaos-bag button into the middle of the screen before the token circles appear, and it shrinks back after the draw. The same goes for the automatic draw.
- **Act and agenda buttons on the card:**
  - An option on the act or agenda (Advance act and others) shows as a button laid over that card in the act/agenda panel, so it can be used without opening the viewer.
  - In the viewer, the buttons sit over the current card instead of in the side column.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `game-table-ui`: new requirements Card showcase, Picking cards from a deck, Investigate in the action rail, Effect hits, Phase pacing on screen, Undo, Chaos bag entrance, and Act and agenda buttons on the card.
- `game-engine`:
  - new requirement Phase pacing: a recorded lead-investigator pause at the start of each phase, enabled by a setup flag;
  - the source card on damage and loss events;
  - a reveal counter that marks how far back Undo may go.

## Impact

- **Engine:**
  - `src/engine/rules/flow.ts`: the phase pause step, plus a `pacePhases` flag in `GameSetup` (`types.ts`) that new UI games set.
  - `src/engine/bot.ts`: the bot answers the pause.
  - The reveal counter is bumped where the engine draws, searches, shuffles or uses the RNG (`effects.ts`, `rules/*`).
  - Damage and loss events get `data.source` (`investigators.ts`, `effects.ts`).
- **Store:** `src/ui/store.ts` gets `undo()` and `canUndo`, using `replay` on a shortened action list. `PhaseTitle`, the feed and arrivals must cope with a log that gets shorter.
- **UI:**
  - new `hud/Showcase.tsx` (draws and deck picks);
  - `HandFan.tsx` (draws land through the showcase);
  - `ActionRail.tsx` (Investigate and Undo);
  - `Hud.tsx` (`PhaseTitle` with Continue; `HandOff` skips the phase pause);
  - `TokenDraw.tsx` and `Reveal.tsx` (bag entrance);
  - new hit streaks in `Floats.tsx`;
  - `Panels.tsx` and `DeckViewer.tsx` (buttons on the card);
  - `optionHome.ts`;
  - en/ru strings and styles.
- **Tests:** the testkit keeps phases unpaced. There are new engine tests for the pause, the reveal counter and event sources; the store gets an undo test; `drive.js` steps through the pauses, the showcase and an undo.
- **No new dependencies.**
