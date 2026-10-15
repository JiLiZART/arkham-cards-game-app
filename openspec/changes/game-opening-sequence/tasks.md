## 1. Engine

- [ ] 1.1 `mulliganHandler`: an un-pick option per picked card (`un:<id>`, `{ unpick }`) that removes it from `chosen` and asks again; the bot never picks it; `optionHome` returns `"mulligan"` for these options. Engine tests: pick two, take one back, confirm → only the other is redrawn; the taken-back card is offered again; replay stays identical. Verify with `npm test` (including the option-home bot playthroughs).

## 2. Mulligan on the table

- [ ] 2.1 `MulliganRow` and `HandFan` changes: picked cards leave the fan and fly to a labelled "to redraw" row; a click flies a card back; on confirm the picked cards fly face down to the deck pile and the replacements fly in. Hover details, privacy and reduced motion as in the spec; en/ru strings. Verify in the browser at 1600×900 with screenshots of a pick mid-flight, the row with two cards, a take-back, and the confirm flight.

## 3. Scenario introduction

- [ ] 3.1 Intro director (`view.ts` slice, start on the live setup → play transition only), `IntroOverlay` (agenda with scenario name and intro text, then act; Continue, Space/Enter, Skip), the fly to the panel slot, input blocked meanwhile, `HandOff` waiting. The panel and the locations stay hidden during setup and the intro. Verify with screenshots of the agenda intro, the act mid-flight to the panel, and that reloading in round 1 shows no intro (Playwright).

## 4. Locations

- [ ] 4.1 Dealing: at the intro's `deal` step, locations are dealt face down from the act/agenda panel, starting location first, 250 ms apart; revealed ones flip after landing; portraits appear after their location flips. Later placements (act advance) use the same face-down landing. Verify with screenshots of the Study mid-deal and mid-flip, and the act-1 advance dealing four locations.
- [ ] 4.2 The 3D flip in `CardMesh` (a 600 ms lift-and-turn tween on any side change after landing, waiting for the moving portrait; instant under reduced motion). Verify with screenshots mid-flip when Roland moves into the unrevealed Cellar.

## 5. Act and agenda viewer

- [ ] 5.1 Reference card in the panel and `DeckViewer`: every act/agenda in order, the current one marked, both sides for reached ones, front plus a "not yet revealed" placeholder for upcoming ones; the reference card with both sides and the bag's tokens; options on the current card; hover details; en/ru strings. Verify with screenshots of the act viewer in round 1 and the reference viewer, and that advancing the act from the viewer works.

## 6. Verification

- [ ] 6.1 Play through The Gathering's opening with `.playwright-mcp/drive.js` (mulligan with a take-back, the intro, the deal, a move into an unrevealed location) and a 2-player game with privacy, with no console errors. Then run `npm test`, `npm run lint`, `npm run build` and `npm run check:content`, and add README play notes.
