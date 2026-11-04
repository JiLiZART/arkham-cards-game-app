## 1. Schema and engine setup

- [ ] 1.1 Failing tests first (`src/engine/__tests__/`, through `src/engine/kits/driver.ts`): a `setAside` of 04102 with four copies in the sets leaves none in the encounter deck; with `count: 1` one copy; a `remove` of a code takes every copy out; a scenario with `acts: []` and agendas sets up and ends when its last agenda advances.
- [ ] 1.2 `src/content/schema.ts`: `setAside.count`, `ScenarioDef.setupCards` (default `[]`), `CardDef.vengeance`, `blood` in `CHAOS_TOKENS` and `SYMBOL_TOKENS` with `ScenarioDef.tokens` keyed by `SYMBOL_TOKENS`, `CampaignDef.options` (`{ id, labelKey, replaceSets, addSets }`), `CampaignFlow.before` (default `{}`); `applySetupStep` in `src/engine/index.ts` moves every copy (or `count`); tests from 1.1 green.
- [ ] 1.3 Test: a `blood` token drawn in a scenario whose table has no `blood` entry resolves as 0 with no effect; the icon from `boxes.md` wired in the chaos-bag UI (`src/ui/components/Icon`) if not already.

## 2. Campaign options

- [ ] 2.1 Failing test: a campaign declaring `{ replaceSets: { ancient_evils: "resurgent_evils" }, addSets: ["return_to_the_rainforest"] }` created with the option on gathers Resurgent Evils and Return to the Rainforest and no Ancient Evils; off, the base sets only; a scenario already listing `resurgent_evils` gathers it once.
- [ ] 2.2 `CampaignState.options` (`src/engine/campaign/types.ts`), set by `createCampaign` and kept in the save (`src/engine/campaign/campaign.ts`); `createGame` gathers `encounterSets` and `sideDecks` through the options' map; `src/content/flowChecks.ts` or the loader verifies every set an option names exists.
- [ ] 2.3 New-campaign menu: one toggle per declared option, off by default (`t(db, locale, option.labelKey)`); the campaign screen shows the chosen options read-only; a UI test that the toggle reaches `createCampaign`; no option declared, no toggle.

## 3. `compose()` and `setupCards`

- [ ] 3.1 Failing test: `compose(base, extra)` runs `setup` base-then-extra, asks `checkObjectives`/`ended`/`spawnRedirect` of extra first with base as fallback, runs other hooks in order, and yields a hook list that is a superset of the base's; implement in `src/engine/api.ts` over `ScriptHooks` (`src/engine/world/scripts.ts`).
- [ ] 3.2 `src/content/implemented.ts`: a `scenario` card listed in some scenario's `setupCards` with no symbol token line on either face works; `scenarioCards` in `src/content/coverage.ts` includes `setupCards` and subtracts the codes of `remove` steps; tests: Return to The Gathering (01104 + 50011) reports tokens real and 50011 working once 01104's table is real; Echoes of the Past's used cards exclude the 13 removed Midnight Masks cards.

## 4. The importer

- [ ] 4.1 `logKey()` in `scripts/campaignGuide.ts` (camelCase) with `ALIASES` per campaign; grep `content/packs/*/scripts` and `content/campaigns/*/` to confirm no script reads a generated key; diff Night of the Zealot's keys against the camelCased `rtnotz` keys to fill the aliases (`cultists_escaped` → `cultistsGotAway` at least); tests in `scripts/campaignGuide.test.ts`.
- [ ] 4.2 `scripts/import-campaigns.ts`: `bagsOf` over the campaign's steps then the scenario's, core bags last; partial sets from the gathering step's subtext into a `remove` step; the skip condition requires locations and at least one of acts or agendas; the start fallback searches every gathered set; `b` faces dropped; `setupCards` from the own set; tests per rule in `scripts/import-campaigns.test.ts` (new) with small `Raw` fixtures.
- [ ] 4.3 `scripts/campaignFlow.ts`: `before[<scenario>]` compiled from each playable scenario's `setup` ids through `expand`; `logKey` applied to every `campaign_log*` id and section; tests in `scripts/campaignFlow.test.ts`: Essex's difficulty branch yields `addChaosToken` under `before["the-essex-county-express"]`, Undimensioned's choice records `calmedTownsfolk`/`warnedTownsfolk`, a scenario with only gathering and layout has no entry.
- [ ] 4.4 `scripts/import-cards.ts`: `opt("vengeance", c.vengeance)`; test in `scripts/import-cards.test.ts` that 04062 maps to `vengeance: 5`; `pnpm import:cards` for tfa, tbb, hote, tdoy and return packs.
- [ ] 4.5 Engine: run `before[id]` when the order reaches a scenario, before `createGame` (`src/engine/campaign/flow.ts`); `checkFlow` visits `before` and errors on a key that is not a scenario; tests: a Hard Dunwich campaign has −4 in the bag when Essex sets up; a scenario without `before` sets up with no step shown.
- [ ] 4.6 `pnpm import:campaigns`, `pnpm import:i18n --locale ru`; assert on the output: `sepulchre-of-the-sleeper.json` and `return-to-the-depths-of-yoth.json` exist, `side-red-tide-rising/campaign.json` carries its own bags, Echoes of the Past has its `remove` step, 72008b is in no scenario's setup, Children of Blood's flow has `addChaosToken` with `blood`, no generated scenario gathers an `epic_multiplayer` set; one test over all generated scenarios still sets up and plays three rounds.

## 5. Verification

- [ ] 5.1 `pnpm coverage`; the counts of the campaigns that gathered `arkham` go down (ptc, tic, fhv, tfa, rtptc, rttfa, rttic, rtnotz, tdc, tskc, the five side scenarios) and `docs/campaign-program.md` rows are updated by `campaign-flow-compiler-fixes`' rewrite.
- [ ] 5.2 `pnpm check:content`, `pnpm test`, `pnpm typecheck`, `pnpm lint:fix`, `pnpm format:fix`; `openspec validate scenario-import-fixes --type change --strict`.
