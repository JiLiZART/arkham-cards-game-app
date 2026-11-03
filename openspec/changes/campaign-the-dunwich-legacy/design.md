## Context

The Dunwich Legacy exists as `content/campaigns-generated/the-dunwich-legacy/` (campaign, flow, 8 scenarios) written by `scripts/import-campaigns.ts` from ArkhamCards' guide (ADR-0007). The generated files carry the right encounter sets and resolutions' texts but placeholder token tables (skull −1/−2, cultist −1, elder thing −2), grid connections that match no printed symbol, and setups that put every first copy into play. `content/coverage.json` reports 16 of 235 cards working, no real tokens, no script. The card side is `content/packs/dwl/cards.generated.json` (seven packs) with an empty `cards.json` and no `scripts/` folder.

What the engine has: data-driven abilities and token effects (`src/content/schema.ts`, `src/engine/effects/*`, `rules/tokens.ts`), card and scenario scripts found by code or scenario id (`db.scripts`, hooks `setup`, `checkObjectives`, `spawnRedirect`, `ended`, `allEliminated`), set-aside and side decks, `putSetAsideIntoPlay`, dynamic connection pairs (`flags.connections`, `world/flags.ts:130`), `addChaosTokens` (`context.ts:182`), parley and `takeControl`, one card beneath a location (`flags.beneath`), a beneath pile for acts, `campaignNotes` (`world/flags.ts:146`) by which a scenario hands `log:` and `count:` entries to the campaign at its end, and `ScenarioFacts` (`campaign/types.ts:40`: victory, not resigned). The foundations this change depends on add location removal and the void, locations in the encounter deck, many cards beneath a location or the agenda deck, act versions, flipping a location back, random setup ops and story cards (`engine-scenario-structure`); per-instance connections (`engine-location-instances-grid`); the hook points scenario scripts need (`engine-script-registry`, ADR-0028); the setup steps the importer drops (`scenario-import-fixes`); and flow compiler fixes.

In-force ADRs: 0001–0026 accepted, 0027–0036 proposed; none superseded. 0007 (campaign definitions generated from the guides, hand-written ones kept), 0011 (flow as a typed step language), 0012 and 0013 (coverage committed; a card works when every printed line is accounted for, a reference card by its token lines), 0015 (rules questions go to the grimoire), 0025 (engine layers), 0028 and 0034 (scripts through one registry with typed hooks; the script API as an explicit list) constrain this design.

## Goals / Non-Goals

**Goals:** the 8 scenarios play to every printed resolution with the printed setups, token effects and connections; every card they use works; the campaign log entries that come from the table come from the table; coverage reports the campaign complete.

**Non-Goals:** the Return-to box (`campaign-return-to-the-dunwich-legacy`), the side scenarios (`campaign-side-read-or-die`, `campaign-side-all-or-nothing`), player cards other than the neutral story assets (`player-cards-dwl`), Exile and Researched (`engine-generic-keywords`), locales beyond en and ru (`i18n-all-locales`), bot strategy for the new mechanics beyond legal play.

## Diagram (C4-inspired, component level, ASCII; the browser app is the one container)

