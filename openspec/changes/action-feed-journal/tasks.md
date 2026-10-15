## 1. Engine event data

- [ ] 1.1 Audit every `emit()` and add the structured `data` the feed needs: `resource {n, lost}`, `heal {damage, horror}`, `attack {damage, horror}`, `draw {n}`, `move {from}`, `spawn {at}`, `enemyDefeated {by}`, `phase {phase}`, `testStart {skill, kind}`, plus `card` where an event concerns a card. Do not change any logic. Verify with engine tests: the three scenario playthroughs end in the same states as before (comparing everything except `log[].data`), and spot checks for `resource` `n` = 3, `attack` `{damage: 1, horror: 1}`, and `clues` `n`.

## 2. Event → styled parts

- [ ] 2.1 Write `src/ui/feed.ts`: the `Part` types, a template parser (`{inv}`, `{card}`, `{target}`, `{n:<icon>}`, `{skill}`, `{tokens}`, `{outcome}`, with zero amounts dropped), `feedEntry(event, game, locale)` with a tone (player / enemy / game), the hidden types, and the generic fallback. Verify with unit tests: `resource`, `attack` and `testResult` give the expected parts, and no part keeps an unreplaced placeholder.
- [ ] 2.2 Add `feed.*` templates to `en/ui.json` and `ru/ui.json` for every event type. Verify with tests: every event type seen in bot playthroughs of the three scenarios gives non-null parts (or is in the hidden list), and every English template has a Russian one with the same placeholders.
- [ ] 2.3 Add the feed cursor: the store keeps each queued event's `logIndex`, and a pure `shownCount(log, current, queue)` decides what is shown. Verify with a unit test that non-animated events before an animated one show at once, and later ones only when it starts playing.

## 3. Feed, Journal and toasts

- [ ] 3.1 Add a `.right-col` layout (chaos bag, investigator tokens, feed; 300 px wide) and set `HUD_INSETS.right = 320`. Add `Feed.tsx` live mode:
  - styled parts: portrait and class-coloured name, card thumbnails (click opens the modal, hover enlarges), amount icons, chaos tokens, outcome colours;
  - appear animation at the bottom (slide up and fade in, older entries move up smoothly);
  - opacity fading toward the top;
  - leaving at the top after 12 s or beyond 8 entries;
  - hidden behind the hand-off screen.

  Verify manually with a screenshot sequence over three quick events: each slides in at the bottom, the older ones move up and fade, and the oldest leaves at the top. Also check that clicking a thumbnail opens the card modal.
- [ ] 3.2 Journal: the navbar Log button becomes Journal and switches the column to the full scrollable history (oldest first, no fading, opened at the bottom, following new entries, Escape returns). Remove `LogPanel`. Verify manually after two rounds: scroll back to the scenario start, then toggle back to the live feed.
- [ ] 3.3 Toasts: the styled sentence rises and fades in the centre of the screen for each new entry, staggered 350 ms, at most three visible, last three only on bursts over six, and never taking the pointer. Remove the plain-text event banner. Verify manually: an enemy attack shows a toast with icons while the feed gets the same entry, and starting a scenario doesn't flood the screen.

## 4. Verification

- [ ] 4.1 Extend the scripted UI playthrough (drive.js): two rounds of The Gathering at 1600×900, with screenshots of the live feed, the Journal and a toast. Also switch to `ru` and check the feed entries are in Russian. Confirm there are no console errors.
- [ ] 4.2 Run `npm test`, `npm run lint`, `npm run build` and `npm run check:content`, and confirm they all pass. Update the README's play notes (feed, Journal, toasts).
