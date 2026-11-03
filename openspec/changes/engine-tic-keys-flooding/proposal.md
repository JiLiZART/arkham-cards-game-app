## Why

The Innsmouth Conspiracy's cycle mechanics have no engine support: a grep of `src/engine` and `src/content` finds no keys, no flood levels and no way for a scenario to change the campaign's chaos bag. Every one of the campaign's eight scenarios and Red Tide Rising's encounter sets print them (keys on ~70 encounter cards, flood on ~60 and on five reference cards), so 0 of the 361 `tic`-folder encounter cards work and `campaign-the-innsmouth-conspiracy` cannot start before this lands. The Drowned City floods locations too (`engine-tdc-flood-levels-tasks`), so the flood table is written once here, as the campaign program's "cycles whose mechanics need a change of their own first" row for TIC says.

## What Changes

- **Keys.** The seven coloured keys (red, blue, green, yellow, purple, black, white) are game state: a key table with each key's face (faceup or facedown) and holder (a card in play, an investigator, set aside, or out of the game). Setup ops place keys faceup or facedown on cards or aside (`placeKeys`); card data gets `placeKey`, `takeKey`, `giveKey`, `spendKey` and `placeYourKeys` effects, `youControlKey`, `investigatorsControlKeys`, `keyOn` and `keysAtYourLocation` conditions, and the token X sources `keysInvestigatorsControl` and `keysOnScenarioCard`. The rules the Grimoire's _Keys_ entry states run in the engine: an investigator at a location with no clues may take its keys as a fast action; keys on an enemy that leaves play go to the investigator who made it leave, otherwise onto its location; an investigator may give a key to another at the same location; an eliminated investigator's keys drop on their location; a facedown key is turned faceup when taken. Resolutions can record where a key is (`recordKey`).
- **Flood levels.** Each location in play has a flood level (unflooded, partially flooded, fully flooded) in a table; a location's card data can say it enters play flooded; effects `increaseFlood`, `decreaseFlood` and `setFlood` change it, capped by the `cannotBeFlooded` and `cannotBeFullyFlooded` flags; conditions `locationFlooded`, `locationFullyFlooded` and `unfloodedLocations` read it; the investigator flag `treatLocationUnflooded` (Fishing Vessel) and the agenda-level flag `ignoreAgendaForced` (Diving Suit) are read by the rules below. "Struggle for air" is one rule in the round: an investigator who begins their turn at a fully flooded location is struggling, and takes 5 direct damage when the turn ends unless they entered a location that is not fully flooded during it.
- **Flashbacks.** A scenario can show a story mid-scenario and leave the campaign a consequence: a `flashback` step shows the text (translated by key), records the memory under `memories_recovered`, and may ask the players to pick a token to remove; its chaos-bag consequences are notes (`bag:add:<token>`, `bag:remove:<token>`) that `applyScenarioEnd` applies to the campaign's bag alongside today's `log:` and `count:` notes. No scenario mutates the campaign directly (ADR-0061).
- **Flood test modifiers.** The conditions above plug into the existing `modify` effects and constant modifiers (Tidal Pool's shroud, Oceiros Marsh's evade, Shapes in the Water's difficulty). "−3 instead if …" token lines use the conditional modifier `engine-scenario-structure` adds; this change adds only the conditions it reads.
- **UI.** Key tokens drawn on the card or investigator that holds them (colour, face), a flood badge on locations, the flashback story prompt, and the new prompts' strings in `content/i18n/{en,ru}/ui.json`.
- `ENGINE_VERSION` bumps: a scenario in progress restarts, the campaign is kept.
- **Not here:** bless and curse tokens, seal and release (`engine-bless-curse`); grid adjacency and locations placed below, left or right of another (`engine-location-instances-grid`); location decks with a shared back, vehicles, slumbering Ancient Ones, conditional token modifiers (`engine-scenario-structure`); the TDC flood tasks and their flood effects (`engine-tdc-flood-levels-tasks`, which lands after this and extends the same table); the scenario scripts and card data of the cycle (`campaign-the-innsmouth-conspiracy`, `player-cards-tic`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: Locations (flood levels, struggle for air); a new requirement for keys; a new requirement for what a scenario leaves the campaign (flashback stories, bag notes).
- `card-content`: Data-driven card effects (the key and flood vocabulary, the token X sources, the location's starting flood).

## Impact

- `src/engine/world/types.ts`, `world/constants.ts` (`KEY` colours, `FLOOD` levels), `world/store.ts` (two tables: `keys` by colour, `flood` by location instance), `world/flags.ts` (bag notes, `struggling`, `enteredThisTurn`), `movement.ts` (keys follow a card that leaves play), `rules/enemies.ts` (defeat and evade hand keys over), `rules/investigators.ts` (elimination drops keys, turn begin and end for struggle for air), `rules/round.ts` (the fast "take key" and "give key" options), `rules/scenario.ts` (`flashback` step), `rules/tokens.ts` (X sources), `effects/placement.ts` (key and flood ops), `queries.ts` (conditions), `campaign/campaign.ts` (bag notes), `api.ts` (verbs and reads for scripts).
- `src/content/schema.ts` (setup op, effects, conditions, flags, `LocationDef.flood`, resolution effect `recordKey`), `src/content/implemented.ts` (line rules for "cannot be flooded", "enters play fully flooded").
- `src/ui/scene` (key tokens, flood badge), `src/ui/hud` (flashback prompt), `content/i18n/{en,ru}/ui.json`.
- Lands after `engine-bless-curse` (shares the chaos-bag note shape for Lair of Dagon's "add 1 curse") and before `engine-tdc-flood-levels-tasks`, which reuses the flood table and ops and adds TDC's tasks.
