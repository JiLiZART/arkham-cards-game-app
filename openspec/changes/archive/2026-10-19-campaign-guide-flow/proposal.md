## Why

Campaigns are the heart of the game, and today only their scenarios play: the campaign guides' own rules, what happens *between* scenarios, are flattened away by the import. Of the 22 official campaigns in ArkhamCards' guides, the import keeps a fixed scenario order and a handful of resolution effects; it drops 107 interludes and epilogues, 770 branches under resolutions, 326 end-of-scenario choices, 578 counters (clues, doubt, conviction, supplies), 86 investigator choices, 33 side scenarios with an experience cost, and every `next_scenario` / `skip_scenario` turn. A choice in a setup takes its first option. So Dunwich never asks who Armitage's fate falls on, Carcosa never counts doubt and conviction, and no campaign reaches its own branching endings. The hand-written Night of the Zealot has the same shape (a fixed list), so it can't serve as the pattern for the rest.

The campaign picker, meanwhile, is a tall column of tiles with no way to find a campaign and nothing to read about one beyond its epigraph; the player can't see a campaign's chapters before starting, the way the act and agenda viewer shows a scenario's chapters in play.

## What Changes

- **The campaign flow becomes data the engine runs.** A typed step language (`story`, `branch`, `input`, `effects`, `playScenario`, `upgradeDecks`, `end`) for what a campaign does between scenarios, with conditions on the campaign log and campaign data and effects on the log, the chaos bag, decks, trauma, experience and the next scenario. The campaign state carries a cursor into the flow; a new engine module advances it with the player's answers, deterministically and persisted.
- **Campaign log sections.** The log grows from flat keys into sections of entries (recorded, crossed out), counts, investigator counts and card lists, with labels in both languages, so branches can read them and the log screen can show them as the guide prints them.
- **Every official campaign's flow is compiled from the guides** at import: campaign setup steps (prologue choices such as Dunwich's weakness draw or Carcosa's lead investigator), the interludes and epilogues in their places, each resolution's steps with their branches and choices, side scenarios and their experience cost, and the `next_scenario` / `skip_scenario` / `result` data. Night of the Zealot's flow is written by hand in the same language, so one interpreter serves both. Input kinds the game can't offer (linked-campaign messages, partners, supplies, tarot, text boxes) are shown as the guide's text with the guide's default taken, and listed by the import.
- **Interludes, choices and resolutions are played on the campaign screen** between scenarios: the guide's story text, bullets and prompts, choices as buttons, counters, investigator choices as avatars, then deck upgrades, then "Next: <scenario>", which may now be a side scenario or a scenario chosen by the flow.
- **The campaign picker is rebuilt**: filters on top (kind: campaigns / Return to / side scenarios; rules: complete / partial; length; search by name), a grid of tiles showing each campaign's first scenario card as its preview, and a sidebar that opens on a click with the campaign's scenario reference cards in order, front and back, like the act and agenda viewer, with the name, the count, the prologue and the partly-implemented note.
- **BREAKING** for saves: the campaign save gains a flow cursor and the sectioned log; an older save is migrated on load (its flat log becomes the notes section, its scenario index becomes a cursor at the matching `playScenario` step).

## Capabilities

### New Capabilities
- `campaign-flow`: the campaign guide's flow as data run by the engine: the step language, conditions and effects, the sectioned campaign log, the cursor and persistence, the next scenario from the flow (interludes, branches, side scenarios, endings), and the import that compiles it from the guides for every official campaign.

### Modified Capabilities
- `campaign-play`: Resolutions (their steps run through the flow, with branches and choices, on the campaign screen); Campaign tiles (becomes the campaign picker: filters, the preview tile, the sidebar of scenario cards); Every official campaign can be played (scenario order and interludes follow the guide's flow; the partly-implemented note says what is and isn't played).
- `card-content`: Campaigns imported from the campaign guides (the import also writes each campaign's flow and the scenario card list, and reports the inputs it can't offer).

## Impact

- Content schema (`src/content/schema.ts`): `CampaignStep`, `CampaignCondition`, `CampaignEffect` grows, `CampaignLog` sections, `CampaignDef.cards`; `content/campaigns-generated/<id>/flow.json` (lazy, with the scenarios) and `content/campaigns/night-of-the-zealot/flow.json`.
- Engine: new `src/engine/flow.ts` (the interpreter), `src/engine/campaign.ts` (cursor instead of `scenarioIndex`, sectioned log, `applyScenarioEnd` hands the resolution to the flow), save migration in `src/ui/store.ts`.
- Import: `scripts/campaignGuide.ts` and `scripts/import-campaigns.ts` compile the flow; `scripts/import-i18n.ts` carries the Russian step texts; `check:content` verifies every flow (every step reachable, every `playScenario` names a scenario, every condition's section exists).
- UI: `src/ui/menu/CampaignLog.tsx` becomes the campaign screen with a guide reader; `src/ui/menu/NewGame.tsx` campaign step rebuilt with filters and a sidebar (`src/ui/menu/CampaignSheet.tsx`), reusing the deck viewer's card list styles; new `ui.json` strings in both languages.
- Sources: ArkhamCards' guides (`inspired/ArkhamCards/assets/generated/all_campaigns*.txt`, English and Russian) stay the machine-readable source; the Russian print-and-play PDFs in `inspired/Arkham_Horror_LCG/` (campaign guides and cards per pack) and the Hall of Arkham card database (a WordPress page, no API: manual lookups) are used to verify the compiled flow and to find card codes the snapshot names differently.
- Tests: engine tests on Dunwich (Armitage's Fate, the Survivors), Carcosa (doubt and conviction), The Forgotten Age (a side scenario's cost), and the import's census test (every official campaign compiles; the unsupported inputs are exactly the listed ones).
