## Why

`scripts/campaignFlow.ts` compiles every generated campaign's flow, and the inspection reports (`ptc.md`, `fhv.md`, `tic.md`, `tde.md`, `tdc.md`, `sides.md`, `tcu.md`, `dwl.md`) found five defects in the compiler itself that every campaign change would otherwise work around: the guide's `set_scenarios` effect is not compiled, so The Path to Carcosa and its Return-to play in file order with no prologue, interludes or epilogue; a resolution step that names another resolution (`{ type: "resolution" }`, the "continue to Resolution 1" of 120 resolutions across the guides) is dropped, so "no resolution" does nothing in Dunwich, Carcosa, Innsmouth and the side scenarios and no Feast of Hemlock Vale scenario awards experience; every `$`-prefixed step is skipped, although the guides define them in each campaign's `core` scenario (Hemlock Vale's `$advance_time` and `$update_day`, so its day counter never leaves Day 1 and `$find_next_scenario` never runs); the `campaign_data version` test compiles to "false" inside a `multi`, so The Dream-Eaters' deck upgrade after scenario III never happens; and every interlude of ArkhamCards' single `side` guide (Fortune and Folly's checkpoint) lands in all 17 side campaigns' flows. The program of 65 changes also needs `docs/campaign-program.md` to be about those changes, not the 2026-10 pack list.

## What Changes

- **The order of play comes from `set_scenarios`.** A `campaign_data` effect with `setting: "set_scenarios"` reached from the campaign setup gives `flow.order`, interludes and epilogue in the guide's places; the reprint question that only chooses between two such orders is not asked (the original order is taken, like the difficulty choice). The Path to Carcosa and Return to The Path to Carcosa get prologue, Curtain Call, The Last King, Interlude I, Echoes, Oath, Interlude II, Phantom, Pallid Mask, Black Stars Rise, Dim Carcosa, epilogue.
- **Resolution links are followed.** A step `{ type: "resolution", resolution: "R6" }` expands that resolution's steps inline; a resolution the guide marks `hidden` (a shared tail such as Written in Rock's R6) is not an ending of its own in `flow.resolutions` or the scenario file. `no_resolution_defeated` / `no_resolution_resigned` pairs become `none` with a question which happened, until the engine can tell.
- **Shared `$` steps resolve.** A `$id` step is looked up in the campaign's `core` scenario, then in the scenario's own steps; `$upgrade_decks` keeps its special case. Hemlock Vale's day count advances and routes each evening; The Scarlet Keys' `$mark_n_time` and `$embark` compile as far as the language allows (the map is `engine-tsk-world-map`'s).
- **`campaign_data version` is true.** Every new campaign is the latest guide version; inside a `multi` it no longer makes the whole test unsupported. The Dream-Eaters upgrades decks after Dark Side of the Moon and Point of No Return.
- **A flow holds only the interludes its order or steps reach.** `compileFlow` receives the group's scenarios; an interlude or epilogue not in the order and named by no `nextScenario`, `set_scenarios` or side-scenario step is left out; `checkFlow` errors on one that stays. The Fortune and Folly checkpoint stays only in Fortune and Folly.
- **`docs/campaign-program.md` is rewritten** as the program of 65 changes in the order they land (foundations, cycle engine changes, campaigns base before Return-to, player cards per cycle), each row the change name, its status and the packs or scenarios it completes, the per-pack and per-scenario coverage tables kept beneath.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-flow`: Flow compiled from the campaign guides (order from `set_scenarios`, resolution links, `$` steps, version true, interludes pruned, the checks).
- `content-coverage`: The program of per-pack changes becomes the program of changes.

## Impact

- `scripts/campaignFlow.ts` (`compile`, `compileStep`, `test`, `effect`), `scripts/import-campaigns.ts` (what `compileFlow` receives, hidden resolutions left out of the scenario file), `scripts/campaignFlow.test.ts`; `src/content/flowChecks.ts` (interlude reachability).
- Regenerated `content/campaigns-generated/*/flow.json` and scenario files, `content/i18n/*/campaign-texts/`, `content/coverage.json` (unchanged counts; flows don't count).
- `docs/campaign-program.md`.
- Depends on `scenario-import-fixes` (camelCase keys, `before` steps, the regenerated content it lands); every campaign change builds on both.

## Decided (assumed)

- `set_scenarios` is static data: the order found on the campaign setup's default path becomes `flow.order`; a `set_scenarios` inside a later choice would need a `setOrder` effect in the engine, and no official guide has one beyond Carcosa's reprint question.
- Carcosa plays the original Interlude I (`ptc_interlude1`), not the reprint's (`ptc_interlude1_reprint`): the printed campaign guide in `inspired/` is the original; the reprint's text is kept as an interlude nothing reaches only if a later change asks for it.
- A hidden resolution is never an ending; the scenario file's `resolutions` lists only the guide's visible ones plus `none`.
- The `_defeated`/`_resigned` "no resolution" pair is a `chooseOne` stopgap, like the other questions the flow asks about in-game facts; the engine's "was anyone resigned" answer belongs to `engine-scenario-structure` and replaces it.
- The Scarlet Keys' order stays linear after this change: `embark` needs the map (`engine-tsk-world-map`); the `$` steps compile so the time marks and status reports exist as steps.

## Open questions

- None. The user confirmed Carcosa plays the original Interlude I.
