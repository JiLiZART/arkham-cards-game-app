## 1. Baseline

- [ ] 1.1 Record today's numbers: resolutions reached per scenario by `pnpm search:games` (Night of the Zealot's bot games: 6), and the 6 pinned Dunwich wins passing; keep them in the change notes for the comparison in 4.2.
- [ ] 1.2 Narrow `campaign-the-dunwich-legacy` task 11.3 to the six wins and the browser run, with a pointer to this change, and tick it.

## 2. Strategy read from card data (`src/engine/bot.ts`), test first

- [ ] 2.1 `objective()` returns needs beside goals: the key card an enemy's `onlyAttackableBy` names, the clues to hold for a goal location's `moveInClues`, and an enemy the act needs present at the spend location; unit tests on a constructed state for each.
- [ ] 2.2 Key card: the bot plays it, draws or searches toward it, takes it when an act hands it out, fights the guarded enemy only with it, and evades that enemy otherwise; test: a Brood at the bot's location with Esoteric Formula in hand (the spec's scenario).
- [ ] 2.3 Clues to hold: no clue spend below the hold while a `moveInClues` goal is ahead; investigation ranked toward locations with clues; test: Sentinel Peak in play, 4 clues held, an act spend available, the bot moves instead (the spec's scenario).
- [ ] 2.4 Presence: at the spend location the bot waits for the named enemy (or draws it toward itself) before spending; test with Seth Bishop.

## 3. Winning seeds

- [ ] 3.1 Search seeds (up to 1000) for Undimensioned and Unseen on Standard, empty log, over the core starter teams; pin the first win with its team in `dunwichPlaythrough.test.ts`.
- [ ] 3.2 The same for Where Doom Awaits.
- [ ] 3.3 Return to The Essex County Express and Return to Lost in Time and Space: find what stops the bot (play a few seeds and read where it stalls: the Conductor, the Engine Car's Engineer, Realms Beyond's leave test, the act 3 choice), add what the card data allows in 2.x's style, then search seeds and pin a win each in `returnToDunwichPlaythrough.test.ts`; then Return to Undimensioned and Unseen and Return to Where Doom Awaits with the 2.x strategy.
- [ ] 3.4 If any is still unwon: a scenario hint in its scenario file only where the data is silent (named in a task note, with a test; an ADR if a schema field is added), then search again; if still unwon, report what blocks it and close the task with that note.

## 4. Verification

- [ ] 4.1 The 6 earlier pinned Dunwich wins and the 4 pinned Return wins still pass; the 16 scenarios still play to an end on seeds 1–2 with 0 refused choices.
- [ ] 4.2 `pnpm search:games` and `pnpm record:games` if the bot's choices changed; resolutions per scenario compared with 1.1, Night of the Zealot at least 6.
- [ ] 4.3 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:content`; `openspec validate bot-wins-dunwich --type change --strict`.
