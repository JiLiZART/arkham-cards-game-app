## 1. Exploration deck and Explore

- [x] 1.1 Failing test first (`src/engine/__tests__/exploration.test.ts`, `src/engine/kits/testkit.ts`): a scenario fixture with `buildExploration { cards, pick, bySymbol }` builds `ZONE.Exploration` from the listed copies, one of a `pick` list, one per symbol for `bySymbol` with the rest removed, the same deck for the same seed; then `ZONE.Exploration` in `src/engine/world/constants.ts`, the step in `SetupStep` (`src/content/schema.ts`) and `applySetupStep` (`src/engine/index.ts`).
- [x] 1.2 `CardDef.symbol` and `connectsTo` (location) in the schema, the symbol set in `constants.ts`; `connections()` in `src/engine/queries.ts` adds symbol pairs for locations in play; a query `connectsBySymbol(game, a, b)` for a card not in play; tests with two fixture locations.
- [x] 1.3 `designator: "explore"` (`schema.ts:959`, `rules/round.ts designatorOf`); the effect op `explore { match }` and `STEP.Explore { inv, match, drawn }` with its handler in `src/engine/rules/scenario.ts` (ADR-0033); tests: a connecting location is put into play with clues and the investigator moves there; a non-connecting one is set beside the deck and shuffled back after; a treachery resolves and discards to the encounter discard; an enemy spawns; an empty deck ends the exploration.
- [x] 1.4 Window `explored { inv, ok, location }`; conditions `explored { ok, thisTurn }` and `cannotExplore` (flag family on locations and investigators); `ScenarioDef.afterExplore` effects (the Return-to rule); tests: a reaction fires only on `ok: true`; Lost in the Wilds' flag blocks the action.
- [x] 1.5 Effects `lookAtExploration { top, then }`, `shuffleIntoExploration { card }`, `revealExplorationUntil { type }`, `rebuildExploration` (the step of 1.1 from a script); verbs in `src/engine/api.ts`; a unit test each in `src/engine/effects/__tests__/`.
- [x] 1.6 `tokenX` `explorationDeckSize` (`src/engine/rules/tokens.ts`); the bot (`src/engine/bot.ts`) takes a usable Explore ability when its location has no clues; test: a bot turn in the fixture explores.
- [x] 1.7 `check:content` (`src/content/check.ts`): every location in an exploration deck reaches a start location through `connectsTo`; test with an orphaned symbol failing.

## 2. Supplies

- [x] 2.1 Failing test first (`src/engine/campaign/__tests__/supplies.test.ts`): `LOG_SECTION_KINDS` gains `supplies`; `src/engine/campaign/log.ts` `addSupply`, `crossOffSupply`, `hasSupply(log, inv | "any", supply)`; the `SUPPLY` id set in `constants.ts`; the log screen shows the section per investigator (`src/ui/menu/`), strings `supply.<id>` en/ru in `content/i18n/{en,ru}/ui.json`.
- [x] 2.2 Flow steps in the schema and `src/engine/campaign/flow.ts`: `buySupplies { section, list, points, xpRate, record }` (a per-investigator prompt with the balance; up to 10 XP at `xpRate` 2 for the Return-to resupply; `record: false` keeps the list in the scenario), `checkSupply { supply, who: any | each | chosen }` as a step and a `FlowCondition`, `crossOffSupply { supply, who: eachOrRead | anyOne, missing }`; tests: 4 players buy at 4 points each; provisions crossed off per investigator with a missing-one branch; gasoline by any one; medicine removes a Poisoned.
- [x] 2.3 `scripts/campaignFlow.ts` compiles the guide's `supplies`, `check_supplies`, `use_supplies`, `investigator_choice_supplies` and the supply branches of `multi` to the new steps; test in `scripts/campaignFlow.test.ts` on the TFA prologue and Interlude I; `pnpm import:campaigns` leaves the unsupported count of `the-forgotten-age` at 27 − 20.
- [x] 2.4 `GameSetup.supplies` copied into `s.supplies` at `createGame`; card condition `hasSupply { supply, who: you | atYourLocation | any }` and effect `crossOffSupply { supply, who }`; the scenario end writes `supplies` into the record and the flow back into the log; tests: a card checks a map; Steps of Yoth's rope is gone from the log after the scenario.
- [x] 2.5 `src/content/implemented.ts` line rules for "Check your supplies" lines (ADR-0013); test on Expedition Camp 04050.

