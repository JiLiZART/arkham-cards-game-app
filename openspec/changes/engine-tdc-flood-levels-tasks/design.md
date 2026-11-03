## Context

A location instance today is a `CardInst` whose facts live in one table per field (`src/engine/world/types.ts` `CardTables`, ADR-0024): zone, revealed, clues, doom, location. Nothing on it says how deep the water is or where it sits. The map is static scenario data: `ScenarioDef.layout` (`src/content/schema.ts:1445`, code → `[col, row]`) is read by `src/ui/game/layout.ts:74` to draw the table, and `connections()` (`src/engine/queries.ts:123`) joins the scenario's `connections` list with `flags.connections` by card code. `engine-location-instances-grid` moves connections onto the instance and derives them from the layout's adjacency; it still treats positions as fixed.

The campaign log (`src/engine/campaign/log.ts`) has sections of four kinds (`LOG_SECTION_KINDS`: entries, count, cards, investigatorCount). A scenario leaves notes for it through flags `log:<section>:<id>` and `count:<section>:<id>` (`src/engine/world/flags.ts:146` `campaignNotes`), applied by `applyScenarioEnd` (`src/engine/campaign/campaign.ts:173`). The flow (`src/engine/campaign/flow.ts`) tests `investigatorCount` for "any", "lead" or the step's "input" investigator, and its `investigatorChoice` step offers one option to one investigator. The compiler (`scripts/campaignFlow.ts`) returns `null` from `test()` for any part of a `multi` it can't express, which sinks the whole condition (line 318), and marks `campaign_log_task`, a multi-option `investigator_choice` (line 527) and `campaign_data` other than difficulty/version as unsupported.

The Drowned City's generated `campaign.json` already declares the sections the guide uses: `glyphs` (entries), `task_progress` (investigatorCount), `artifacts_earned`, `locations`, `flooded_neighborhoods` (entries). The guide's flood rules (OCR lines 114–145) and level rules (976–990) are the specification below.

In-force ADRs: 0001–0036, none superseded. 0024 (a new mechanic is a new table), 0022 (cards read through views, written through the core), 0025 (one-way imports, `world/` at the bottom), 0033 (deferred rules are typed step kinds), 0034 (scripts see an explicit list of reads and verbs), 0011 (the flow is a typed step language compiled from the guides), 0031/0035 (the table draws what one pure presentation reads from the state).

## Goals / Non-Goals

**Goals:** one flood model for TDC and TIC; locations that move and the queries the cards print; Tasks assigned, read and marked end to end (guide step → flow → scenario → log); the compiler stops marking the TDC step kinds unsupported; the table follows the state.

**Non-Goals:** the per-scenario verbs (Great Lift slide, Central Chamber rotation, Summit deck, Cthulhu Board), which are scripts in `campaign-the-drowned-city` composed from `placeLocation`/`swapLocations`; Patrol and Relentless (`engine-generic-keywords`); per-instance connections and adjacency (`engine-location-instances-grid`); keys (`engine-tic-keys-flooding`); the Task cards' own abilities (campaign change); the glyph translation text in the log screen.

## Diagram (C4-inspired, component level, ASCII; the engine is pure, the browser app the only container)

```
 content/campaigns-generated/<id>/flow.json            content/packs/tdc/{cards.json, scripts/*.ts}
   assignTask, taskHolder, logCount{section},            increaseFlood, locationFlooded, cannotFlood,
   investigatorTrait, investigatorChoice{distinct}        onRow, markProgress, setup flood / putIntoPlay{at}
            |                                                        |
            v                                                        v
 +---------------------------------------------------------------------------------------------+
 | src/engine                                                                                  |
 |  campaign/                                   world/ + context.ts + movement.ts + queries.ts |
 |  +------------------------------------+      +-------------------------------------------+ |
 |  | flow.ts test(): taskHolder binds   |      | tables flood: 0|1|2, position: [col,row]  | |
 |  |   input.inv; logCount id "*";      |      | queries floodLevel, isFlooded, positionOf,| |
 |  |   investigatorTrait; status        |      |   levelOf = row + scenario.levelOrigin,   | |
 |  | run(): investigatorChoice distinct |      |   rowOf, locationsOnRow, beside(l, dir),  | |
 |  | apply(): assignTask; "$task" id    |      |   above/below(l)                          | |
 |  | campaign.ts applyScenarioEnd:      |      | verbs setFlood (clamped, cannotFlood),    | |
 |  |   invCount:<section>:<id>:<inv>    |      |   placeLocation, swapLocations -> emit    | |
 |  | log.ts assignTask, holderOf        |      |   locationMoved, floodChanged; reconnect  | |
 |  +------------------------------------+      +-------------------------------------------+ |
 |  effects/tokens.ts increaseFlood|decreaseFlood {target}      rules/scenario.ts setup       |
 |  effects/targets.ts LocTarget nearestFlood, onRow, chosen    flood{codes|rows,level},      |
 |  queries.ts checkCondition locationFlooded, onLevel, beside  positions seeded from layout  |
 |  flags.ts invCount notes; effects markProgress/eraseProgress  and putIntoPlay{at}          |
 |  api.ts: the reads and verbs above (ADR-0034)                                             |
 +---------------------------------------------------------------------------------------------+
            |  state.world.tables.position / .flood        |  events locationMoved, floodChanged
            v                                              v
 src/ui/game/layout.ts (grid from the position table)   src/ui/scene/CardMesh (flood token sprite)
 scripts/campaignFlow.ts: compiles campaign_log_task, campaign_log_assign_task, investigator_choice
   sequential, campaign_log_count $num_entries, campaign_data investigator trait
```

