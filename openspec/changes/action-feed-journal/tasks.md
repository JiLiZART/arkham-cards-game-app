## 1. Engine event data

- [x] 1.1 Audit every `emit()` and add the structured `data` the feed needs: `resource {n, lost}`, `heal {damage, horror}`, `attack {damage, horror}`, `draw {n}`, `move {from}`, `spawn {at}`, `enemyDefeated {by}`, `phase {phase}`, `testStart {skill, kind}`, plus `card` where an event concerns a card. Do not change any logic. Verify with engine tests: the three scenario playthroughs end in the same states as before (comparing everything except `log[].data`), and spot checks for `resource` `n` = 3, `attack` `{damage: 1, horror: 1}`, and `clues` `n`.

## 2. Event → styled parts

- [x] 2.1 Write `src/ui/feed.ts`: the `Part` types, a template parser (`{inv}`, `{card}`, `{target}`, `{n:<icon>}`, `{skill}`, `{tokens}`, `{outcome}`, with zero amounts dropped), `feedEntry(event, game, locale)` with a tone (player / enemy / game), the hidden types, and the generic fallback. Verify with unit tests: `resource`, `attack` and `testResult` give the expected parts, and no part keeps an unreplaced placeholder.
- [x] 2.2 Add `feed.*` templates to `en/ui.json` and `ru/ui.json` for every event type. Verify with tests: every event type seen in bot playthroughs of the three scenarios gives non-null parts (or is in the hidden list), and every English template has a Russian one with the same placeholders.
- [x] 2.3 Add the feed cursor: the store keeps each queued event's `logIndex`, and a pure `shownCount(log, current, queue)` decides what is shown. Verify with a unit test that non-animated events before an animated one show at once, and later ones only when it starts playing.

## 3. Feed, Journal and action floats

- [x] 3.1 Add a `.right-col` layout (chaos bag, investigator tokens, feed; 300 px wide) and set `HUD_INSETS.right = 320`. Add `Feed.tsx` live mode:
  - styled parts: portrait and class-coloured name, card thumbnails (click opens the modal, hover enlarges), amount icons, chaos tokens, outcome colours;
  - kill-feed order: newest at the top, dropping in (slide down and fade in), older entries move down smoothly;
  - opacity fading toward the bottom;
  - leaving at the bottom after 12 s or beyond 8 entries;
  - hidden behind the hand-off screen.

  Verify manually with a screenshot sequence over three quick events: each drops in at the top, the older ones move down and fade, and the oldest leaves at the bottom. Also check that clicking a thumbnail opens the card modal.
- [x] 3.2 Journal: the navbar Log button becomes Journal and switches the column to the full scrollable history (newest first, no fading, opened at the top, new entries appear at the top, Escape returns). Remove `LogPanel`. Verify manually after two rounds: scroll down to the scenario start, then toggle back to the live feed.
- [x] 3.3 Action floats: for each new entry, the styled sentence rises and fades from the acting investigator's portrait, or the enemy's card, on the map, following camera moves. It falls back to the centre when there is no on-screen actor. Floats are staggered 350 ms, at most three visible, last three only on bursts over six, and never take the pointer. Remove the plain-text event banner. Verify manually: Roland's resource action rises from his portrait, an enemy attack rises from the enemy's card, a doom entry rises from the centre, and starting a scenario doesn't flood the screen.

## 3b. Prompt banner and map cards

- [x] 3.4 Engine: `ask()` takes a `{ key, vars }` prompt for all 23 call sites (`PendingChoice.promptKey` and `promptVars`); the English text stays. Verify with an engine test that a turn prompt has key `turn` with `{ inv, actions: 3 }`, and that replays are unchanged.
- [x] 3.5 `PromptBanner`: portrait plus class-coloured name, a translated `prompt.<key>` template rendered as styled parts (bold numbers with glyphs, card names in card type, skill icons), 22 px, with the English text as the fallback. Add `prompt.*` templates in `en` and `ru`. Verify with a test (every promptKey from bot playthroughs has `en` and `ru` templates with the same placeholders) and screenshots of the turn and commit banners in `en` and `ru`.
- [x] 3.6 Map cards: rounded card geometry (corners about 4.5% of the width, UVs fitted) and a rounded highlight frame at half the thickness. Verify with a screenshot of a legal location and a hovered enemy: thin gold rounded frames and no square corners.

- [x] 3.7 Hand card details: pure `cardDetails()` and `placeDetails()` with unit tests (Machete rows, a skill, an ally; right side, left fallback at the right edge, vertical clamp), and a `HandDetails` column beside the hovered or focused hand card. It shows the name, class and type, XP pips, cost, traits, slots, skill icons, health and sanity or uses, and text; never takes the pointer; hides while dragging and behind the hand-off; and is translated. Verify with screenshots of a hovered Machete and of the rightmost card of a 7-card hand.

## 4. Verification

- [x] 4.1 Extend the scripted UI playthrough (drive.js): two rounds of The Gathering at 1600×900, with screenshots of the live feed, the Journal, an action float, the prompt banner, a highlighted location and a hovered hand card with its details column. Also switch to `ru` and check the feed entries are in Russian. Confirm there are no console errors.
- [x] 4.2 Run `npm test`, `npm run lint`, `npm run build` and `npm run check:content`, and confirm they all pass. Update the README's play notes (feed, Journal, action floats).