```
 content/campaigns/the-dunwich-legacy/            content/packs/dwl/
 +------------------------------------------+     +----------------------------------------+
 | campaign.json  (generated: false, packs) |     | cards.generated.json (read-only)       |
 | flow.json      (hand-fixed resolutions,  |     | cards.json  (293 encounter cards +     |
 |                 defeat steps, log reads) |     |   15 story assets: abilities, tokens)  |
 | scenarios/<id>.json  x8 (setup, tokens,  |     | scripts/<code>.ts (acts, agendas,      |
 |   connections, acts/agendas, resolutions)|     |   locations, enemies the data can't)   |
 | scripts/<id>.ts x8 (scenario hooks)      |     +----------------------------------------+
 +------------------------------------------+                       |
            | loadCampaign / db.scripts[scenarioId]                 | db.scripts[code], db.cards
            v                                                       v
 +---------------------------------------------------------------------------------------------+
 | src/engine                                                                                  |
 |  index.ts createGame: setup steps -> rules/scenario.ts (random copies, act versions, cards  |
 |    beneath, side decks of locations, difficulty token -> addChaosTokens for the campaign)    |
 |  rules/tokens.ts: TokenEffect {onSuccess, autoFailInstead, payToZero, cancelCommitted,      |
 |    x: agendaStage|locationsWithoutCardBeneath|broodInPlay|extradimensionalLocations|        |
 |       yourLocationShroud|discardedPrintedCost, instead:{when, modifier}}                    |
 |  effects/: discardDeckTop, loseActions, endTurn, enemyAttack, revealToken, placeClues on    |
 |    enemy/location, Amount cluesOnEnemy|campaignCount; targets invsAtAttachedLocation        |
 |  movement.ts: moveCost hook, cannotLeave; queries.ts connections() over flags.connections   |
 |  rules/enemies.ts: spawnResolves mostClues|farthest|toYourRight|nearestAltered|             |
 |    anyExtradimensional; onlyAttackableBy                                                    |
 |  world/flags.ts campaignNotes: log:<section>:<id>, count:<section>:<id>, cards:<section>    |
 +---------------------------------------------------------------------------------------------+
            | ScenarioFacts + campaignNotes at scenario end
            v
 src/engine/campaign/flow.ts: resolution steps read the notes (brood escaped, sacrificed, cheated,
   necronomicon stolen, act reached, killed) instead of asking; addChaosToken persists in the bag
```

## Decisions

1. **The campaign is moved to `content/campaigns/the-dunwich-legacy/` first, then fixed by hand.** `git mv` of the generated folder, `generated: false`, the importer's skip list gains it (it already skips a campaign that exists hand-written). Scenario scripts live beside it in `scripts/<scenario-id>.ts` (the Night of the Zealot layout); card scripts in `content/packs/dwl/scripts/<code>.ts`. _Alternative:_ keep the generated files and overlay fixes in a sidecar — rejected: the importer would keep producing wrong setups and connections for a campaign whose truth is the printed card, and ADR-0007 already names the hand-written path. The move is program step 7, taken at the start because every scenario file is wrong.

2. **One scenario script per scenario, one card script per card, hooks through the registry.** Scenario scripts carry what belongs to the scenario as a whole: setup choices by log and at random, the train line, the Exhibit deck, the potential sacrifices, the Brood count, objectives (`checkObjectives`), spawn redirects, the ending (`ended` writes the campaign notes). Acts, agendas, locations and enemies whose text the data cannot express get a card script by code (`02043`, `02199`, `02255`…), so a shared card (02085 Light of Aforgomon in three scenarios) is written once. The hooks DWL needs beyond today's five (end of the enemy phase: UaU agendas; a location leaving play: 02320; an enemy entering play: 02119; "the agenda advances instead": 02044; a card drawn by an investigator: 02087, 02284) are typed hooks of `engine-script-registry`; this change adds no `hooks?.<string>` lookups of its own.

