## 1. Stage

- [x] 1.1 Add `stage: string[]`, `claimStage`, `releaseStage` and `useStageHolder(key)` to `src/ui/view.ts`, plus a `whenStageFree(fn)` helper. Holders release on unmount, which empties the stage on a new game, load and undo. Verify with a unit test in `store.test.ts` or a new `stage.test.ts`: claims queue in order, the head holds, release passes the stage on, and a reset empties it.
- [x] 1.2 Make `Showcase` (drawn cards and deck picks) and `IntroOverlay` claim and render only while they hold the stage, releasing on close or unmount. Verify in the browser: a draw from a successful test opens the showcase only after the result panel closes.
- [x] 1.3 Make `RevealOverlay`'s encounter flight wait for its event to hold the stage, show the resolving card only on an empty stage, and make `PhaseTitle`'s titles and paced pause, claim the stage. Remove `PhaseTitle`'s own `TITLE_WAITS` and showcase checks, which the stage replaces. Verify in the browser that a mythos title and the following encounter card never overlap.
- [x] 1.4 Make `EventPlayer` claim `event:<logIndex>` for token, testResult and encounter events and start their timers only while holding. Every other animated event starts only on an empty stage. Verify that `drive.js` still plays through round 3 with 0 errors and no stuck overlay.
- [x] 1.5 Hold `HandOff` while the stage is non-empty, replacing its intro and showcase checks. Verify that the hand-off appears only after the showcase closes, with privacy on, in `drive.js`.

## 2. Floats and hits

- [x] 2.1 Add `FLOAT_KINDS` to `src/ui/feed.ts` and filter `ActionFloats` through it. Verify with a `feed.test.ts` case that the resource, draw and move kinds are excluded and attack and damage are included.
- [x] 2.2 Release queued floats only on an empty stage, and run `HitFx`'s queued hits through `whenStageFree`. Verify in the browser: a horror hit while the showcase is open plays only after "To hand".

## 3. Merged feed

- [x] 3.1 Record `logMarks` in `store.ts` (the log length before each dispatch). Reset it on a new game, load or undo, and truncate it on undo. Verify with a `store.test.ts` case covering marks after two choices and after an undo.
- [x] 3.2 Implement a pure `mergeLive` in `src/ui/feed.ts`, covering routine runs within a burst, per-investigator sums, the "each investigator" form, joining kinds, and breaks on consequential entries. Verify with `feed.test.ts` cases for upkeep with 2 investigators, three draws by one investigator, an attack breaking a run, and two Draw actions in separate bursts that stay separate.
- [x] 3.3 Add the `feed.merged.*` templates to `content/i18n/en/ui.json` and `content/i18n/ru/ui.json`. Verify that `npm run check:content` and the i18n tests pass.
- [x] 3.4 Make the live `Feed` use `mergeLive` with `LIVE_MAX = 4`. The Journal keeps raw entries. Verify in the browser that upkeep shows one merged line live, and the Journal lists every entry.

## 4. Spotlight

- [x] 4.1 Add `spotlight: { cards: InstId[]; invs: InvId[] } | null` to `view.ts`, and set it from `EventPlayer` for the current event (card, source, enemy, inv), clearing it when idle. Verify with a unit test of the pure `spotlightOf(event, game)` helper: ids not on the map are dropped, and an event with nothing on the map gives null.
- [x] 4.2 Add the dim plane to `Table.tsx` (eased opacity, no raycast, 0 under reduced motion), a `spotlit` lift and frame in `CardMesh`, and a `dimmed` class on mini-portraits that aren't spotlit. Verify in the browser: during an enemy attack the map dims except the enemy and the attacked investigator's mini, and returns to full brightness after. Check at the default and the zoomed-in camera.

## 5. Wrap-up

- [x] 5.1 Run `npm test`, `npm run lint`, `npm run build` and `npm run check:content`, all clean. Run `drive.js` through round 3 with privacy on: 0 console errors, at most one middle-of-screen overlay at any sampled moment, and no floats for resource or draw entries.
- [x] 5.2 Update the README's play notes on the feed, floats and spotlight, and verify that the README mentions the merged live feed and the Journal.
