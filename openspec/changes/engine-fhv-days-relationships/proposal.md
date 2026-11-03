## Why

The Feast of Hemlock Vale is the most bespoke campaign in the program: it runs on a Day/Night clock over three days, tracks a relationship level per resident, stops play to read codex passages that write the campaign log mid-scenario, and plays four preludes whose hand, resources, assets and clues carry into the next scenario. None of that exists: `grep timeOfDay|codex|prelude|pursuit` finds only the `EVENT.Codex` name (`src/engine/events/event.ts:24`) and the `enemy_location` type in the schema enum (`src/content/schema.ts:47`). The inspection (`scratchpad/inspect/fhv.md` §2) counts 30 cards with `[codex]`, 30 with `(Day)`/`(Night)` text, 20 resident cards and 13 enemy-locations, and every one of the ten scenarios' setups depends on the day. Without this change no FHV card and no FHV scenario can be written, so it lands before `campaign-the-feast-of-hemlock-vale`.

## What Changes

- **Time of day in the game.** A scenario starts with `time: { day: 1 | 2 | 3, period: "day" | "night" }` read from the campaign log's `day` count (1 = Day 1 … 6 = Night 3, the count `campaign:set_current_day` writes; its advance is `campaign-flow-compiler-fixes`' job). The Time Marker story cards 10675/10677/10679 are put into play by the day. Ability lines printed `(Day)`/`(Night)` are active only in their period (new condition `timeOfDay`), `X = the current day number` is a new amount `currentDay`, and the coverage line rules accept `(Day …)`/`(Night …)` lines. In The Lost Sister a card at a `[[Dark]]` location reads its Night text and elsewhere its Day text (a scenario flag `darkOverridesTime`), and a double-sided Day/Night enemy flips as it crosses.
- **Residents and relationships.** The campaign log's per-resident `relationship` counts already exist as flow counts; the engine reads them at setup: a resident's story asset is put into play, controlled, set aside, or flipped to its enemy side by a `logCount` threshold, and a crossed-out resident never enters play. Scripts read a level through the API (`relationshipOf`).
- **Codex passages.** A scenario file gains a `codex` table (number → passage: branches on log state, game effects, campaign-log writes, once per scenario). A new effect op `codex { n }` and the `[codex] N` ability text stop play, read the passage, and resolve it. Log writes made in play are a typed delta on the game state that the flow merges when the scenario ends (ADR-0071); the campaign state is never touched from inside a game.
- **Preludes.** `ScenarioDef.kind: "prelude"`: no encounter deck (an encounter-draw effect does nothing), investigators cannot take damage or horror or be defeated, weakness draws are cancelled. When a Day prelude ends, each investigator's hand (up to their opening hand size), resources (up to their starting amount), one non-starting asset and their clues are kept into the next scenario, which skips mulligans and the hand/resource setup steps (ADR-0072).
- **Banked experience.** Experience a prelude or interlude grants is recorded as unspent-but-locked (`bankedXp`) and released to `xp` by a flow effect; `upgradeDecks` spends only `xp`.
- **Enemy-locations.** A card of type `enemy_location` is one entity in both the location and the enemy tables (ADR-0073): investigators stand on it, move through it and investigate it, and it has health, attacks when engaged, is fought and evaded, and goes to the victory display when defeated; a Dormant front and a Living back flip as a location flip does.
- **A second chaos bag.** A scenario can declare a named extra bag (`bags: { predation: [...] }`); a token effect or script can move a token between bags and reveal from a named bag.
- **Pursuit area.** A new out-of-play zone `pursuit`; an enemy there keeps its tokens, ignores forced effects, and is spawned from it by effect or token.
- **Investigator card swap and The Abyss.** `swapInvestigatorCard(inv, code)` replaces the investigator card keeping damage, horror, trauma and attachments (Shattered Self 10661, back to the "true" card); `deckAt(zone)` draws from the bottom of a named encounter-side deck built from mixed owners (The Abyss 10670). Hank Samson's second card (`player-cards-fhv`) uses the same swap.
- **Flow language.** A `perInvestigatorChoice` step (each investigator in turn picks a different option; solo picks two), conditions `atLeast { n, conditions }` and `anyAlive`, effects `fatigue` (draw two non-symbol tokens from the bag and replace each with the one 1 lower), `releaseXp`, `backupState` and `restoreState` (the Final Evening's replay), and `perInvestigator: true` on `logCount` bounds. The compiler maps ArkhamCards' `investigator_choice` with several choices and `multi` conditions onto them instead of `unsupported`.
- **Parley-aware token effects.** `testKind` gains `parley` so The Vale's cultist and elder-thing tokens (10704) can read "if this is a parley attempt".
- `ENGINE_VERSION` bump: a saved scenario in progress restarts, campaign logs are kept.

Out of scope, owned elsewhere and referenced by name: grid adjacency, slide/swap and location decks (`engine-location-instances-grid`); flipping double-sided locations and enemies keeping tokens, `locationRevealed`, per-act token tables, story cards (`engine-scenario-structure`); Patrol, Bonded, Researched (`engine-generic-keywords`); bless and curse (`engine-bless-curse`); the day counter, next-scenario choice and resolution tails of the compiled flow (`campaign-flow-compiler-fixes`); the Lost Sister reference card, both faces placed as two locations, the Midnight Masks set (`scenario-import-fixes`); every FHV card and scenario (`campaign-the-feast-of-hemlock-vale`, `player-cards-fhv`).

## Decided (assumed)

Grill-me run against the report and the code; the user was not available.

- Time of day is game state copied from the log at `createGame`, not read from the log on every check: the log snapshot (`GameState.campaignLog`) is already a copy, and the Lost Sister override needs a per-card evaluation the log cannot give.
- Codex writes do not reach `CampaignState` during play. The game state keeps a `logDelta: FlowEffect[]`; `finishScenario` (`src/ui/state/store.ts:700`) hands it to the flow before the resolution's steps. Reason: replay determinism (ADR-0029) and the host-ordered move log (ADR-0018) both assume the campaign state changes only between scenarios.
- Prelude carry-over is a snapshot in `CampaignState.carryOver`, consumed by the next `createGame`, not a game state kept alive across scenarios. Reason: `createGame` builds every scenario from data (campaign-play "Data-defined scenario setup"); a snapshot is data.
- An enemy-location is one entity with two components, not an enemy attached to a location: the store already keeps component tables per fact (ADR-0023, ADR-0024), and "an enemy at this location" must include the location itself for prey, hunter and attack rules.
- The Abyss and the investigator swap stay in this change rather than a Fate-of-the-Vale-only one: they are engine invariants (deck ownership, identity), and Hank Samson needs the swap in `player-cards-fhv`.
- The second bag is a named record on the game state, not a second `chaosBag` field, so a third bag costs nothing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: Time of day (new); Codex passages (new); Preludes (new); Enemy-locations (new); Pursuit area (new); Chaos bag (named extra bags, moving tokens); Damage, horror and defeat (none in a prelude); Player cards in play (the investigator card swap); Encounter deck and treacheries (a draw from the bottom of a named deck).
- `campaign-flow`: Campaign flow as data (`perInvestigatorChoice`, `atLeast`, `anyAlive`, `fatigue`, `releaseXp`, `backupState`/`restoreState`, per-investigator `logCount`); Flow compiled from the campaign guides (`investigator_choice` and `multi` compiled, no longer unsupported).
- `campaign-play`: Data-defined scenario setup (setup steps by day and by relationship level, residents to their enemy side, crossed-out residents removed); Experience and trauma (banked experience); Resolutions (the in-play log delta merged first); a prelude's carry-over into the next scenario.
- `card-content`: Data-driven card effects (`timeOfDay`, `currentDay`, `codex`, `testKind: parley`, `relationship` conditions); Content validation (a `codex` table, `kind: prelude`, `bags`, the `enemy_location` type with both location and enemy fields).

## Impact

- `src/engine/world/types.ts` (`GameState.time`, `logDelta`, `bags`, `GameSetup.carryOver`), `world/constants.ts` (`ZONE.Pursuit`, `STEP` kinds for codex, prelude end, swap), `world/store.ts` (an entity in two tables), `context.ts` (`setCode` for the resident flip, `swapInvestigatorCard`), `queries.ts` (`timeOfDay`, `relationshipOf`, enemy-location queries), `rules/scenario.ts` (time at setup, prelude setup, carry-over, codex), `rules/enemies.ts` (enemy-location attacks, pursuit), `rules/investigators.ts` (no damage/defeat in a prelude), `rules/skillTest.ts` (named bags, `testKind: parley`), `rules/chaos.ts`, `effects/` (`codex`, `moveToken`, `spawnFromPursuit`), `api.ts` (the new reads and verbs), `campaign/flow.ts` (`perInvestigatorChoice`, `atLeast`, `anyAlive`, `fatigue`, `releaseXp`, backup/restore, the delta merge), `campaign/types.ts` (`bankedXp`, `carryOver`, `backup`), `campaign/upgrade.ts`.
- `src/content/schema.ts` (`ScenarioDef.kind`, `codex`, `bags`, `darkOverridesTime`; conditions, amounts and ops; `FlowCondition`, `FlowEffect`, `CampaignStep`), `src/content/implemented.ts` (the `(Day)`/`(Night)` and `[codex]` line rules), `scripts/campaignFlow.ts` (`investigator_choice`, `multi`, `campaign_data`).
- `src/ui/state/store.ts` (`finishScenario` passes the delta; `startScenario` passes the carry-over), the campaign screen (`perInvestigatorChoice`, banked experience shown), `content/i18n/{en,ru}/ui.json` (prompts for codex, the per-investigator choice, time of day, the predation bag, pursuit).
- `content/campaigns-generated/the-feast-of-hemlock-vale/flow.json` regenerated: 0 `unsupported` steps and conditions (today 5 + 12).
- `ENGINE_VERSION` bump.

## Open questions

- Fate of the Vale's primitives (the swap, The Abyss) are in this change by the assumption above; if the user wants the engine change to land sooner, they split into `campaign-the-feast-of-hemlock-vale`'s last group with the scripts that need them.
- The PDF's Expert bag (`…-6,-6,-8`) differs from ArkhamCards' (`…-6,-7,-8`); the report keeps the generated bag as a likely re-typeset typo. Which is printed on the box's reference card?
