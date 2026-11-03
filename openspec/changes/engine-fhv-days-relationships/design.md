## Context

A scenario is built by `createGame(db, setup)` (`src/engine/index.ts:195`) from `GameSetup` (`src/engine/world/types.ts:539`: investigators, decks, trauma, `campaignLog`, `chaosBag`) and the scenario's data (`ScenarioDef`, `src/content/schema.ts:1418`: `setup` steps with `LogCondition` guards, `tokens` per difficulty, `sideDecks`, `resolutions`). The campaign lives in `CampaignState` (`src/engine/campaign/types.ts:94`: `log`, `chaosBag`, `flow`, `investigators[].xp`) and advances only between scenarios: `applyScenarioEnd(db, c, game)` (`src/engine/campaign/campaign.ts:161`) reads the ended game's facts into `ScenarioFacts`, and `advance` (`campaign/flow.ts`) runs the resolution's steps through `test()` (conditions, line 80) and `apply()` (effects). The compiled FHV flow writes `day` and the residents' `relationship` as log counts already; the engine reads neither in play.

The store keeps entities in component tables (ADR-0023, ADR-0024): a card is a row in the tables of its facts, so an entity can be a location and an enemy at once without a new container. `setCode` (`src/engine/context.ts:271`) already transforms a story asset into another card. Scripts reach the engine through `api.ts`'s explicit list (ADR-0034) and are found through one registry with typed hooks (ADR-0028). Deferred rules are typed step kinds (ADR-0033). Tests drive games through the scenario driver (ADR-0029). ADRs in force: 0001–0036, none superseded (no `Supersedes` field in `adr/`).

What is missing, by reading the FHV cards against this (`scratchpad/inspect/fhv.md` §2): the time of day; residents' levels at setup; codex passages that write the log in play; preludes and their carry-over; banked experience; enemy-locations; a second bag; the pursuit zone; the Fate of the Vale primitives; four flow kinds the compiler marks `unsupported`; a parley test kind for tokens.

## Goals / Non-Goals

**Goals:** every FHV mechanic that is not generic lives here, so `campaign-the-feast-of-hemlock-vale` writes only data and scripts; the campaign state stays untouched during play; a game remains its seed plus its choices; the compiled FHV flow has no `unsupported` entry.

**Non-Goals:** grid adjacency and location decks (`engine-location-instances-grid`); flips of double-sided locations and enemies, `locationRevealed`, per-act token tables (`engine-scenario-structure`); Patrol, Bonded, Researched (`engine-generic-keywords`); bless/curse (`engine-bless-curse`); the day counter's advance and the next-scenario choice in the compiled flow (`campaign-flow-compiler-fixes`); any FHV card's behaviour or scenario file.

## Diagram (C4 component level, ASCII; the engine is pure, the browser app the only container)

