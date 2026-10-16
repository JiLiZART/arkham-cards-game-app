## 1. Engine step events

- [ ] 1.1 Emit `step` events (`doom`, `encounter`, `hunters`, `attacks`, `upkeep`, `handSize`) from the phase handlers as in design decision 1. Verify with `engine.test.ts` cases: an enemy phase with a hunter and an engaged enemy logs `hunters` then `attacks` in order; an enemy phase with no enemies logs neither; round 2's mythos logs `doom` then one `encounter` per investigator; `handSize` is logged only for an investigator over 8 cards.
- [ ] 1.2 Verify replay compatibility: `fuzz.test.ts` and `scenarios.test.ts` pass, and a recorded action log from before the change (`.playwright-mcp` or a test fixture) replays to the same pending choice and counters.

## 2. Caption

- [ ] 2.1 Add `step` to the feed's `HIDDEN` set and render step entries in the Journal as `feed-step` dividers. Verify with a `feed.test.ts` case that the live entries skip them and the journal keeps them.
- [ ] 2.2 Add `StepCaption` to the centre column (above the prompt banner's slot), derived from the shown log as in decision 2, with `caption.step.*` strings in `en` and `ru`. Verify in the browser with `drive.js`: during the enemy phase "Hunters move" then "Enemies attack" appear in turn, and the caption is gone once the next choice is offered.

## 3. Enemy move beat and camera

- [ ] 3.1 Add `enemyMove` to `ANIMATED` with an 800 ms duration, not floated, spotlit through `spotlightOf`. Verify with `setup-fight.js` plus a hunter two locations away: ending the turn shows the Ghoul dimmed-around and sliding, and the attack starts only after.
- [ ] 3.2 Override the camera focus from `view.playing` as in decision 4, with `focusKey` per event and a drag that cancels the pan for that event; jump under reduced motion. Verify in the browser that the camera pans to the hunter for its move and returns to the decider; verify with a `camera.test.ts` case for the pure "focus of an event" helper (enemy, inv, spawn location, nothing on the map).

## 4. Pace

- [ ] 4.1 Add the `pace` setting to `UiState`, the save's `settings`, the menu (`menu.pace`, `pace.normal`, `pace.slow`, `pace.tap` in `en` and `ru`). Verify with a `store.test.ts` case that the setting survives `resume()` and defaults to `normal` for old saves.
- [ ] 4.2 Scale durations and generalise `waits` in `EventPlayer` as in decision 5; show Next in the caption while an event is held; Space/Enter and a click on the spotlit card continue. Verify in the browser: with Tap, an enemy attack holds until Next, then the damage plays and the next event holds again; with Slow, `drive-calm.js`'s sampler still sees `maxCenter` 1.

## 5. Wrap-up

- [ ] 5.1 Run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean, and `drive-calm.js` to round 3 with 0 console errors at each pace.
- [ ] 5.2 Update the README's play notes (captions, camera, the pace setting) and the Debugging note on hooks if a new one is exposed. Verify the README mentions all three pace values.
