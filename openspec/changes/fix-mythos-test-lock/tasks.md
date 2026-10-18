## 1. The caption yields to the test's Done

- [x] 1.1 `feed.test.ts` first: `captionStageBusy(["test:1"])` is false, `captionStageBusy(["showcase"])` and `["event:4", "test:1"]` are true; and a store-level test (`feed.test.ts` or `players.test.ts`) that in the mythos phase, with Crypt Chill drawn and Guts in hand, `captionIndex(..., captionStageBusy(["test:1"]), "commit")` is null. Fails on current code. Then add `captionStageBusy` to `src/ui/feed.ts` and use it in `useCaption` (`StepCaption.tsx`).
- [x] 1.2 Browser: new `.playwright-mcp/check-mythos-test.js` (the reported flow through the store: two players, private hands, tokens by hand, Crypt Chill on top, a Ghoul engaged with Roland, Guts in hand; end turns into the mythos phase): after tapping the card the bar shows the commit instruction with Done; Done closes the window and the chaos draw's circles appear; the test finishes and the phase goes on to Daisy's draw. `check-treachery-test.js` and `drive-calm.js` still pass.

## 2. The line and the strip

- [x] 2.1 `.st-middle` centred on the screen (`left: 50%`, fixed width, `translate: -50% 0`); in `check-mythos-test.js` measure the line's and the strip's centres at 1600×900 and 1280×720 (within 2 px of each other and of the centre). Screenshot.

## 3. The game report

- [ ] 3.1 `store.test.ts` first: `exportReport()` JSON holds version, app, setup, actions, campaign, settings, view and pending; `importReport` of it (on a fresh store) gives the same game state, settings and pending. Then `exportReport`/`importReport` in `src/ui/store.ts`; `VITE_APP_VERSION` via `define` in `vite.config.ts` from `package.json`.
- [ ] 3.2 DebugPanel (`src/ui/hud/Hud.tsx`): **Copy report** (clipboard, fallback to the selected text box) and **Paste report…** (textarea + Load, errors in the panel), strings in en and ru. Browser (in `check-mythos-test.js`): Copy report in the stuck state (clipboard permission granted), reload, Paste report… → the same round, phase, pending and hands.

## 4. Verification and docs

- [ ] 4.1 `npm test`, `npm run lint`, `npm run build`, `npm run check:content` clean; `drive-calm.js` to round 3 with 0 errors.
- [ ] 4.2 README: the Debug panel's Copy report / Paste report in the Debugging section. Run `openspec validate fix-mythos-test-lock --type change --strict`.