```
 content/campaigns-generated/the-feast-of-hemlock-vale/flow.json      content/campaigns/.../scenarios/<id>.json
   steps: perInvestigatorChoice | conditions: atLeast, anyAlive         kind: prelude | codex: {n: passage} | bags: {predation}
   effects: fatigue, releaseXp, backupState, restoreState               setup[].when: logCount day / relationship / logCrossedOut
            |                                                                   |
            v                                                                   v
 +----------------------------------------------+   +---------------------------------------------------------------+
 | src/engine/campaign                          |   | src/engine                                                    |
 |  types.ts: CampaignInvestigator.bankedXp,    |   |  world/types.ts: GameState.time {day, period}, logDelta[],    |
 |    CampaignState.carryOver, backup           |   |    bags {name: tokens}; GameSetup.carryOver, time             |
 |  flow.ts: test(atLeast, anyAlive, logCount   |   |  world/constants.ts: ZONE.Pursuit; STEP.Codex, STEP.PreludeEnd |
 |    perInvestigator); apply(fatigue,          |   |  world/store.ts: one entity in location + enemy tables        |
 |    releaseXp, backupState, restoreState);    |   |  rules/scenario.ts: time from campaignLog.day; Time Marker;    |
 |    settle(perInvestigatorChoice: distinct,   |   |    prelude setup (no encounter deck); carry-over applied;      |
 |    solo picks two)                           |   |    PreludeEnd snapshot -> GameState.carryOut                   |
 |  campaign.ts: applyScenarioEnd merges        |   |  rules/investigators.ts: no damage/horror/defeat in a prelude;  |
 |    game.logDelta before the resolution,      |   |    weakness draw cancelled; swapInvestigatorCard               |
 |    stores carryOut as carryOver              |   |  rules/enemies.ts: enemy-location attacks/engages; pursuit     |
 |  upgrade.ts: spends xp only                  |   |  rules/skillTest.ts: reveal from a named bag; testKind parley  |
 +----------------------------------------------+   |  effects/: codex{n}, moveToken{from,to}, spawnFromPursuit,     |
            ^            |                          |    drawFromBottom{deck}; condition timeOfDay, relationship;    |
            |            v                          |    amount currentDay                                           |
 +----------------------------------------------+   |  queries.ts: timeOfDay(game, cardId) (Dark override),          |
 | src/ui/state/store.ts                        |   |    relationshipOf, isEnemyLocation                              |
 |  startScenario -> createGame(setup+carryOver)|   |  api.ts: the reads and verbs above                             |
 |  finishScenario -> applyScenarioEnd(game)    |   +---------------------------------------------------------------+
 |  campaign screen: perInvestigatorChoice,     |            |  PendingChoice {promptKey "prompt.codex", "prompt.perInvestigator"}
 |    banked experience                         |            v
 +----------------------------------------------+   src/ui (strings in content/i18n/{en,ru}/ui.json)
```

## Decisions

