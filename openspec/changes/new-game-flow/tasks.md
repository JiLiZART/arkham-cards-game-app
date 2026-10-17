## 1. Wizard state

- [ ] 1.1 Add `src/ui/menu/wizard.ts` (state and reducers: campaign, investigators in tap order capped at four with toggle-off, deck per investigator, difficulty, step with `canContinue`, `next`, `back` keeping picks) with `wizard.test.ts`: tap order becomes P1..P4, a fifth tap is ignored, toggling off reorders, back keeps picks, the ready step's `toSetup()` matches what `newCampaign` takes today.
- [ ] 1.2 Add `averageModifier(tokens)` to `src/ui/chaos.ts` with tests (numeric tokens only; the four Night of the Zealot bags give −0.4, −1.0, −1.6, −2.9 or the exact values the data yields).

## 2. Screens

- [ ] 2.1 Title screen and settings screen (`src/ui/menu/Title.tsx`, `Settings.tsx`), `screen` values `title`, `wizard`, `settings`; move language, privacy, draw by hand, pace, tips, reset tips, music and effects to Settings; How to play and the campaign log reached from the title; `App.tsx` routes them. Verify in the browser: cold load shows the title; Continue appears with a save; the gear opens settings and Back returns.
- [ ] 2.2 Wizard steps: Campaign (art card), Investigators (avatar tiles with P1–P4 badges), Decks (deck cards per investigator; custom decks through `customDecks()` returning `[]` for now), Difficulty (`BagCard` ×4 with grouped tokens and the average line), Ready (avatars in order, bag, first scenario with its icon, Begin). Strings in en and ru. Verify in the browser with a new `check-wizard.js`: tap Daisy then Roland, pick expert, Begin; the game starts with Daisy as lead and the expert bag; Back from Decks keeps both picks; at 390 px tall every control is ≥ 44 px and nothing overflows.
- [ ] 2.3 Campaign log screen in the wizard's style with avatars; keep its content (log, XP, trauma, next scenario). Verify in the browser after a scenario ends.

## 3. Verification and docs

- [ ] 3.1 Update `check-sound-controls.js` and `check-tips.js` for the settings screen; run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with 0 errors.
- [ ] 3.2 README play notes: the title screen, the wizard, difficulty as a bag, settings. Run `openspec validate new-game-flow --type change --strict`.
