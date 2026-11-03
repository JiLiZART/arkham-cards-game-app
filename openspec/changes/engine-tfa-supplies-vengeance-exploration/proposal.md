## Why

The Forgotten Age cycle (10 scenarios, their Return-to versions, Relics of the Past, and later Guardians of the Abyss) runs on four mechanics the engine and schema do not have at all: the exploration deck with the Explore action, campaign supplies, vengeance with Yig's Fury, and the Poisoned weakness. A grep of `src/engine` and `src/content` finds no hit for any of them; the generated TFA scenarios set up with no exploration deck, 39 of the two campaigns' 53 unsupported flow steps are supply steps, and every scenario's Yig's Fury record asks the player to type a number the engine could count. No TFA scenario can be played to a resolution until these exist, so this change comes before `campaign-the-forgotten-age`, `campaign-return-to-the-forgotten-age`, `campaign-side-relics-of-the-past` and `player-cards-tfa`.

## What Changes

- **Exploration deck and Explore.** A scenario builds a named exploration deck from listed card codes and copies, with random picks (one Ruins of three; one of each pair of locations sharing a connection symbol, for the Return-to boxes). Locations carry connection symbols in data, so "a connecting location" is known for locations not yet in play. `explore` joins the action designators; an Explore ability runs one typed step: draw, put a matching location into play with its clues and move there (successful), set a non-matching location beside the deck and draw again, resolve a drawn treachery (unsuccessful), then shuffle the set-aside locations back. Windows and conditions for "after you explore successfully / unsuccessfully", "cannot explore", "did not explore this turn"; effects to look at the top cards, shuffle a card into the exploration deck, reveal until a location, and rebuild the deck; a token X source for the deck's size. The bot explores. The deck is generic: Guardians of the Abyss reuses it unchanged.
- **Supplies.** A campaign-log section kind for per-investigator supplies with counts; flow steps to buy supplies (points by player count, a priced list, an experience-to-points rate), to check a supply (any, each or a chosen investigator) and to cross one off (one per investigator with a consequence per missing one, or any one investigator); a scenario-local supply list that is not recorded. The supplies are in the game state during a scenario: a card condition `hasSupply` and an effect `crossOffSupply`; the log is written back at the scenario's end.
- **Vengeance and Yig's Fury.** `vengeance` on a card (the value `scenario-import-fixes` imports); an enemy, treachery or revealed location with vengeance goes to the victory display as a Victory X card does, a card can be "considered in the victory display" while a condition holds; the amount, condition and token X `vengeanceInVictory`; the scenario record keeps its vengeance and a flow amount can read it, so Yig's Fury is counted, never typed; a record-cards source for the vengeance cards in the victory display and an effect returning one to the discard pile.
- **Poisoned.** Setup sets aside every Poisoned weakness not in a deck; condition `poisoned`; effect `poison` (a set-aside Poisoned into your threat area, once); a Poisoned in play at the end stays in the deck; a flow effect removes one.
- **Token effects** gain the X sources TFA prints (`vengeanceInVictory`, `locationsInPlay`, `explorationDeckSize`, `locationsWithDoom`, `doomOnLocations`, `scenarioCounter`) with `xMin`/`xMax`, and an auto-fail outcome under a condition ("if you are poisoned, this test automatically fails instead").
- **Small vocabulary** TFA's locations need across scenarios: flip a clue on a location to its doom side; a named scenario counter (Depths' depth level, read by tokens and conditions); `locationsWithDoom` and `doomOnLocations` amounts.
- `ENGINE_VERSION` and the campaign save version bump (supplies section, vengeance in the scenario record).
- Out of scope, owned elsewhere: seal and release (`engine-bless-curse`), several act decks, story cards, flipping double-sided cards and location stacking (`engine-scenario-structure`), Patrol (`engine-generic-keywords`), the vengeance import, set-aside copies and the missing Return to The Depths of Yoth (`scenario-import-fixes`), the flow compiler's step order (`campaign-flow-compiler-fixes`), per-instance connections (`engine-location-instances-grid`; the symbol table here feeds it).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: Basic actions (Explore as an action designator); Locations (connection symbols and the exploration step); Chaos bag (new X sources with clamps, the auto-fail outcome); a new requirement for vengeance in the victory display, one for the Poisoned weakness.
- `campaign-flow`: Sectioned campaign log (the supplies kind); a new requirement for supply steps and computed amounts.
- `campaign-play`: Data-defined scenario setup (the exploration deck, Poisoned set aside, supplies in the game state).
- `card-content`: Data-driven card effects (the conditions and effects above; `vengeance` on a card); Content validation (every exploration location reaches the start by symbols).

