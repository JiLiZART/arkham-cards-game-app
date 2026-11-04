## Why

`scripts/import-campaigns.ts` writes every generated scenario, and the inspection of the campaigns (reports `ptc.md`, `tic.md`, `tfa.md`, `tdc.md`, `fhv.md`, `sides.md`, `dwl.md`, `notz-return.md`, `boxes.md`) found the same importer mistakes in cycle after cycle: the whole Midnight Masks set gathered where the guide takes its 5 treacheries (six campaigns, 13 core cards counted as "working" in each scenario), every side scenario playing with Night of the Zealot's chaos bag, two scenarios skipped outright (Sepulchre of the Sleeper has no act deck; Return to The Depths of Yoth starts at a random location), one copy set aside where the card has four, the `vengeance` field dropped from 20 cards, Children of Blood's `blood` token unknown so every bag change compiles to text, both faces of a double-sided location placed as two locations, Return-to log keys in snake_case where the hand-written base uses camelCase, and each scenario's own setup steps (Essex's difficulty tokens, Undimensioned's calm-or-warn choice) left out of the flow. Each campaign change would otherwise fix these by hand, nine times over. The four Return-to changes also share three pieces (a setup card beside the reference card, a script composed from the base's, the replacement sets as an option on the base campaign) that must land once so any Return-to campaign can land first.

## What Changes

- **Partial encounter sets.** An `encounter_sets` step whose note says to gather only the treacheries of a set (The Midnight Masks in Echoes of the Past, A Phantom of Truth, The Vanishing of Elina Harper, Red Tide Rising, The Longest Night, Threads of Fate, their Return-to versions, and the side scenarios that gather `arkham`) gathers the set and lists its other cards in a `remove` setup step. Coverage no longer counts a removed card as used by the scenario.
- **Side scenario chaos bags** come from the scenario's own `choose_difficulty` step; the core bags are a fallback only when neither the campaign nor the scenario names one.
- **No scenario is skipped for its deck or its start.** A scenario with agendas and no acts (Sepulchre of the Sleeper, 11673) is written with an empty act deck; a scenario whose setup names no location (Return to The Depths of Yoth, 04277, "draw one of those locations at random") starts at the first location of its gathered sets and is listed in the import's notes.
- **`setAside` moves every copy** of a listed code (Poisoned ×4 in The Forgotten Age, Hunting Nightgaunts ×2 in Innsmouth); a `count` limits it.
- **`vengeance`** is a card field, imported from the snapshot for the 20 cards that carry it (04062, 04066, 04068, 04078, 04079, 04093, 04186, 04187, 04220, 04227, 04287, 04288, 04297, 53018, 53023, 53026, 53027, 53047, 53074, 53078).
- **`blood` is a chaos token** in the schema and the symbol set, so Children of Blood's bags and its flow's add/remove effects compile; a scenario's token table may give it an effect; drawn without one it is a 0.
- **A back face is never a second card.** A code ending in `b` whose front is in the same pool (72008/72008b Central Lot, 87005/87005b, 04206/04206b Mouth of K'n-yan) is placed only through its front.
- **Campaign log keys are camelCase** in every generated campaign (`house_standing` → `houseStanding`), with a per-campaign alias table where the hand-written base chose another word (Return to the Night of the Zealot's `cultists_escaped` → `cultistsGotAway`), so a Return-to campaign reads its base's log.
- **A scenario's setup steps join the flow.** The guide's per-scenario `setup` steps that are not the scenario's own setup (chaos tokens added by difficulty, an intro choice recording an entry, a counter) are compiled into `flow.before[<scenario>]`, run by the engine when the order reaches the scenario and before it is set up. Dunwich's Essex County Express adds its difficulty token; Undimensioned and Unseen records `calmedTownsfolk` or `warnedTownsfolk`.
- **The Return-to pieces, moved here from `campaign-return-to-the-dunwich-legacy`:** `ScenarioDef.setupCards` (the box's setup card beside the base reference card; filled by the importer from the Return-to set; real with no token lines; counted by coverage), `compose()` in `src/engine/api.ts` for a Return script built over its base's hooks, and `CampaignDef.options` (`{ id, labelKey, replaceSets, addSets }`), chosen when a campaign is created, fixed after, shown as toggles on the new-campaign menu, applied when a scenario gathers its sets. `addSets` is new, for Return to the Rainforest, which the Forgotten Age box adds rather than replaces.
- The four Return-to campaign changes keep only their own option data (the replace and add pairs) and content.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-content`: Campaigns imported from the campaign guides (partial sets, side bags, agenda-only and random-start scenarios, back faces, setup cards, camelCase log keys); the `vengeance` field and the `blood` token.
- `campaign-play`: Data-defined scenario setup (every copy set aside, removed cards, setup cards, the options' set swaps); campaign options chosen at creation.
- `campaign-flow`: a scenario's setup steps run before it, from `flow.before`.
- `content-coverage`: removed cards not counted; a setup card without token lines real.
- `game-engine`: a scenario script composed over another's hooks.

## Impact

- `scripts/import-campaigns.ts`, `scripts/campaignGuide.ts` (`logKey`, `bagsOf` per scenario, partial sets, back faces, `setupCards`), `scripts/campaignFlow.ts` (`before`), `scripts/import-cards.ts` (`vengeance`); their tests.
- `src/content/schema.ts` (`CHAOS_TOKENS`, `SYMBOL_TOKENS`, `CardDef.vengeance`, `SetupStep.setAside.count`, `ScenarioDef.setupCards`, `CampaignDef.options`, `CampaignFlow.before`), `src/content/implemented.ts`, `src/content/coverage.ts`, `src/content/flowChecks.ts`.
- `src/engine/index.ts` (`setAside`, the options' swaps when sets are gathered), `src/engine/campaign/` (options in the state and the save, `before` steps), `src/engine/api.ts` (`compose`).
- `src/ui/menu/` new-campaign screen (option toggles), `content/i18n/{en,ru}/ui.json`.
- Regenerated: `content/campaigns-generated/`, `content/i18n/*/campaign-texts/`, `content/packs/tfa/*/cards.generated.json`, `content/packs/return/cards.generated.json`, `content/coverage.json`.
- Depends on nothing in the program; `campaign-flow-compiler-fixes` and every campaign change build on it.

## Decided (assumed)

- Partial sets are expressed as a `remove` step, not a new set shape: the engine's `remove` exists, and coverage needs one rule ("a removed card is not used") that also fixes the over-count the side scenarios' removals cause (`tfa.md` §6).
- camelCase keys for every generated campaign, not only the Return-to ones: one convention for hand-written and generated flows, and no scenario script of a generated campaign reads a key yet. The Russian campaign texts are regenerated by `import:i18n`.
- `flow.before` steps are flow steps (the same language, the same interpreter), not scenario setup steps: they ask the players questions and write the log, which the scenario setup can't do.
- A scenario with no start location is written, not skipped: a wrong start is a note the campaign change fixes; a missing file blocks the campaign.
- `setupCards` is filled by the importer for a Return-to scenario (every `scenario`-type card of the Return-to set that is not the base card), so the hand-written files start from it.

## Open questions

- None. A Return-to campaign doesn't offer the replacement-sets option: it always uses its box's sets (user decision).
