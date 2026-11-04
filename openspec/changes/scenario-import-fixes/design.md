## Context

`scripts/import-campaigns.ts` turns each guide scenario into `ScenarioDef` (`scenarioOf`): it walks the setup taking every branch's first option (`setupSteps`), gathers every `encounter_sets` step whole, reads locations from the layout or by name (`codesByName`, which gives both faces of a double-sided card since both carry the name), skips a scenario when `!inPlay.length || !acts.length || !agendas.length`, takes the campaign's bags (`bagsOf(campaign)`, falling back to `CORE_BAGS` for every side scenario, whose bags sit in the scenario's `choose_difficulty` step), and writes `setAside` steps the engine resolves one copy at a time (`applySetupStep` in `src/engine/index.ts`, `find`). `scripts/import-cards.ts` maps `victory` but not `vengeance`; `CHAOS_TOKENS` in `src/content/schema.ts` has no `blood`, so `tokenName` drops it and `compileFlow` counts the effects as unsupported. Log keys are the guide's ids as they are (`campaign_log` `e.id`), snake_case; Night of the Zealot's hand-written files use camelCase. The guide's per-scenario `setup` list (branches, inputs, effects before `$play_scenario`) is read only for sets, layout and text; `compileFlow` compiles the campaign setup, interludes and resolutions, never a scenario's own steps. Coverage (`src/content/coverage.ts`) counts every card of every gathered set; `referenceCardWorks` (`src/content/implemented.ts`) requires a scenario to play with the card as its `card`, so a Return-to setup card can never work.

The four Return-to changes each assumed three shared pieces defined in `campaign-return-to-the-dunwich-legacy`: `ScenarioDef.setupCards`, `compose()` for scripts (hooks are typed in `src/engine/world/scripts.ts`, scripts receive `(game, run)` per ADR-0027/0028/0034), and `CampaignDef.options` with `replaceSets`. They move here, with `addSets` for Return to the Rainforest.

## Goals / Non-Goals

**Goals:** the importer writes every official scenario with the right sets, bags, decks, copies and faces; the data it writes is what the campaign changes start from; the shared Return-to pieces exist once; coverage counts what a scenario really uses.

**Non-Goals:** the flow compiler's own defects (`campaign-flow-compiler-fixes`); the random setup ops, flips and the void (`engine-scenario-structure`); the engine rules for vengeance, blood sealing, keys (the cycle changes); hand-fixing any scenario's start, connections or set list (its campaign change); Epic Multiplayer variants (dropped).

## Diagram (C4-inspired, component level, ASCII)

```
 inspired/ArkhamCards/.../all_campaigns.txt        inspired/arkhamdb-json-data (snapshot)
          |                                                  |
          v                                                  v
 scripts/import-campaigns.ts  --------------------->  scripts/import-cards.ts
 | scenarioOf: sets (+ partial -> remove step),      | mapCard: + vengeance
 |   acts|agendas (either may be empty),             v
 |   locations (front faces only), start fallback,   content/packs/<pack>/cards.generated.json
 |   setupCards from the Return-to set,
 |   bags: campaign, else scenario, else core
 | campaignGuide.ts: logKey() camelCase + aliases, tokenName(blood)
 | campaignFlow.ts: before[scenario] from the guide's scenario setup
          |
          v
 content/campaigns-generated/<id>/{campaign.json (options?), scenarios/*.json, flow.json (before)}
          |                                  |
          v                                  v
 src/content/schema.ts                 src/content/{implemented,coverage,flowChecks}.ts
 | CHAOS_TOKENS + blood, SYMBOL_TOKENS | setup card without lines works; removed cards not used;
 | CardDef.vengeance                   | before[] reached; options' sets exist
 | setAside.count, ScenarioDef.setupCards
 | CampaignDef.options {replaceSets, addSets}, CampaignFlow.before
          |
          v
 src/engine/index.ts createGame: gather sets through options (swap, add, dedupe),
   setAside every copy (or count), remove every copy
 src/engine/campaign/{campaign,flow}.ts: options in the state and save; before[] run when
   the order reaches a scenario, then setup
 src/engine/api.ts compose(base, extra) -> ScriptHooks        src/ui/menu new-campaign: option toggles
```

## Decisions

1. **Partial sets are a `remove` step.** `scenarioOf` reads the gathering step's `subtext` for "only gather the … treachery cards"; the set stays in `encounterSets` and its non-treachery codes go into `{ do: "remove", codes }`. The engine's `remove` already exists; coverage subtracts removed codes in `scenarioCards`. _Alternative:_ `encounterSets` entries with a type filter — rejected: a new shape in the schema, loader, engine and coverage for one phrase; and the side scenarios' own removals (`tfa.md` §6) need the subtraction anyway.

2. **Bags per scenario when the campaign has none.** `bagsOf` takes a list of step lists: the campaign's, then the scenario's; `CORE_BAGS` only when both give nothing. The side group passes its one scenario.

3. **Never skip for a deck or a start.** The skip condition becomes `!inPlay.length || (!acts.length && !agendas.length)`; the empty deck is written as `[]` (the engine's final-act ending already handles an empty act deck; a test asserts a scenario with `acts: []` sets up). The start fallback searches `locations` of every gathered set in set order, not only the own set, and notes "random start".

4. **A `b` code is a face.** `codesByName` keeps giving both; `scenarioOf` drops a code `X b` when `X` is in the pool with the same name, before `inPlay`, `setAside` and `remove` are built. The flip itself is `engine-scenario-structure`'s.

5. **`setAside` moves every copy.** `applySetupStep` loops `allCards` for each code, moving every copy in the encounter deck, a side deck or limbo, stopping at `st.count` when given. The importer never writes `count`; a hand-written file does (Dim Carcosa's one copy each). The step's "a code listed n times" reading goes.

6. **`vengeance` and `blood` are data.** `import-cards.ts`: `opt("vengeance", c.vengeance)`; `CardDef.vengeance: number.optional()`. `CHAOS_TOKENS` and `SYMBOL_TOKENS` gain `blood`; the token-table enum in `ScenarioDef.tokens` reads `SYMBOL_TOKENS`; the reveal rule treats a symbol with no table entry as 0 (test). `tokenName("blood")` then maps, so `chaosBag` and `compileFlow` carry it. Its sealing and the Prey on sealed tokens are `campaign-children-of-blood`'s.

7. **`logKey()` in `campaignGuide.ts`.** `snake_case` → `camelCase`, applied to every `campaign_log*` id in `compileFlow` (effects, conditions, labels) and `resolutionEffects`, and to the section ids a campaign's `campaign_log` declares and every effect names, so sections and keys agree. `ALIASES: Record<campaignId, Record<guideKey, baseKey>>` holds the words a hand-written base chose otherwise, built by diffing the base's keys against the camelCased guide keys (`rtnotz`: `cultists_escaped` → `cultistsGotAway`; the others found in task 4.1). `import-i18n` rewrites the Russian campaign texts with the same keys.

8. **`flow.before[scenario]`.** `CampaignFlow` gains `before: Record<string, StepIds>` (default `{}`). `compileFlow` expands each playable scenario's `setup` ids with the existing `expand` (the default branch already drops sets, layouts and rule reminders; `$play_scenario` is a handled input), owner `<scenario>`, and stores them under the scenario's file id. The engine's `nextItem` → scenario start path runs `before[id]` through the interpreter before `createGame`; `checkFlow` visits `before` and errors on a key that is not a scenario of the campaign. A hand-written campaign may write `before` too. _Alternative:_ compile them into the scenario's `setup` steps — rejected: they ask questions and write the log, which `SetupStep` can't.

9. **`setupCards`.** `ScenarioDef.setupCards: string[]` (default `[]`). The importer fills it with the `scenario`-type cards of the scenario's own set other than `card`. `implemented()` for a `scenario` card: real when some scenario plays with it as `card` and each such scenario's tokens are real (as today), or when a scenario lists it in `setupCards` and the card prints no symbol token line on either face; `tokensReal` is unchanged (it reads `card`). `scenarioCards` includes `setupCards`.

10. **`compose(base, extra)` in `src/engine/api.ts`** returns a `ScriptHooks`: for `setup`-like hooks `[base, extra]` in order; for hooks that return an answer (`checkObjectives`, `ended`, `spawnRedirect`) extra first, base when extra returns nothing; the rest both. The registry (`src/engine/world/scripts.ts`) sees an ordinary hooks object. A test checks the hook list is a superset of the base's.

11. **`CampaignDef.options`.** `{ id, labelKey, replaceSets: Record<newSet, oldSet> (default {}), addSets: string[] (default []) }[]`. `createCampaign` stores the chosen ids in `CampaignState.options`; the save carries them; the new-campaign screen renders a toggle per option (`t(db, locale, labelKey)`), off by default; the campaign screen shows them read-only. In `createGame`, the gathered list is `scen.encounterSets` with each `oldSet` swapped for its `newSet`, `addSets` appended, and a set dropped when its replacement is already listed; `sideDecks` go through the same map. `check:content` verifies every set id. The Return-to changes declare their pairs on their base campaign's `campaign.json`.

12. **Epic Multiplayer.** The first-option walk takes the standalone branch of War of the Outer Gods and the Blobs; a test asserts no generated scenario gathers an `epic_multiplayer` set.

## Risks / Trade-offs

- [The camelCase keys change every generated flow and campaign text at once] → one regeneration in one commit; no script reads a generated key yet (task 4.1 greps to prove it).
- [`before` steps run through the campaign interpreter, so a scenario start now has a flow cursor] → the save already holds the cursor; a scenario without `before` steps is unchanged (test).
- [`blood` in `SYMBOL_TOKENS` makes `tokensReal` demand a `blood` entry only where a reference card prints a blood line] → only Children of Blood's cards do; their tables are that campaign's work.
- [Removing the 13 Midnight Masks cards drops the per-scenario "working" counts that were inflated] → that is the point; `content/coverage.json` goes down honestly.

## Migration Plan

Schema additions have defaults; regenerated content lands in one commit with `pnpm coverage`. No `ENGINE_VERSION` bump: a save mid-scenario is unaffected; a campaign save without `options` reads as none chosen. Rollback: revert the commit.

## Open Questions

- None; a Return-to campaign doesn't offer the option (user decision). No in-force ADR needs revisiting; ADR-0038 records the Return-to shape.
