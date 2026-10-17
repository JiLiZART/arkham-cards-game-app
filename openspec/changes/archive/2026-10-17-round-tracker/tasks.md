## 1. Models

- [x] 1.1 Add pure `ribbonModel(game)` in `src/ui/ribbon.ts` with `ribbon.test.ts` covering: round 1 (mythos skipped), round 2 enemy phase (done/current/todo), turn states and pips for an active investigator with 3 and with 4 actions, done and to-play investigators, a resigned investigator left out.
- [x] 1.2 Add pure `intentOf(game, enemyId)` in `src/ui/intent.ts` with `intent.test.ts` covering attack (with damage and horror), hunt, rest, wait, and the evade and engage transitions.

## 2. Ribbon

- [x] 2.1 Add `Ribbon.tsx` rendering the model: phases, round, scenario label, turn row with portraits and pips (CSS shrink on emptying, none under reduced motion), and the `ribbon.*` strings in `en` and `ru`. Replace the scenario line in `TopBar`. Verify in the browser with `drive.js`: round 1 shows Mythos skipped; the enemy phase of round 2 lights Enemy.
- [x] 2.2 Remove the actions stat from `StatBody`. Verify the stat dock shows health, sanity and skills only and the investigator modal still renders.
- [x] 2.3 Verify the ribbon at 640 px wide (Playwright viewport): one row, portraits without labels, nothing overlapping the act/agenda panel.

## 3. End turn and intents

- [x] 3.1 Glow End turn and dim paid rail actions when the active investigator has 0 actions. Verify with `setup-fight.js`: after three actions End turn glows and Draw/Resource/Investigate are dimmed.
- [x] 3.2 Render intent badges in `TokenBadges` for strip enemies and as projected HTML badges for map enemies, with `intent.*` hover strings. Verify in the browser: an engaged Ghoul shows attack 1/1 in the strip; after an evade it shows rest; a hunter in an empty location on the map shows hunt.

## 4. Turn title

- [x] 4.1 Add `TurnTitle` (design decision 5) claiming the stage, with `turn.title` strings. Verify in a 2-player browser game with privacy off: "Daisy's turn" plays after Roland's End turn; with privacy on, only the hand-off appears; the lead's first turn after the investigation pause gets no title.

## 5. Wrap-up

- [x] 5.1 Run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with 0 errors and `maxCenter` 1 (the turn title counts as a centre overlay).
- [x] 5.2 Update the README's play notes (ribbon, pips, intents, turn title) and verify it no longer mentions the top-left round text.