## Impact

- `src/content/schema.ts` (`CardDef.vengeance`, `LocationDef.symbol`/`connectsTo`, `SetupStep` `buildExploration`, `designator` `explore`, `TokenEffect.x`/`xMin`/`xMax`/`autoFail`, conditions `hasSupply`/`poisoned`/`vengeanceInVictory`/`explored`, effects `explore`/`crossOffSupply`/`poison`/`flipClueToDoom`/`returnVengeanceCard`/`setCounter`, `LOG_SECTION_KINDS` `supplies`, flow steps `buySupplies`/`checkSupply`/`crossOffSupply`, `FlowAmount` `vengeance`, `recordCards.source` `vengeanceInVictory`).
- `src/engine/rules/scenario.ts` (exploration deck setup, the `Explore` step, victory display for vengeance, Poisoned pool, supplies in and out of the state), `rules/round.ts` (designator), `rules/tokens.ts` (X sources, clamps, auto-fail), `queries.ts` (connections by symbol, vengeance count, supplies), `world/constants.ts` (`STEP.Explore`, `ZONE.Exploration`), `effects/` (new ops), `campaign/log.ts`, `campaign/flow.ts`, `campaign/types.ts` (`ScenarioRecord.vengeance`, supplies in `CampaignInvestigator`), `bot.ts`, `api.ts` (verbs `explore`, `poison`, reads `vengeanceInVictory`, `hasSupply`).
- `scripts/campaignFlow.ts` (the `supplies`, `check_supplies`, `use_supplies`, `investigator_choice_supplies` and supply `multi` guide steps compile to the new flow steps; `record_vengeance` to the computed amount), `src/content/implemented.ts` (line rules for supply and vengeance lines, ADR-0013), `src/content/check.ts` (symbol reachability), `content/i18n/{en,ru}/ui.json` (supply names, Explore, exploration deck, vengeance, poisoned, the prompts).
- UI: the exploration deck beside the encounter deck in the scenario panel, Explore in the action rail, a supplies screen in the campaign flow, a vengeance count beside victory; through the existing presented table and option placement (ADR-0031, ADR-0035).
- No content file is rewritten here: the campaign changes set up each scenario's exploration deck, supplies checks and tokens.

## Decided (assumed)

- The exploration deck is a scenario-level side deck (`ZONE.Exploration`), not a TFA flag: Guardians of the Abyss and Relics of the Past build it the same way with other cards.
- Connection symbols are data on the location card (`cards.json` override: `symbol`, `connectsTo`), transcribed from the scans once per card, so the base and the Return-to scenarios share them and the engine's connection query (and `engine-location-instances-grid` after it) reads one table. Alternative, a per-scenario pair list of every exploration location against every other, was rejected: 12 Tenochtitlán locations alone would be 66 pairs per scenario.
- Supplies are a campaign-log section, not a separate campaign field, so the log screen, `hasEntry`-style reads and persistence are the existing ones; a card reads them through the game state's copy.
- Yig's Fury is computed from the scenario record; the generated `value: "input"` steps compile to the computed amount. The player never types it.
- Poisoned is modelled as what it is, a Permanent weakness in play, not a status flag: the engine already starts Permanent cards in play and the campaign deck already carries weaknesses.
- Scenario-local supplies (Relics of the Past) use the same purchase step with `record: false`.

## Open questions

- Supply names in Russian: the printed RU guide (`inspired/PDF_ru/04_00_Затерянная_Эпоха.pdf`) is the source; the ArkhamCards Russian guide may differ. Follow the printed guide.
- Whether the Explore action should be offered from the action rail when no Explore ability is in play (never: Explore exists only on cards) — assumed never.
