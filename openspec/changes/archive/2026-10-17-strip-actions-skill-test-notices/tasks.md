## 1. Engine

- [x] 1.1 `commitStage`: an un-commit option per card the deciding investigator committed in this window (`{ uncommit }`). Taking a card back moves it to hand, splices `committed`/`committers`, emits a translated `uncommit` feed entry and asks again; the bot never picks it. Engine tests: take back then the card is offered again and the value drops; nothing to take back after Done; another investigator's card is never offered. Verify with `npm test`.
- [x] 1.2 `testParts(g, t)` breakdown (base, per-card icons, other modifiers, total, difficulty), with `testValue` rewritten as its sum. Unit test that the parts add up to `testValue` for a test with committed cards. Verify with `npm test`.

## 2. Details and hover

- [x] 2.1 `cardDetails` enemy rows (fight/health/evade, damage and horror attack, current damage with the instance) with en/ru strings. Unit tests in `details.test.ts` for a Ghoul Minion with 1 damage on it. Verify with `npm test`.
- [x] 2.2 `HoverCard`: the copy alone, clamped fully on screen (`placeHover` with no reserved panel), and the `DetailsColumn` beside the copy instead of the under-panel. Verify in the browser at 1600×900 with screenshots of hovering an engaged enemy in the strip and a right-edge strip card: both are fully visible.

## 3. Play strip

- [x] 3.1 Strip cards at 124×173 (exhausted 173 wide), shrinking to fit a crowded strip (min 84 wide). The fight/evade test target is outlined. Verify with a screenshot of 4 assets plus an engaged enemy at 1600×900, none overflowing.
- [x] 3.2 Option buttons above strip cards (`stripActionLabel`: Fight/Evade/Engage with icons, else the short engine label; en/ru), hidden while busy. A click on a single-option card still chooses it; no popup menu for strip cards. Verify in the browser that one click on "Fight" above an engaged Ghoul Minion starts the fight test, with a screenshot of the buttons.

## 4. Skill-test panel

- [x] 4.1 `optionHome` returns `"skilltest"` for options on `commit`-zone cards (test in `optionHome.test.ts`). `SkillTestPanel` shows the breakdown line with the skill icon and 86×120 committed cards with hover details and `rememberRect`; removable cards are highlighted, and a click takes them back. `originRect` handles `commit` (last rect, else the panel). Verify in the browser: commit a card, click it in the panel, see it fly back into the fan and the value drop (screenshots before and after).

- [x] 4.2 Chaos draw shows what is tested: the `token` event carries the tested card, skill, kind, value and difficulty (engine test). `TokenDraw` and the automatic `TokenPop` show the tested card (at least 180×252, hover details) and the "investigator · skill value vs difficulty" line above the bag, with en/ru strings. Verify with a screenshot of drawing for Rotting Remains (or another willpower treachery) and of a fight against a Ghoul Minion.
- [x] 4.3 The draw waits for the screen to settle: `EventPlayer` holds a `token` event until no card flight or map arrival is running for 400 ms, capped at 4 s; the automatic reveal and the phase title use the same gate. Verify in the browser that after an encounter treachery or a draw, the bag appears only once the cards have landed (screenshots just before and after), and that a forced long animation still lets the draw start within 4 s.

## 5. Notifications

- [x] 5.1 `FeedEntry.kind`. `ActionFloats` uses a length-based life (3.5–6 s), a 900 ms stagger, 2 visible at most, a burst that keeps the last 2, and skips phase entries; the CSS fade follows each float's life. Unit test the life formula. Verify in the browser that a resource action float is still visible at 3 s.
- [x] 5.2 `PhaseTitle`: queued chapter titles for new `phase` log entries (none on load). Each shows "<Phase> Phase" with "Round N" in display type over a dark band, about 2.6 s, one after another, and waits while a token, test-result or encounter event plays. It never takes the pointer and is static under reduced motion; en/ru strings. Verify with a screenshot mid-title at the start of round 2 and in Russian.

## 6. Verification

- [x] 6.1 Play through a fight with `.playwright-mcp/drive.js` (solo Roland, two rounds at 1600×900) with no console errors. Add screenshots `strip-fight-buttons`, `strip-hover-enemy`, `skilltest-commit` and `phase-title`.
- [x] 6.2 `npm test`, `npm run lint`, `npm run build` and `npm run check:content` all pass; README play notes mention the strip buttons, taking back committed cards and the phase titles.
