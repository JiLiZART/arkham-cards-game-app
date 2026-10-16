## 1. Instructions

- [ ] 1.1 Add `instruction.*` strings for every `prompt.*` key in `content/i18n/en/ui.json` and `ru/ui.json`, written for a first-time player (verb, target, what happens). Verify `npm run check:content` passes with key parity between the locales.
- [ ] 1.2 Add `instructionParts` in `src/ui/instruction.ts` with `instruction.test.ts`: substitution of investigator and card vars, fallback to `promptParts`, fallback to the engine sentence without the name prefix.

## 2. Bar and rail

- [ ] 2.1 Add the `"bar"` home in `optionHome` for `railItem`-primary options; `ActionRail` shows only `rail` homes. Verify with an `optionHome.test.ts` case: Done, Pass, End turn go to the bar; Draw, Resource, Investigate stay on the rail.
- [ ] 2.2 Replace `PromptBanner` with `InstructionBar` (portrait, instruction, bar buttons, hidden while busy). Verify in the browser with `setup-fight.js`: the commit prompt shows Done in the bar and not on the rail; on the turn choice the bar holds End turn and the rail Draw, Resource, Investigate; Space/Enter behaviour of the showcase and pause is unchanged.

## 3. Choice spotlight

- [ ] 3.1 Add `spotlightOfChoice(game, viewer)` in `src/ui/spotlight.ts` with tests: null for turn, mulligan, phase and deck picks; option cards and investigators for assign, target, commit and discard choices; hand options included.
- [ ] 3.2 Set `view.spotlight` from the choice when no event plays or is queued and the stage is empty (events win). Verify with `stage.test.ts` or `spotlight.test.ts` that an event spotlight replaces a choice spotlight and the choice spotlight returns after.
- [ ] 3.3 Add `useDimmed` and the `dimmed` class to `MiniCard`, the fan's cards, the stat dock portrait and `InvToken`. Verify in the browser: assign damage with Guard Dog in play dims the map, hand, act and piles while Roland's portrait and Guard Dog stay bright; the dim clears after the tap; the turn choice dims nothing.

## 4. Wrap-up

- [ ] 4.1 Run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with 0 errors.
- [ ] 4.2 Update the README's play notes (instruction bar, End turn in the bar, choice dim) and verify the rail paragraph lists Draw, Resource and Investigate only.
