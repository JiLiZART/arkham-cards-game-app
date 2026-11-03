## Why

The Scarlet Keys is built on three mechanics the engine has no word for: enemies that hide in "the shadows" behind concealed mini-cards, keys that shift between a Stable and an Unstable face and belong to a bearer across scenarios, and cards set aside as hollows. 95 of the campaign's card texts mention a concealed mini-card, 39 a hollow, and every scenario's agenda or act touches a key; without them the campaign's 344 cards (34 work, all core) cannot be written, and Kymani Jones and the other `tskp` cards that expose or shift stay stubs.

## What Changes

- **The shadows and concealed enemies.** A `shadows` zone: an enemy drawn with `Concealed X` (or told to "resolve its concealed keyword") spawns there, at no location, where it cannot move, be damaged or leave play by player-card effects, and counts as the nearest enemy only when no enemy is at a location.
- **Concealed mini-cards as content.** ArkhamDB has no decoy or mini-card entries, so they are hand-written cards of a new `minicard` type in `content/packs/tsk/minicards.json`: one mini-card per concealed enemy (plus "Acolyte (any)", the Void Chimera's four special decoys and the City of Remnants L/M/R cards) and the decoy. On a conceal the enemy's mini-card and X decoys are placed facedown, spread evenly from the nearest locations, as attachments to those locations.
- **Exposing.** A facedown mini-card at an investigator's location can be exposed by a successful fight or evade against it (difficulty = the location's shroud), by a successful investigate of the location, or in place of a clue discovered, damage dealt to an enemy or an automatic evade, one mini-card per effect. A decoy is set aside; an enemy's mini-card moves that enemy from the shadows to the location, and an empty shadows clears every mini-card. Windows `expose` (before, for Coterie Envoy's block and Tenebrous Eclipse's limit) and `exposed` (after, for "after you expose a decoy / an enemy").
- **Keys with bearers and shift.** A campaign-log section kind `bearers` names each key's bearer (an investigator, a story asset or an enemy); flow effects `setBearer` and condition `bearer` replace the 12 no-op `choose_bearer_of_*` steps. A key enters play attached to its bearer, Stable on an investigator or story asset, Unstable on an enemy; it is set aside when its bearer leaves and stays bound. A key's `shift` ability is a free trigger once per round per key title that flips the key; a key on an enemy shifts only when an effect says so and never to Stable. Effects `shiftKey` and `flipKey`.
- **Hollows.** A per-investigator `hollow` zone: effects set a card aside as a hollow (from hand, the top of the deck, the committed cards or play), return one to hand, and count them (with their copies) for the agendas that read "5 per investigator or more set-aside hollows".
- **UI.** The shadows row above the agenda, facedown mini-cards on locations with Expose as a fight, evade or investigate target, the hollow count on the player bar, Stable/Unstable keys on the investigator; strings in both locales.
- `ENGINE_VERSION` bump: saved scenarios restart, campaign logs are kept.

Not here: Patrol (`engine-generic-keywords`), civilians, targets and charges as named counters, double-faced enemy/story assets, locations in the shadows and mid-scenario interludes (`engine-scenario-structure`), the Bermuda and Congress grids (`engine-location-instances-grid`), time, the map and status reports (`engine-tsk-world-map`), the cards themselves (`campaign-the-scarlet-keys`, `player-cards-tsk`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: the shadows zone, concealed spawning, mini-card placement and exposure with its windows, keys attached to bearers with shift, the hollow zone.
- `campaign-flow`: a `bearers` log section, `setBearer` and `bearer`, keys attached at scenario start from the log.
- `card-content`: the `minicard` card type and the hand-written `minicards.json`, `concealed` and `shift` in the card record, `makeHollow`, `returnHollow`, `shiftKey`, `flipKey` and `exposeInstead` in the effect vocabulary, the `Concealed N` and `Shift` line rules for coverage.
- `game-table-ui`: the shadows area, mini-cards on locations, the expose targets, the hollow count.

## Impact

- `src/engine/world/constants.ts` (`ZONE.Shadows`, `ZONE.Hollow`), `src/engine/rules/enemies.ts` (`spawnHandler` conceals; hunter and movement skip the shadows), `src/engine/rules/skillTest.ts` (a mini-card as fight/evade target, `difficultyOf` = shroud, expose on success), `src/engine/effects/` (the expose-instead choice in `discoverClues`, `dealDamage`, automatic evade; the key and hollow ops), `src/engine/rules/cards.ts` (shift abilities, keys attached on enter play, set aside on leave), `src/engine/queries.ts` (nearest enemy with the shadows rule), `src/engine/steps/step.ts` (`Conceal`, `Expose`), `src/engine/api.ts` (verbs `conceal`, `expose`, `shiftKey`, `flipKey`, `makeHollow`; reads `hollows`, `inShadows`, `minicardsAt`).
- `src/engine/campaign/log.ts`, `flow.ts`, `src/content/schema.ts` (`LOG_SECTION_KINDS` + `bearers`, `setBearer`, `bearer`, `CardType` + `minicard`, `CardDef.concealed`, `CardDef.conceals`, `Ability.shift`), `src/content/loader.ts` (a pack's `minicards.json`), `src/content/implemented.ts` (line rules).
- `content/packs/tsk/minicards.json` (new, hand-written), `content/i18n/{en,ru}/ui.json`.
- `src/ui/game/optionHome.ts`, `src/ui/scene/` (shadows row, mini-card tokens), `src/ui/hud/PlayerBar` (hollows).
- `scripts/campaignFlow.ts`: `choose_bearer_of_*` compiled to `setBearer`; `scarlet_keys` leaves the unsupported list.
- Saves: `ENGINE_VERSION` bump.
