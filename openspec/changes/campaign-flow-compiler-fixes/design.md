## Context

`compileFlow` (`scripts/campaignFlow.ts`, class `Compiler`) walks the guide's step graph per owner (the campaign, a scenario, an interlude) through `expand` → `one` → `compileStep`. `compileStep` returns `[]` for any id beginning with `$` except `$upgrade_decks`, and its default branch drops every step type it doesn't name, among them `resolution` (`{ type: "resolution", resolution: "R6" }`, the guide's "continue to Resolution N"). `compile()` builds `flow.order` from `campaign.scenarios` plus the playable scenarios nothing names, in file order; the `set_scenarios` effect (`campaign_data`, Carcosa's `check_reprint_version` and `ask_reprint`) falls to `skipEffect`. `test()` returns `null` for `campaign_data version`, and `multi` returns `null` when any part does, so The Dream-Eaters' `maybe_upgrade_decks` (`half_campaign` or `version ≥ 1`, count 1) compiles to `{ kind: "unsupported", take: false }`. `compile()` adds every interlude and epilogue of the scenarios it receives, and `import-campaigns.ts` passes the whole `side` guide's scenarios to each side group, so the Fortune and Folly checkpoint lands in all 17 side flows. The guides define their shared steps in a scenario of `type: "core"` per campaign (Hemlock Vale: `$advance_time`, `$update_day`, `$find_next_scenario`, `$choose_next_scenario_day`; The Scarlet Keys: `$mark_1_time`, `$embark`, `$check_status_report`; The Drowned City: `$record_rune_a` … `$ask_glyphs`). `checkFlow` (`src/content/flowChecks.ts`) visits setup, interludes and resolutions and reports unreachable steps, but not an interlude nothing reaches.

`scenario-import-fixes` lands first: camelCase log keys, `flow.before`, and the regenerated content this change regenerates again.

## Goals / Non-Goals

**Goals:** every generated flow plays the guide's order with its interludes; every resolution runs what the guide says, links followed; the shared steps compile; the version test is true; a flow holds only what it reaches; the program document describes the 65 changes.