## Decisions

1. **Flood level is a card table, `0 | 1 | 2`.** `CardTables.flood` (absent = unflooded, as ADR-0024 keeps defaults out of tables), read through the card view as `flood`. `setFlood(game, loc, level)` in `movement.ts` clamps to 0–2, honours the flags `cannotFlood` and `cannotFullyFlood` (constant modifiers with `scope: "self"`, the same shape as `damageCapOne`), and emits `floodChanged { loc, from, to }`. Effects `increaseFlood` / `decreaseFlood { target?: LocTarget, amount?: 1 }` call it; `LocTarget` gains `nearestFlood { level: "unflooded" | "partial" | "flooded" }` (breadth-first over `connections`, ties chosen by the player: Something in the Water 11737), `onRow { row }` and `chosen`. Condition `locationFlooded { where?: "your" | "event", is: "none" | "partial" | "full" | "any" }`; "flooded" means partial or full (OCR 144). An investigator flag `floodAsPartial` (Diving Suit) makes `floodLevel(game, loc, inv?)` answer 1 for a 2. TIC's flood is the same three states, so `engine-tic-keys-flooding` imports this and adds keys only. _Alternative:_ a flag `flood:<code>` keyed by card code — rejected: two copies of a location (Vault Chambers, Walkways) flood separately, and ADR-0024 says a per-entity fact is a table.

2. **Position is a card table, the layout seeds it.** `CardTables.position: Record<InstId, [number, number]>`. At setup `rules/scenario.ts` gives each location put into play `scen.layout[code]` when it has one; `putIntoPlay` (setup step and effect) accepts `at: [col, row]`, and `putSetAsideIntoPlay` too, so a script places the Walkways on levels 2–4 at random without inventing codes. `placeLocation(game, loc, pos)` and `swapLocations(game, a, b)` write the table and emit `locationMoved { loc, from, to }`; a scenario's row sliding and rotation are scripts that call `placeLocation` in a loop. Queries: `positionOf`, `rowOf`, `levelOf = rowOf + (scen.levelOrigin ?? 1)` (Western Wall's level 1 is the top row in v1 and the bottom in v2: the scenario file says which with `levelOrigin` and `levelDirection: "down" | "up"`), `locationsOnRow(row)`, `beside(loc, "left" | "right" | "above" | "below")`. Conditions `onLevel { min, max }`, `enteredFrom: "above" | "below"` (Treacherous Path 11521: `enterLocation`'s `from` already exists), and an `Amount` source `locationLevel`. When a position changes, `engine-location-instances-grid`'s adjacency-derived connections are recomputed for the instances that moved (`reconnect(game, ids)`), and printed connections are untouched. `ScenarioDef.connectionRule` gains `"rowsAboveBelow"` beside `"adjacent"` for agenda 11518's rule. _Alternative:_ keep `layout` static and let scripts rewrite `flags.connections` — rejected: the UI would draw the Great Lift where it started, and "the location to the right of it" has no answer.

3. **The table reads positions from the state.** `src/ui/game/layout.ts:74` takes `s.world.tables.position[l.id]` and falls back to `scen.layout[l.code]` (a location that was never placed). `locationMoved` is an animation-clock event (ADR-0002, ADR-0032) so the card slides; `floodChanged` flips a token sprite on the location mesh (`src/ui/scene/CardMesh`). No new component. _Alternative:_ a view-state copy of positions — rejected by ADR-0004: where a location is is game state.

4. **A Task is an assignment plus a per-investigator count, both in the log.** `log.ts` gains `assignTask(log, task, inv)` writing `log.tasks` as `Record<InvId, taskId>` (a new section kind `tasks`, one per campaign; the generated TDC `campaign.json` gains it through the compiler) and `holderOf(log, task)`. Progress stays in the existing `task_progress` investigatorCount section, id = task id. Flow: condition `taskHolder { task }` is true when an active investigator holds it and binds `input.inv` for the step's effects (trauma, `earnCard`, `investigatorCount`), the way `investigatorChoice` binds its pick; an `investigatorCount` id of `"$task"` resolves to the input investigator's own task; effect `assignTask { task, who: "input" }`. `investigatorChoice` gains `choices: FlowChoice[]` and `distinct: true`: the step asks each active investigator in turn, hiding options already taken, and runs the chosen option's effects with that investigator as input (An Offer You Can't Refuse `choose_tasks`). _Alternative:_ a Task as an earned card in the deck (`hasCard 11758a`) — rejected: the holder is needed before the card is dealt, and progress is a number, not a card.

