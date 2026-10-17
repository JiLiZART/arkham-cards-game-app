## 1. Engine: empty uses

- [x] 1.1 Engine tests first (`src/engine/engine.test.ts` or a new `uses.test.ts`): Flashlight with 1 supply investigates → the test resolves with −2 shroud and Flashlight ends in the discard pile; .45 Automatic with 2 ammo fights → stays with 1; a synthetic asset with uses and a constant ability → stays at 0; undo of the emptying action restores Flashlight with 1 supply. They fail on current code.
- [x] 1.2 Add the `DiscardIfEmpty` step and handler in `src/engine/rules/cards.ts`, pushed after an ability's effects when its cost spent uses; it discards when `uses <= 0` and (`discardWhenEmpty` or every non-constant ability spends uses and there is no constant ability). Remove the immediate discard from `payCost`. Feed line for the discard. Tests green; full suite green.

## 2. Players and the instruction bar

- [ ] 2.1 `src/ui/players.test.ts`: `canAct` is null for a commit window of the decider's own test when they are not active; non-null for a commit to another's test and for a reaction; `landingView` follows. Fail first, then narrow `canAct` in `src/ui/players.ts`.
- [ ] 2.2 `InstructionBar` (`src/ui/hud/ActionRail.tsx`): when choices are not offered and `canAct` names someone, show the can-act label with one button that calls `setViewing(null)` (the avatar's tap). Strings reuse `players.canCommit` / `players.mayReact`; a button label in en and ru ("To Daisy Walker").
- [ ] 2.3 Browser: a new `.playwright-mcp/check-treachery-test.js` gives Daisy a Rotting Remains revelation while Roland is active (public hands, then private): the skill-test screen opens on Daisy's table with Done in the bar (after "Pass to Daisy" with private hands), no avatar pulses; then Roland's own test with Daisy able to help: the bar shows "Daisy Walker can commit cards" with the button, which lands on her table with Done. `check-players.js` still passes.

## 3. Stat bar, hand count, token art

- [ ] 3.1 Restore the five PNGs, `tokenStack.ts` and its test from `537e529^`; map `clue`, `resource`, `clue-3`, `resource-3`, `resource-5` to PNG in `src/ui/icons.ts` (labels too); `TokenPile` stacks again; `scripts/extract-assets.sh` map lines back; update `src/ui/icons.test.ts` and `check:content` expectations (write the failing expectation first). `npm run check:content` clean.
- [ ] 3.2 `HandCount` renders the player card back image (`backUrl("player")`, 40 px tall) and the number; a test (`Stats.test.tsx` or `glance`-style pure test of the markup) asserts no `gl-fb` text node appears when the sprite registry is empty.
- [ ] 3.3 Restore `StatBar` in `src/ui/hud/Stats.tsx` for `useShown()`, mount it in `Hud.tsx`, `STAT_BAR_W = 315` in `fan.ts`, `.stat-dock { zoom: 0.75 }`, hidden in the phone layout mode; portrait click opens the card modal. Verify in the browser at 1600×900 and 1280×720: the dock's width, the token stacks (9 resources → 5+3+1), the hand count, looking at Daisy switches the dock, the fan does not overlap the dock; the sheet unchanged. Screenshot.

## 4. Title

- [ ] 4.1 `Title.tsx`: `hasSave` read on every render; Continue only while a game, a campaign or a save exists. Extend `check-wizard.js`: after Begin, back to the title, Abandon campaign → no Continue, New campaign opens the wizard; a reload shows no Continue.

## 5. Verification and docs

- [ ] 5.1 `npm test`, `npm run lint`, `npm run build`, `npm run check:content` all clean; `drive-calm.js` to round 3 with 0 errors; `check-wizard.js`, `check-players.js`, `check-treachery-test.js` pass.
- [ ] 5.2 README play notes: the stat bar is back (smaller) with the token stacks and hand count, cardboard clue and resource tokens, the automatic discard of used-up assets (a deviation from the printed rules), the bar's button when a teammate can act. Run `openspec validate fix-table-regressions --type change --strict`.
