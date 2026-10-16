## Why

The only place that says where the game is, is one line of small text top-left: "Round 1 · investigation". Actions left is a number in the stat dock. Whose turn comes next, and what the enemies will do when the turns are over, is nowhere. A player loses the thread between phases and presses End turn without knowing a Ghoul is about to bite. Turn-based games keep a tracker on screen at all times: the stages of a round, who acts now, what is left to spend, and what the enemy intends.

## What Changes

- **Phase ribbon.** A strip across the top shows the round's four phases in order (Mythos, Investigation, Enemy, Upkeep) with the current one lit and the round number. It replaces the "Round · phase" text.
- **Turn order and action pips.** In the investigation phase the ribbon's Investigation segment expands into the investigators in turn order: portrait, three action pips (more when extra actions apply), lit for the active one, dimmed for turns already taken. Pips empty one by one as actions are spent. The stat dock's action count goes away, because the ribbon shows it.
- **End turn stands out when there is nothing left.** When the active investigator has no actions left, End turn glows and the rail's paid actions are dimmed.
- **Enemy intents.** Every enemy on the map and in the play strip carries a badge saying what it will do in the enemy phase: attack with its damage and horror, hunt toward the investigators, or rest because it is exhausted. The badge changes as soon as the state does (an evade exhausts it, an engage makes it an attacker).
- **Turn title.** When the active investigator changes and no hand-off screen is shown, a short "Roland's turn" title plays in the middle, in the phase title's style, so a second investigator's turn in the same phase has a beginning.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: adds the phase ribbon, turn order and action pips, enemy intents and the turn title.

## Impact

- New `src/ui/hud/Ribbon.tsx` replacing the scenario line in `TopBar` (`Hud.tsx`); the Journal, Debug and Menu buttons stay.
- `src/ui/hud/Stats.tsx`: the actions stat is removed from `StatBody`.
- `src/ui/hud/ActionRail.tsx`: End turn's `primary` style becomes a glow when `actionsLeft` is 0; paid actions dim.
- New pure `src/ui/intent.ts` (`intentOf(game, enemy)`) with tests; badges rendered by `TokenBadges` for strip cards and by the map's HTML overlay (the same projection the mini-portraits use) for map enemies.
- `src/ui/hud/Hud.tsx`: `TurnTitle` beside `PhaseTitle`, claiming the stage like a title.
- `content/i18n/{en,ru}/ui.json`: ribbon, intent and turn-title strings.
- CSS for the ribbon, pips, badges and the glow. The ribbon is one row that collapses to portraits only under 700 px, for the mobile layout to come.