3. **Generic vocabulary is added here, in the first scenario group that needs it**, as `nat-pack-cards` did: `discardDeckTop { amount | perPointFailed }` (group 1: 02049, 02053; later 02083, 02104, 02178, the EA and WDA elder thing), `loseActions`/`endTurn` (group 2: 02081; the Essex cultist), `enemyAttack { target }` (group 2: 02078), `revealToken { on: { kind: effects } }` (group 2: 02073; 02093), `moveCost`/`cannotLeave` (group 1: 02102), the new `x` values and `TokenEffect` fields (each in its scenario's token table), the spawn values in `implemented.ts spawnResolves` (02086, 02095, 02183, 02295, 02329). Each is a schema entry, an `EFFECT_OPS` entry and one unit test. _Alternative:_ a separate `engine-dwl-mechanics` change as the report proposes — rejected by the brief: the cycle mechanics are `engine-scenario-structure`'s, and what is left is vocabulary, which the card-content spec grows per pack.

4. **Token tables are data, with the modifier's `x` computed by the engine.** `TokenEffect` gains `onSuccess`, `autoFailInstead: Condition`, `payToZero: number`, `cancelCommitted: true`, `revealAnother: true`, and `instead: { when: Condition; modifier }` for "−1 (−3 instead if …)"; `x` gains the six values of the proposal, with `max` and `times`. `tokensReal` in `implemented.ts` counts a line as real only if its `x` is in the engine's list, so a placeholder that happens to match the printed line fails coverage (content-coverage spec). _Alternative:_ a script per scenario card — rejected: tables are what ADR-0013 measures, and the Return-to box reuses them unchanged.

5. **Connections are transcribed from the scans into `connections` by code; runtime maps go through `flags.connections` per instance.** Extracurricular Activity, The House Always Wins, The Miskatonic Museum, Blood on the Altar, Undimensioned and Unseen and Where Doom Awaits are static symbol links by code (the report's lists; Blood on the Altar's Church → Commons and Commons → Osborn's in `oneWay`, as the guide's placement map draws them). The Essex County Express is positional (left/right), built by its script into `flags.connections` per instance and rebuilt when a car is removed; Lost in Time and Space's symbols are per code (every copy of 02324 shares them), with Another Dimension's row read from the card. `engine-location-instances-grid` makes `queries.ts connections()` instance-keyed, which the train and the four copies of 02324 need.

6. **The table hands the campaign its facts through `campaignNotes`, and the flow reads them.** The scenario script's `ended` hook writes `count:dwl:brood_escaped` (Brood in play plus set aside), `cards:sacrificed:<code>` for each card beneath the agenda deck, `log:dwl:cheated`, `log:dwl:necronomicon_stolen` (a defeated investigator held 02140), `count:dwl:act_reached`; `flow.ts` already records `log:` notes, and gains `count:` and `cards:` into the sectioned log (`campaign/log.ts setCount`, card lists). The flow's manual `counter`, `cardChoice` and `check_final_act` inputs are replaced by conditions on those entries. Investigator defeat steps use `ScenarioFacts` (a `defeated` list beside `notResigned`). _Alternative:_ keep the questions — rejected: the engine knows the answers, and a question the player can answer wrongly breaks the log.

7. **Chaos bag changes from inside a scenario persist.** `addChaosTokens` gains `forCampaign: true`, which also records the token in the campaign's bag (`campaign/campaign.ts`), used by the Essex and Where Doom Awaits setup steps (`addChaosToken` with a `difficulty` condition) and by Adam Lynch and Harold Walsted leaving play (02138, 02139).

8. **Story assets with a neutral faction are written with their scenario.** 02040, 02059–02061, 02079, 02080, 02138–02140, 02179, 02215, 02217–02219, 02254 are in the scenario groups; `player-cards-dwl` lists them as done here.

9. **`ENGINE_VERSION` bump**, as for every rules change.

## Risks / Trade-offs

- [Connections read from scans may be wrong] → each scenario's task transcribes and tests the pairs. Blood on the Altar is confirmed against the guide's placement map, one-way links included.
- [The change is large: 8 scripts, ~120 card scripts, 293 cards] → one task group per scenario, each playable and coverable on its own; groups 1 and 2 land first and carry the shared sets and the vocabulary.
- [Hooks not yet typed by `engine-script-registry`] → the dependency is stated; until it lands the scenario scripts cannot be written, and the task order puts them after the data.
- [Essex and Lost in Time and Space change the map at runtime] → per-instance connections from `engine-location-instances-grid`; a test removes the leftmost car and checks `connections()` and the investigators moved.
- [`tokensReal` turning stricter can flip other campaigns' tokens to not real] → those are placeholders already reported not real; a test over all scenarios asserts no hand-written scenario regresses.
- [A `count:` note the flow does not read stays silent] → the content check verifies every `count:`/`cards:` key a script writes is one the flow's conditions name.

## Migration Plan

Content and engine in one change; `ENGINE_VERSION` bump (a saved Dunwich scenario restarts, its campaign log kept). The generated folder is deleted and the importer skips the campaign. Rollback: revert; the importer regenerates the old files.

## Open Questions

- None open; the user's answers are under "Decided (user)" in the proposal. No in-force ADR needs revisiting.
