## 1. Import

- [x] 1.1 `scripts/campaignGuide.ts` with tests (`campaignGuide.test.ts`): chaos bag mapping, layout and connections, names to codes, token modifiers from the reference card, resolution effects, acts and agendas by stage, campaign selection.
- [x] 1.2 `scripts/import-campaigns.ts` (`npm run import:campaigns`): writes the generated campaigns and scenarios, never a hand-written campaign, prints what it skipped and approximated. `CampaignDef.packs` and `CampaignDef.generated` in the schema.
- [x] 1.3 Run it; run `import:i18n -- --locale ru`; `check:content` passes with every campaign validated.

## 2. Engine and loading

- [x] 2.1 Final act/agenda ending in `nextAct`/`nextAgenda`, tests in `scenarios.test.ts`; `ENGINE_VERSION` bump.
- [x] 2.2 Packs loaded before a campaign starts or restores (`store.ts`), browser validation skips campaigns whose packs are not loaded; tests.
- [x] 2.3 Every generated scenario sets up and the bot plays it for three rounds without an error (one test over all scenarios).

## 3. Screens

- [x] 3.1 New-game screen: every campaign, Night of the Zealot first, the partly-implemented note in English and Russian, Start disabled while packs load.
- [x] 3.2 Keyword glossary: `keywordsOf` with tests, `kw.*` strings in English and Russian after the rules references, rendered in the details column and the modal.

## 4. Verification and docs

- [x] 4.1 `npm test`, `npm run lint`, `npm run build`, `npm run check:content` clean; `drive-calm.js` to round 3 with 0 errors; in the browser, start The Dunwich Legacy in Russian, play the first turns, reload and see it restored.
- [x] 4.2 README: the campaign import, what generated means, the glossary. Run `openspec validate all-campaigns --type change --strict`.

Results: 36 generated campaigns, 149 scenarios, every one sets up and plays three random rounds (`generated.test.ts`); the Russian Dunwich run through the new-game screen loaded only that campaign's files, played into round 2 and was restored the same after a reload, 0 console errors; `drive-calm.js` to round 3, 0 errors. Main chunk 1,874 KB (493 KB gzipped), was 1,742 KB (464 KB).
