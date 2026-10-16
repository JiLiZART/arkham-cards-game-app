## 1. Tips data

- [ ] 1.1 Write the `tip.*` strings (about fifteen) and the five `howto.*` parts in `content/i18n/en/ui.json` and `ru/ui.json` following the wording rules in design decision 5. Verify `npm run check:content` passes with key parity.
- [ ] 1.2 Add `TIPS` and `pickTip` in `src/ui/tips.ts` with `tips.test.ts`: the scenario-start tip on a fresh game, the turn tip on the first turn only, the commit tip during a commit prompt, no tip for a hidden hand in privacy mode, a seen tip skipped, nothing with tips off.

## 2. Layer

- [ ] 2.1 Add `data-tip` attributes to the anchors: the rail's Investigate and End turn, the stat dock portrait, the act card, the chaos bag, the skill test panel, the hand fan, the undo button, the instruction bar. Verify each is found by `document.querySelector('[data-tip=...]')` in the browser.
- [ ] 2.2 Add `TipLayer` (design decision 2): placement beside the anchor with an arrow, map anchors re-placed on camera ticks, off-screen fallback, dismissal by state, "Got it", seen ids written to `ah:tips`. Verify in the browser with `setup-fight.js` after Reset tips: the enemy tip points at the Ghoul in the strip; starting a fight dismisses it; the commit tip then appears beside the test panel; reloading doesn't show either again.
- [ ] 2.3 Verify the layer respects the stage: with a showcase open, no tip shows until "To hand"; while an attack plays, no tip shows.

## 3. Settings and page

- [ ] 3.1 Add `tipsOn` to `UiState` and the save settings, the menu toggle `menu.tips`, and `menu.resetTips`. Verify with a `store.test.ts` case that `tipsOn` defaults to true for old saves and persists.
- [ ] 3.2 Add the How to play screen to `Screens.tsx` with Back. Verify in the browser in English and Russian that the five parts render and Back returns to the menu.

## 4. Wrap-up

- [ ] 4.1 Run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with tips on and 0 errors, and `maxCenter` still 1 (tips don't count as centre overlays, confirm the sampler ignores `.tip-card`).
- [ ] 4.2 Update the README's play notes with tips, the toggle, Reset tips and How to play. Verify the README mentions `ah:tips`.
