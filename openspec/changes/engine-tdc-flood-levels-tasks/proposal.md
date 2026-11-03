## Why

The Drowned City is driven by three things the engine has no words for: a flood level on each location (60 `tdcc` cards and six scenario reference cards read or change it), locations that sit on numbered levels and move during play (five of the seven R'lyeh scenarios slide, swap or rotate them), and a Task each investigator carries through the campaign whose progress scenarios mark and interludes read (33 of the campaign's 47 unsupported flow steps ask "who holds Task X"). Without them `campaign-the-drowned-city` cannot write a single R'lyeh scenario, and The Innsmouth Conspiracy (`engine-tic-keys-flooding`) would build its own flood a second time.

## What Changes

- **Flood levels.** Every location instance has a flood level: unflooded, partially flooded or fully flooded (the campaign guide's rule, p. 5 of the OCR: increase, decrease, cannot increase past fully flooded, "flooded" means either). Card data and scripts can increase or decrease a location's flood level (your location, a chosen one, the nearest eligible one, every location on a row), test it (`locationFlooded`), declare that a location cannot be flooded or cannot be fully flooded (Moving Platform 11594, Rooftops 11699/11700), and treat fully flooded as partially flooded for one investigator (Diving Suit 11764). Scenario setup can flood locations and rows. Token-effect conditions read it. The table shows a flood token on the location. Shared with `engine-tic-keys-flooding`, which uses it and adds nothing to the model.
- **Map positions as game state.** A location in play has a grid position `[col, row]` in the state, seeded from the scenario's `layout` and from the position a setup step or script gives a location it puts into play. Scripts move locations: place at a position, swap two locations, and the rows above/below, left/right, same-row and level queries the cards print ("X is this location's level", "connected to each location on the rows above and below", "the location to the right of it"). Connections that `engine-location-instances-grid` derives from adjacency are re-derived when positions change, so the table and the move action follow the cards. The 3D table reads positions from the state, not from the scenario file.
- **Tasks.** The campaign log can assign a Task to an investigator (one each, all different), and the flow can condition on who holds a Task (`taskHolder`, binding that investigator as the step's input), on a Task's progress, on the number of entries in a whole log section (artifacts earned, glyphs translated) and on an investigator's traits (Agency, Detective, Criminal). A scenario, through its script or a Task card's data, marks or erases progress under an investigator's own Task; the campaign log applies it when the scenario ends, as it applies `log:` and `count:` notes today. The flow compiler (`scripts/campaignFlow.ts`) emits these from the guide's `campaign_log_task`, `campaign_log_assign_task`, `investigator_choice` (`special_mode: sequential`), `campaign_log_count $num_entries` and `campaign_data investigator trait` steps instead of marking them unsupported.
- `ENGINE_VERSION` bump: a saved scenario in progress restarts, campaign logs are kept.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: Locations (flood level, grid position, level and row queries, moving locations and re-derived connections); a scenario's campaign notes can write a per-investigator count.
- `card-content`: Data-driven card effects (flood effects, conditions and modifiers; position conditions; progress effects; setup steps `flood` and `putIntoPlay` at a position).
- `campaign-flow`: Sectioned campaign log (Task assignment per investigator); Campaign flow as data (conditions `taskHolder`, `logCount` over a section, `investigatorTrait`, `investigatorStatus`; a distinct sequential `investigatorChoice`); Flow compiled from the campaign guides (the TDC step kinds compiled).
- `game-table-ui`: Table layout (flood token on a location; locations drawn where the state puts them and moving when it changes).

## Impact

- `src/engine/world/types.ts`, `store.ts` (tables `flood` and `position` per card instance, ADR-0024), `src/engine/queries.ts` (`floodLevel`, `isFlooded`, `positionOf`, `levelOf`, `rowOf`, `adjacent`, `locationsOnRow`, `beside`), `src/engine/movement.ts` (`setFlood`, `placeLocation`, `swapLocations`), `src/engine/effects/` (`increaseFlood`, `decreaseFlood`, `markProgress`, `eraseProgress`), `src/engine/rules/scenario.ts` (setup `flood`, positions at setup), `src/engine/world/flags.ts` (`invCount:` campaign notes), `src/engine/campaign/campaign.ts` (applies them), `src/engine/campaign/flow.ts` and `src/content/schema.ts` (new conditions, `assignTask`, distinct `investigatorChoice`), `scripts/campaignFlow.ts` (compiles the TDC step kinds), `src/engine/api.ts` (the new reads and verbs, ADR-0034).
- `src/ui/game/layout.ts` (positions from the state), the location component (flood token), `content/i18n/{en,ru}/ui.json` (prompt and label keys).
- Regenerated `content/campaigns-generated/the-drowned-city/flow.json` (47 → about 1 unsupported) and `content/coverage.json`.
- Depends on `engine-location-instances-grid` (connections per instance, adjacency). Used by `engine-tic-keys-flooding`, `campaign-the-drowned-city`, `campaign-the-innsmouth-conspiracy`, `player-cards-tdc` (Diving Suit is in `campaign-the-drowned-city`).
