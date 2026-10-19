## 0. Before

- [x] 0.1 Archive `campaign-guide-flow` (complete; it modifies the same two `campaign-play` requirements, and this change's deltas are written against its version of them).

## 1. Coverage

- [x] 1.1 `src/content/coverage.ts`: `packCoverage(db)` (per pack: encounter cards, player cards, how many of each work by `implemented()`, the rest by type) and `campaignCoverage(db, id)` (the cards its scenarios use: encounter sets, side decks, acts, agendas; how many work; the rest by type; the scenarios with and without a scenario script; `complete`), and `investigatorCoverage(db)` (their card and signature cards work); move `implemented()` to `src/content/` so content and UI share it; tests on fixtures and on Night of the Zealot's real numbers.
- [x] 1.2 Schema `ContentCoverage`; `scripts/coverage.ts` (`npm run coverage`) loads all content from disk and writes `content/coverage.json`, sorted, identical on rerun; the loader reads it eagerly; a test that a rerun is identical.
- [x] 1.3 `check:content` computes the report and fails when the committed file differs ("content/coverage.json is behind the content (npm run coverage)"); and checks every campaign's `cards` against its scenarios' reference cards, first agendas and first acts.

## 2. One campaign shape

- [ ] 2.1 Night of the Zealot's `campaign.json`: `packs`, `card`, `cards` (three chapters with reference card, agenda, act); `CampaignSheet` reads `cards` only (the run-time fallback removed); the import's output unchanged.

## 3. The label from coverage

- [ ] 3.1 `wizard.ts`: `filterCampaigns`'s rules filter and a `campaignComplete(db, id)` from coverage; the investigator picker's `partlyImplemented` from `investigatorCoverage`; tests (Night of the Zealot's mark follows its numbers, Dunwich is partial, a fixture campaign with full coverage is complete although generated).
- [ ] 3.2 `NewGame.tsx` tile badge and `CampaignSheet.tsx` note from coverage, with "n of m cards work" and the scenarios without a script; strings in English and Russian.

## 4. The program

- [ ] 4.1 `docs/campaign-program.md`, generated once from the coverage report and kept by hand after: every pack with encounter or player cards that don't work, in play order (Return to Night of the Zealot; each cycle's deluxe, mythos packs and Return-to box; the campaign boxes with their investigator boxes; the side scenarios; the investigator starter decks and promos), each with its campaign, its counts and a checkbox; the steps each pack's change takes (engine features its cards need; encounter and player cards; scenario script; real token effects; connections checked against the guide in `inspired/`; a bot playthrough to a resolution; for a campaign's last pack the move to `content/campaigns/`); the cycles whose mechanics need a change of their own first (Forgotten Age supplies and vengeance, Circle Undone tarot and hidden cards, Dream-Eaters linked campaigns, Innsmouth keys and flooding, Edge of the Earth partners and frost, Scarlet Keys keys and concealed, Hemlock Vale days and relationships); a test that every pack with work left appears in it.
- [ ] 4.2 README: the coverage command, the file, the check, what "complete" means, a link to the program.

## 5. Verification

- [ ] 5.1 Browser: the picker's Complete filter shows the campaigns coverage reports complete, Dunwich's sidebar says how far it is, the investigator marks follow coverage, in English and Russian; 0 console errors.
- [ ] 5.2 `npm test`, lint, typecheck, build, `check:content` by exit code; `openspec validate campaign-coverage --type change --strict`.
