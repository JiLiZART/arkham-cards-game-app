## Why

A first-time player, someone who has never played a card game, gets no help: the table appears with a mulligan prompt and forty cards, and nothing explains the goal, the three actions, what a skill test is or why a Ghoul matters. The rules of Arkham Horror are long, but what a player needs at each moment is one sentence and a pointer at the thing to tap. Card games teach this way: one tip at a time, in the real game, gone as soon as you do it.

## What Changes

- **Tips, one at a time.** A tip is a small card with one or two plain sentences and an arrow to the thing it talks about. It appears the first time a situation comes up: the start of a scenario (the goal: the act says what to do, the agenda is the clock), the mulligan, your turn and its three actions, investigating, moving, playing a card, a skill test and committing, the chaos token, an enemy appearing, taking damage or horror, the mythos phase, upkeep and the hand limit, ending the turn, undo. About fifteen tips.
- **Shown at the right moment.** A tip waits until nothing plays and the game is waiting for the player it addresses. It never covers the middle of the screen, never blocks input, and goes away when the player does what it says, or taps "Got it".
- **Remembered.** A tip seen once isn't shown again on this device. The menu has "Show tips" (on by default) and "Reset tips". Tips are in English and Russian.
- **A "How to play" page** in the menu with the same sentences as a five-point summary, for reading before the first game.

## Capabilities

### New Capabilities

- `tutorial`: tips shown in play the first time a situation comes up, and the how-to-play summary.

### Modified Capabilities

None.

## Impact

- New `src/ui/tips.ts`: the tip list as data (id, when it applies, what it points at), with `pickTip` tested in `tips.test.ts`.
- New `src/ui/hud/TipLayer.tsx`: shows the picked tip anchored to a DOM element or a map card (through the map projector), waits for the stage and for input to be unblocked.
- `src/ui/store.ts` or `view.ts`: `tipsOn` setting (saved) and the seen set in local storage under `ah:tips`.
- `src/ui/Screens.tsx`: the menu toggle, Reset tips, and the How to play page.
- `content/i18n/{en,ru}/ui.json`: `tip.*` and `howto.*` strings.
- Anchors use existing hooks: the rail buttons, the fan, the stat dock portrait, the act card, the chaos bag, the instruction bar. Best built after `choice-bar` and `round-tracker`, which it points at.