5. **A scenario writes one investigator's count through a campaign note.** `flags.ts` gains `invCount:<section>:<id>:<inv>` beside `log:` and `count:`; `campaignNotes` returns kind `invCount` with the investigator; `applyScenarioEnd` applies it with `setInvestigatorCount(... "add")`. Effects `markProgress { amount }` and `eraseProgress { amount }` (card data) and the script verb `noteProgress(game, inv, n)` write it with id `"$task"`, resolved at scenario end from `c.log.tasks[inv]`. "Erase" never goes below 0 (`setInvestigatorCount` clamps). _Alternative:_ the engine writing the campaign state directly — rejected: the engine's output is the scenario state; the campaign reads it once at the end (ADR-0011).

6. **Section counts, traits and status as flow conditions.** `logCount` accepts `id: "*"` meaning the number of entries in the section not crossed out (`$num_entries`); `investigatorTrait { inv, traits: string[] }` reads `db.cards[i.code].traits`; `investigatorStatus { inv, is: "killed" | "insane" }` reads `c.investigators[].status` (the compiler maps `trauma killed/insane` to it instead of approximating by thresholds). `test()` in the compiler maps `campaign_data: version` inside a `multi` to `data { key: "version" }` as it does for branches, so `maybe_ask_ancient_relic` and `earn_xp_version` compile.

7. **Compiler.** `scripts/campaignFlow.ts`: `campaign_log_task` → `taskHolder`; `campaign_log_assign_task` → `assignTask`; `campaign_log` into section `$input_value` → `assignTask` as well (the guide's second write of the same fact); `investigator_choice` with `special_mode: sequential` and several choices → `investigatorChoice { distinct: true, choices }`; `campaign_log_count` with `$num_entries` → `logCount { id: "*" }`; `campaign_data investigator trait` → `investigatorTrait`; `campaign_log_investigator_count` with id `$count` → id `"$task"`. The regenerated TDC `flow.json` keeps one unsupported step at most (listed by the import).

8. **Setup steps.** `flood { codes?: string[], rows?: number[], level: 1 | 2 }` and `putIntoPlay { at }`. The direction-dependent setups (v1/v2) are the campaign change's scripts choosing which steps to run from `campaignLogOf`.

9. **`ENGINE_VERSION` bump.** Two new tables and new events; a saved scenario restarts, the campaign is kept, as the store already does.

## Risks / Trade-offs

- [Positions change under the UI mid-animation] → `locationMoved` is claimed by the clock like a card move; a test in `src/ui/game/layout.test.ts` asserts the grid after a swap.
- [Two changes touch `connections()`] → this change lands after `engine-location-instances-grid` and calls its `reconnect`; until then `placeLocation` only moves the drawing. Stated in tasks.
- [TIC flood diverges later] → the model is the printed rule, identical in both guides; TIC adds keys, not flood states.
- [Bound `input.inv` in `taskHolder` is implicit] → the condition's docs and the flow test name it; a step whose condition does not bind keeps the previous input, as today.
- [A Task holder who is killed] → `holderOf` ignores inactive investigators; Return to Arkham's `check_<task>` then takes its "not held" branch, which is the guide's outcome.

## Migration Plan

Engine, schema, compiler and UI in one change; `ENGINE_VERSION` bump; `pnpm import:campaigns` regenerates the TDC flow; `pnpm coverage`. Rollback: revert.

## Open Questions

- Whether `levelOrigin`/`levelDirection` belong on `ScenarioDef` or are set by the scenario script at setup (the v1/v2 setups differ): decided as a script call `setLevels(game, origin, direction)` writing a scenario flag, so the generated file needs no new field; recorded here in case the campaign change prefers data.
- No in-force ADR needs revisiting; decisions 2–3 and 4–5 are durable and the adr step records them (ADR-0074, ADR-0075).