1. **Time of day is game state set at setup.** `createGame` reads `campaignLog.day` (the flow's count: 1 = Day 1, 2 = Night 1, …, 6 = Night 3; `campaign:set_current_day` in `flow.json:332`) into `GameState.time = { day, period }`; a scenario without the count gets `{ day: 1, period: "day" }`. `rules/scenario.ts` puts the Time Marker of the day into play (10675/10677/10679; a `timeMarkers` field on the scenario, Day 1/2/3) unless the scenario says `timeMarker: false` (The Lost Sister). Condition `timeOfDay: "day" | "night"` and amount `currentDay` read it; `queries.timeOfDay(game, cardId)` answers per card: when the scenario sets `darkOverridesTime`, a card at a location with the `Dark` trait is in night and any other card in day. The coverage line rules (`src/content/implemented.ts`) accept a line starting `(Day` or `(Night` when the ability it names carries `timeOfDay`. _Alternative:_ read `campaignLog` on every condition — rejected: the Lost Sister override needs the card's location, and `campaignLog` is already a snapshot copied at setup, so a second read path adds nothing.

2. **Residents at setup, through the existing `LogCondition`.** `logCount { key, min, max }` already guards setup steps; the resident relationship counts are flow counts in the `relationships` section, so `when: { logCount: { key: "leah", section: "relationships", max: 2 } }` needs only `section` added to `LogCondition.logCount` and a new `logCrossedOut` guard. Two setup ops cover the cards: `putIntoPlay` gains `controlledBy: "lead" | "choose"` (Helen Peters, Marquez) and `side: "enemy"` (a resident put into play on its `b` side through `setCode`, keeping the entity). A `removeCrossedOut: { section: "residents" }` setup step removes every resident whose entry is crossed out. `api.relationshipOf(game, resident)` reads the count for scripts. _Alternative:_ a `residents` sub-system — rejected: a resident is a story asset with a log count; nothing else.

3. **Codex passages are scenario data; their log writes are a delta on the game state (ADR-0071).** `ScenarioDef.codex: Record<number, CodexPassage>` where a passage is `{ text, when?: LogCondition, effects: Effect[], log: FlowEffect[], branches?: {when, text, effects, log}[] }`; the `codex { n }` effect op (and ability text `[codex] N` through the line rule) pushes `STEP.Codex`, which refuses a passage already read this scenario (`flags["codex:<n>"]`), picks the branch whose `when` holds against `campaignLog` plus the delta so far, shows the text as a pending `continue` prompt (`prompt.codex`), queues the game effects, and appends the `log` entries to `GameState.logDelta`. `applyScenarioEnd` applies `logDelta` through `apply()` before the resolution's steps; a `bankedXp` effect there feeds decision 5. `campaignLog`-reading conditions in play (`logHas`, `logCount`) see the delta (a small merge in `checkLog`, `index.ts:107`). The passage text per locale comes through the campaign texts import (`i18n/<locale>/campaign-texts/<id>.json`), keyed `codex.<scenario>.<n>`. _Alternative:_ let scripts write `CampaignState` through a callback — rejected: the campaign state is not in the game, replay (ADR-0029) and online moves (ADR-0018) would need a second channel.

4. **Preludes are a scenario kind with a carry-over snapshot (ADR-0072).** `ScenarioDef.kind: "scenario" | "prelude"` (default `scenario`). In a prelude: `rules/scenario.ts` builds no encounter deck (`drawEncounter` and `shuffleIntoEncounter` resolve to nothing, logged), `AssignDamage`/`AssignHorror` to an investigator resolve to nothing, defeat never fires, and a weakness drawn is set back and the draw repeated (the agendas say so; the engine does it so no script repeats it). When the prelude ends with `carryOver: true` on its resolution, `STEP.PreludeEnd` snapshots per investigator `{ hand: codes up to the opening hand size (the player chooses what to discard beyond it), resources: min(resources, starting), asset: one non-starting asset chosen (null when none), clues }` into `GameState.carryOut`; `applyScenarioEnd` stores it as `CampaignState.carryOver`; `startScenario` passes it in `GameSetup.carryOver` and `createGame` applies it after decks are built (the hand cards are taken out of the deck, the asset put into play, the clues placed on the investigator) and skips `Mulligan` (`rules/investigators.ts:551`) and the opening draw and starting resources; the next `applyScenarioEnd` clears it. _Alternative:_ keep the game state alive across the two scenarios — rejected: every scenario is built from data (campaign-play "Data-defined scenario setup"), and a save in between would carry a half-finished game.

5. **Banked experience.** `CampaignInvestigator.bankedXp` (default 0; migrated as 0). The flow effect `xp` gains `banked?: true`; `releaseXp` moves `bankedXp` into `xp` for `who`. `campaign/upgrade.ts` spends `xp` only; the campaign screen shows "n banked" beside the experience. The compiler maps ArkhamCards' `special_xp: "unspect_xp"` to `banked: true` and the guide's "may now spend" steps to `releaseXp`.

6. **An enemy-location is one entity in two tables (ADR-0073).** `world/store.ts` registers a card of type `enemy_location` in the location table (shroud, clues, connections, revealed) and the enemy table (health, damage, fight/evade values, engaged, exhausted) under one `InstId`; `queries.enemiesAt(loc)` includes the location itself when it is on its Living side; `rules/enemies.ts` lets it engage and attack investigators at it and be fought/evaded from it; `DefeatEnemy` on it moves it to the victory display and removes it as a location (investigators and enemies on it move to a connecting location chosen by the lead, clues are lost). Its Dormant front has no enemy facts: the flip (through `engine-scenario-structure`'s location flip, else `setCode`) adds them. `isEnemyLocation(game, id)` in `api.ts`. _Alternative:_ a hidden enemy entity attached to the location — rejected: two ids for one card break "at your location" for both tables and the victory display.

7. **Named extra bags.** `GameState.bags: Record<string, ChaosToken[]>` (the main bag stays `chaosBag`); `ScenarioDef.bags` seeds them; effect `moveToken { token: "revealed" | ChaosToken, from: "main" | name, to }` and `revealFrom { bag }` (a reveal outside a test, as `revealToken` for the predation test); `rules/skillTest.ts` keeps its draw from `chaosBag`. Hemlock House's predation test is a script using `revealFrom`.

8. **Pursuit.** `ZONE.Pursuit`; `moveToPursuit { target }` and `spawnFromPursuit { pick: "highestEvade" | "choose", at }`; `rules/enemies.ts` skips enemies in pursuit for hunter, forced and attack rules; tokens stay on the card (the pile move keeps the entity's tables, as `setAside` does).

9. **Investigator card swap and a bottom-drawn deck.** `context.swapInvestigatorCard(inv, code)` changes the investigator's card code (stats, text, elder sign, abilities) in place; damage, horror, trauma, attachments and the deck stay; `EVENT.InvestigatorSwapped`. `ScenarioDef.sideDecks` entries gain `{ codes, from?: "playerDecksTop", n?, bottomDraw?: true }` for The Abyss: built after opening hands from each player deck's top `n` plus the named cards; `drawFromDeck { deck, from: "bottom" }`. The formation, act versions and interludes of Fate of the Vale are scripts in the campaign change.

10. **Flow language.** `CampaignStep` gains `perInvestigatorChoice { id, text, options: FlowChoice[], distinct: true, soloPicks: 2 }`: `settle` asks each active investigator in turn (one `Waiting` per investigator, `prompt.perInvestigator`), removes the options already taken when `distinct`, and runs the option's effects with `{ inv }` so `who: "input"` resolves; the answers are recorded per investigator as today. `FlowCondition` gains `atLeast { n, conditions }` and `anyAlive`; `logCount` gains `perInvestigator: true` (the bound is multiplied by the active count). `FlowEffect` gains `fatigue` (draws two non-symbol tokens from `chaosBag` with the campaign rng and replaces each with the value one lower, `-1` → `-2`, `0` → `-1`, `+1` → `0`), `releaseXp`, `backupState` (stores `{ log, chaosBag, investigators }` in `CampaignState.backup`) and `restoreState` (puts it back, keeps the flow cursor). `scripts/campaignFlow.ts` compiles `investigator_choice` with several choices (line 508's `unsupportedInput` branch) to `perInvestigatorChoice`, `multi { count, conditions }` to `any` (count 1), `all` (count = n) or `atLeast`, `[per_investigator]` comparisons to `perInvestigator: true`, `campaign_data: any_survived` to `anyAlive`, `backup_state`/`restore_state` to the effects.

11. **Parley in token conditions.** `testKind` (`schema.ts:231,279`) gains `parley`; `rules/skillTest.ts` sets the kind for a parley test (`rules/round.ts:389` starts one). A token effect can `autoSucceed` and `revealAnother` under it with the ops the chaos-bag requirement already has.

12. **`ENGINE_VERSION` bump.** New state fields and step kinds; a save in a scenario restarts it with its campaign kept, as today.

## Risks / Trade-offs

- [Codex delta and replay] → the delta is in `GameState`, serialised and replayed with the choices; a test replays a game with two codex reads and compares the delta.
- [Carry-over breaks a scenario's "fresh setup"] → it is applied after setup from data and only when `GameSetup.carryOver` is present; every other scenario is unchanged, asserted by the generated-campaigns test.
- [An enemy-location in both tables reaches every "enemy at location" query] → the queries filter on the Living side; a test checks a Dormant location is never attacked and never attacks.
- [Fatigue mutates the campaign bag at random] → drawn with the campaign rng, so a replayed campaign fatigues the same tokens.
- [Six new step kinds and three zones widen `STEP`/`ZONE`] → each has one handler in its owner module (ADR-0033); the boundary test keeps the layers.
- [The Fate of the Vale primitives are speculative until the scenario is written] → the swap is used by Hank Samson first (`player-cards-fhv`); The Abyss is one deck option; both are tested in isolation.

## Migration Plan

Additive schema fields with defaults; `CampaignState` migration adds `bankedXp: 0`, `carryOver: null`, `backup: null`; `ENGINE_VERSION` bump restarts in-progress scenarios. The compiled FHV flow is regenerated by `pnpm import:campaigns`. Rollback: revert; the generated flow regains its `unsupported` entries.

## Open Questions

- Whether the Fate of the Vale primitives (decision 9) stay here or move to the campaign change's last group (proposal).
- Expert bag `-6,-6,-8` (PDF) vs `-6,-7,-8` (ArkhamCards): kept generated; to confirm against the printed reference card.