**Non-Goals:** new input or effect kinds (Hemlock Vale's `perInvestigatorChoice`, The Scarlet Keys' map and time thresholds, The Drowned City's tasks: the cycle engine changes); the engine's "resigned or defeated" answer for the `none` pair (`engine-scenario-structure`); hand-fixing any campaign's flow (its campaign change).

## Diagram (C4-inspired, component level, ASCII)

```
 inspired/ArkhamCards/.../all_campaigns.txt
   campaign { setup, steps (set_scenarios in check_reprint_version) }
   scenarios: core { $advance_time, $update_day, ... }, playable { setup, steps, resolutions (hidden R6) }, interludes
          |
          v
 scripts/import-campaigns.ts
   groups a campaign (or one side scenario); passes compileFlow the group's scenarios + the guide's core and
   the interludes; writes scenario files with the visible resolutions only
          |
          v
 scripts/campaignFlow.ts  Compiler
   shared: Map<$id, step> from the core scenario   -> compileStep resolves $ids (core, then own)
   resolution step  -> expand(resolution.steps) inline, cycle-guarded by `done`
   set_scenarios    -> flow.order (first reached on the setup's default path); the choice collapses
   version test     -> { kind: "unsupported", take: true } usable inside all/any
   interludes       -> kept when in order or named (namedScenarios), else dropped
          |
          v
 content/campaigns-generated/<id>/flow.json  { setup, order, interludes, resolutions, before, steps }
          |
          v
 src/content/flowChecks.ts checkFlow: + "interlude <id> is in neither the order nor a step"
 src/engine/campaign/flow.ts: unchanged (order, nextScenario, resolutions)
          |
 docs/campaign-program.md: the 65 changes in landing order + the coverage tables (from content/coverage.json)
```

## Decisions

1. **`set_scenarios` is the order.** `compile()` first walks the campaign setup's default path (the `boolCondition: false` branch of an unsupported-but-true test is not taken; `version` is true, so Carcosa goes through `describe_reprint` → `ask_reprint`) looking for the first `campaign_data` effect with `setting: "set_scenarios"`; for a `choose_one` whose choices all carry one, the first choice's list is taken and the question is dropped as the difficulty choice is (the `effect` case for `set_scenarios` returns `[]` without counting it unsupported). The list maps through `scenarioId` and keeps the ids that are a playable scenario or an interlude of the group. Without one, the order is built as today. _Alternative:_ a `setOrder` flow effect in the engine, so the reprint question is asked — rejected: one campaign, and the user decides which interlude the game plays (proposal).

2. **A `resolution` step expands in place.** `compileStep` case `"resolution"`: find the resolution by `st.resolution` in the owner scenario's `resolutions`, `expand(owner, byId, r.steps)`; `one()`'s `done` map already cuts a cycle. `compile()` keys `flow.resolutions[id]` only for resolutions without `hidden: true`; `import-campaigns.ts` writes the scenario file's `resolutions` from the same filter, so a hidden tail is never an ending. A guide `no_resolution_defeated` / `no_resolution_resigned` pair compiles to `none` = one `chooseOne` step ("Did the investigators resign, or were they all defeated?") whose two choices expand the two lists; a lone `no_resolution_*` maps to `none` directly.

3. **Shared steps.** `FlowSource` gains `shared: Map<string, Raw>` (the `core` scenario's steps, by id; `import-campaigns.ts` builds it from `g.scenarios.find(s => s.type === "core")`). `compileStep`: an id beginning with `$` is looked up in `byId` (the owner's own steps, e.g. `$play_scenario`), then `shared`; `$upgrade_decks` keeps its special case; a `$` id found nowhere returns `[]` as today. The steps compile through the same cases, so `$advance_time` (effects + steps) and `$update_day` (a `campaign_log_count` branch) need nothing new; the hidden `current_day` and `hidden` sections are already handled (`NOTES`, `hidden`).

4. **Version is true.** `test()` case `campaign_data` with `campaign_data === "version"` returns `{ kind: "unsupported", name: "version", take: true }`, so `multi` composes it and `branch()` takes `then`. Nothing is counted unsupported for it.

5. **A flow holds what it reaches.** `import-campaigns.ts` passes `compileFlow` the group's playable scenarios, the guide's `core`, and every interlude/epilogue of the guide; after `compile()` builds the order, interludes neither in `flow.order` nor in `namedScenarios(flow)` are deleted from `flow.interludes` along with their steps (owner prefix `<id>:`). `checkFlow` adds the error "interlude <id> is in neither the order nor a step" so a hand-written flow can't carry a dead interlude either.

6. **The program document.** `docs/campaign-program.md` becomes: a short head (what the program is, ADR-0012, how a change is done); a table of the 65 changes in landing order, grouped as the brief orders them (foundations: `scenario-import-fixes`, `campaign-flow-compiler-fixes`, `engine-scenario-structure`, `engine-generic-keywords`, `engine-location-instances-grid`, `engine-bless-curse`; cycle engine: the nine `engine-<cycle>-*`; `i18n-all-locales`; the 36 `campaign-*` with each base before its Return-to and the side scenarios after their cycle; the 13 `player-cards-*`), columns: change, status (from `openspec/changes/` vs `archive/`), what it completes (packs or scenarios); then the existing pack and per-scenario coverage tables, regenerated from `content/coverage.json` by the same hand procedure as today, each pack row naming its change. A test (`scripts/program.test.ts`, new) asserts every `campaign-*`, `player-cards-*` and listed engine change under `openspec/changes/` appears once.

## Unsupported constructs after this change (task 2.3)

The import's flow notes (`.cache/import-campaigns.log`), summed per campaign, before this change (after `scenario-import-fixes`) and after. A construct is counted each time a scenario's flow compiles it, so a shared step reached by many scenarios counts many times. The rise in The Scarlet Keys and Hemlock Vale is their shared steps (`$embark`, `$advance_time`) now compiled where they were dropped: The Scarlet Keys' 1,853 are mostly its made-up "ztsk_" cards (660, skipped) and Scarlet Key effects (440), both `engine-tsk-*` and `campaign-the-scarlet-keys` scope. The side scenarios not listed are unchanged.

| Campaign | Before | After |
| --- | --- | --- |
| `children-of-blood` | 10 | 10 |
| `edge-of-the-earth` | 163 | 173 |
| `fortune-and-folly` | 11 | 11 |
| `guardians-of-the-abyss` | 2 | 0 |
| `return-to-the-circle-undone` | 39 | 30 |
| `return-to-the-dunwich-legacy` | 3 | 2 |
| `return-to-the-forgotten-age` | 83 | 79 |
| `return-to-the-night-of-the-zealot` | 4 | 3 |
| `return-to-the-path-to-carcosa` | 18 | 9 |
| `side-the-midwinter-gala` | 10 | 11 |
| `the-circle-undone` | 38 | 30 |
| `the-dream-quest` | 49 | 46 |
| `the-drowned-city` | 77 | 78 |
| `the-dunwich-legacy` | 3 | 2 |
| `the-feast-of-hemlock-vale` | 49 | 80 |
| `the-forgotten-age` | 54 | 51 |
| `the-innsmouth-conspiracy` | 25 | 20 |
| `the-path-to-carcosa` | 17 | 8 |
| `the-scarlet-keys` | 112 | 1853 |
| `the-web-of-dreams` | 49 | 46 |

Also found while applying: a plain step's own follow-on `steps` were never compiled (47 guide steps, `$advance_time` → `$update_day` among them), now expanded; a guide note about the ArkhamCards app and a shared `$…_rule` reminder are not campaign text; skipping an interlude the flow doesn't play (the reprint's Interlude I) is dropped. A resolution that links to another and then names a step the linked one already ran (Essex County Express: "Resolution 2", then `$upgrade_decks`) ran it twice, awarding XP twice; an expansion now lists each step once.

## Risks / Trade-offs

- [Expanding resolution links duplicates a shared tail's steps under each resolution's owner] → step ids are `<owner>:<base>` and `add()` suffixes duplicates with `#n`; the tail compiles once per link (five times for Written in Rock); `stepTexts` keeps texts per id so translations follow. Accepted over a shared-step reference the language doesn't have.
- [`$` steps that are rules text become story steps in the flow] → only steps with no `type` and a `text` do; `$…_rule` steps have a type the default branch drops. A test over the regenerated flows asserts no step text starts with a rules heading.
- [Taking the first `set_scenarios` choice hides Carcosa's reprint] → the user chose the original Interlude I; switching later is one line.

## Migration Plan

Content only: flows regenerated in one commit, `check:content` green with the new interlude check. No engine or save change. Rollback: revert.

## Open Questions

- None; Carcosa's Interlude I is the original (user decision). No in-force ADR needs revisiting; ADR-0037 records what a flow holds.