## 3. Vengeance and Yig's Fury

- [x] 3.1 Failing test first: `CardDef.vengeance` in the schema (the importer's field from `scenario-import-fixes`); `finishRevelation` (`rules/scenario.ts:96`) and `DefeatEnemy` send a card with `vengeance` to `ZONE.Victory`; the scenario end moves revealed clue-less vengeance locations there; tests with Brood of Yig 04083 and Underground Ruins 04066.
- [x] 3.2 `vengeanceInVictory` as `Amount`, condition `{ min }` and `tokenX`; constant modifier `consideredInVictory { condition }`; `queries.ts vengeanceInVictory(game)`; tests for the four statics' conditions.
- [x] 3.3 `ScenarioRecord.vengeance` (`src/engine/campaign/types.ts`), `FlowAmount` `"vengeance"`, `recordCards.source` `vengeanceInVictory`, effect `returnVengeanceCard`; the compiler maps `record_vengeance` to the computed amount; tests: a count step reads 3 after a scenario left 3 in the victory display; HotE 1's card list.
- [x] 3.4 `implemented.ts` line rules for "Vengeance X." and "vengeance points in the victory display" lines; test on 04084.

## 4. Poisoned

- [x] 4.1 Failing test first: setup step `setAsidePoisoned` (every 04102 not in a deck to `ZONE.SetAside`); effect `poison { who }` (nothing when already poisoned or none left); condition and prey `poisoned`; tests: Snake Bite poisons once; Fang of Yig preys on the poisoned investigator.
- [x] 4.2 Scenario end adds a Poisoned in a threat area to its investigator's campaign deck (`campaign/decks.ts addWeakness`); it starts in play next scenario (`index.ts:230` Permanent rule); flow effect `removePoisoned { who }`; tests across two scenarios.

## 5. Tokens and small vocabulary

- [x] 5.1 `TokenEffect.x` `vengeanceInVictory`, `locationsInPlay`, `locationsWithDoom`, `doomOnLocations`, `scenarioCounter { counter }`; `xMin`/`xMax`; `autoFail: Condition`; `tokenX` and `rules/skillTest.ts`; tests: tablet max 5, elder thing auto-fails while poisoned.
- [x] 5.2 Effects `flipClueToDoom { at }`, `setCounter`/`addCounter { name, amount }`, condition `counter { name, min, max }`, amounts `locationsWithDoom`, `doomOnLocations`; `flags.ts` family `counter`; `EFFECT_OPS`; a unit test each.
- [x] 5.3 Strings en/ru: Explore, the exploration deck, vengeance, poisoned, the supply prompts (`prompt.explore`, `prompt.buySupplies`, `prompt.crossOffSupply`); the scenario panel shows the exploration deck and the victory display's vengeance count (`src/ui/hud/`); the action rail offers Explore through `optionHome()` unchanged.

## 6. Versions and verification

- [x] 6.1 `ENGINE_VERSION` bump with its restart test; `CampaignState.version` bump with a migration adding the supplies section and `vengeance: 0` to old records (`src/engine/campaign/campaign.ts`), test on a saved campaign fixture.
- [x] 6.2 `src/engine/__tests__/boundary.test.ts` passes (no new ring; `api.ts` export list pinned with the new verbs).
- [x] 6.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate engine-tfa-supplies-vengeance-exploration --strict`.
