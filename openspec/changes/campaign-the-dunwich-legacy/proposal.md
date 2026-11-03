## Why

The Dunwich Legacy is the first cycle after Night of the Zealot and the first campaign the generated files cannot carry: its 8 scenarios use 235 cards of which 16 work (all from the core set), 0 of 8 have real token effects, 0 of 8 have a scenario script, and every generated scenario file is wrong on setup, location connections or its act and agenda decks (inspection report `dwl.md`, sections 1 and 4). Once the foundations land (`engine-scenario-structure`, `engine-generic-keywords`, `engine-location-instances-grid`, `campaign-flow-compiler-fixes`, `scenario-import-fixes`, `engine-script-registry`) the campaign is the first proof that a whole cycle plays to its resolutions.

## What Changes

- **The campaign becomes hand-written.** `content/campaigns-generated/the-dunwich-legacy/` moves to `content/campaigns/the-dunwich-legacy/` (`generated: false`): `campaign.json`, `flow.json`, 8 scenario files and `scripts/<scenario-id>.ts`, as Night of the Zealot is laid out. The importer no longer writes it (program step 7).
- **Every scenario plays as printed**, in play order: Extracurricular Activity, The House Always Wins, The Miskatonic Museum, The Essex County Express, Blood on the Altar, Undimensioned and Unseen, Where Doom Awaits, Lost in Time and Space. Per scenario: setup as the campaign guide and the setup card say (random copies, versions by campaign log, cards beneath locations, the Exhibit deck, the train line, the potential sacrifices, the Brood count, difficulty tokens added for the campaign), the chaos token table of all four difficulties from the printed scenario card (02041, 02062, 02118, 02159, 02195, 02236, 02274, 02311), location connections transcribed from the card scans, a scenario script, and resolutions that end where the guide says.
- **Every encounter card the 8 scenarios use works**: the 293 non-core cards of the dwl, tmm, tece, bota, uau, wda and litas sets (shared sets once: Sorcery, The Beyond, Bishop's Thralls, Whippoorwills, Bad Luck, Naomi's Crew, Hideous Abominations, Beast Thralls, Dunwich, Striking Fear, Chilling Cold, Agents of Yog-Sothoth), in data in `content/packs/dwl/cards.json` where the vocabulary fits and in `content/packs/dwl/scripts/<code>.ts` otherwise. The 15 neutral story assets coverage counts on the player side (02040, 02059, 02060, 02061, 02079, 02080, 02138, 02139, 02140, 02179, 02215, 02217, 02218, 02219, 02254) are done here, in their scenario's group, not in `player-cards-dwl`.
- **Vocabulary this campaign needs that no foundation change owns**, added in the first scenario group that needs it: `discardDeckTop` (fixed, or per point failed), `loseActions` and `endTurn`, `enemyAttack` (the triggering or named enemy attacks you, or each investigator at a location), `revealToken` (reveal a chaos token and branch on it), a move-cost hook (`moveCost`, `cannotLeave`), the token `x` values `agendaStage`, `locationsWithoutCardBeneath`, `broodInPlay`, `extradimensionalLocations`, `yourLocationShroud`, `discardedPrintedCost`, and conditional modifiers (`-1`, `-3` instead when a condition holds); `TokenEffect.onSuccess`, `autoFailInstead`, `payToZero`, `cancelCommitted`; the spawn values "location with the most clues", "farthest location from you", "the location to your right", "nearest Altered location", "any Extradimensional location"; an `InvTarget` "each investigator at the attached location" and "each investigator at a location with a trait"; `Amount` "clues on the enemy"; flags `cannotGainResourcesWhileEngaged`, `cannotMoveWhileEngaged`, `noResourcesHere`, `noCommits`, `noAttackOfOpportunity`; a fight restricted to one card (`onlyAttackableBy`, the Brood); clues placed on an enemy.
- **The flow is corrected by hand** in the moved `flow.json`: `the-house-always-wins.none`, `undimensioned-and-unseen.none` go to R1, `where-doom-awaits.none` to R2; Essex's and Lost in Time and Space's Investigator Defeat (Across Space and Time per defeated investigator, 1 bonus XP, `necronomicon_stolen` if they held 02140; each defeated investigator killed); `brood_escaped`, the sacrificed names, "cheated" and the act reached come from the scenario (the script's campaign notes), not from a question; the Museum's hidden tablet token and the Essex and Where Doom Awaits difficulty tokens change the campaign's bag; the intro choice of Undimensioned and Unseen records `calmed_townsfolk` or `warned_townsfolk`, which the epilogue reads.
- **Coverage**: `the-dunwich-legacy` and each of its 8 scenarios reported complete; `docs/campaign-program.md` rows dwl, tmm, tece, bota, uau, wda, litas at 0 encounter cards left (player columns stay for `player-cards-dwl`); the dwl token tables count as real only when every conditional `x` is one the engine computes.
- `ENGINE_VERSION` bump: a saved scenario in progress restarts, campaign logs kept.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: The Dunwich Legacy playable to every resolution (setup, token tables, connections, flow) as a hand-written campaign.
- `card-content`: the encounter vocabulary above; every card of the Dunwich Legacy's 8 scenarios declared.
- `game-engine`: chaos token effects beyond a modifier (on success, automatic failure instead, pay to treat as 0, cancel committed cards, an enemy attacks you, `x` from the game state); effects on the deck, the turn and movement (`discardDeckTop`, `loseActions`, `endTurn`, `enemyAttack`, `revealToken`, move costs).
- `content-coverage`: the campaign and its scenarios complete; conditional token lines real only when computed.

## Impact

- `content/campaigns/the-dunwich-legacy/` (new, moved: `campaign.json`, `flow.json`, `scenarios/*.json`, `scripts/*.ts`), `content/campaigns-generated/the-dunwich-legacy/` (removed), `scripts/import-campaigns.ts` (skips a campaign that exists under `content/campaigns/`, as for Night of the Zealot).
- `content/packs/dwl/cards.json` (293 cards), `content/packs/dwl/scripts/<code>.ts` (about 120 scripts, see tasks), `content/i18n/{en,ru}/ui.json` (ability labels `ability.<code>.<n>`, prompt keys).
- `src/content/schema.ts`, `src/content/implemented.ts` (`spawnResolves`, `tokensReal` for conditional `x`), `src/engine/effects/` (new ops), `src/engine/rules/tokens.ts`, `rules/enemies.ts`, `rules/round.ts`, `movement.ts` (move cost), `world/flags.ts`, `src/engine/campaign/flow.ts` (campaign notes for counts and card lists).
- `content/coverage.json`, `docs/campaign-program.md`; `ENGINE_VERSION`.
- Depends on: `engine-scenario-structure` (location removal and the void, locations in the encounter deck, cards beneath locations and the agenda, several act versions, flipping a location back, random setup ops, story cards, "would be defeated"), `engine-location-instances-grid` (connections per instance: the train line, 4 copies of 02324), `engine-script-registry` (hooks at the end of the enemy phase, a location leaving play, an enemy entering play, "the agenda advances instead"), `campaign-flow-compiler-fixes`, `scenario-import-fixes`. Followed by `campaign-return-to-the-dunwich-legacy`, `campaign-side-read-or-die`, `campaign-side-all-or-nothing`; `player-cards-dwl` runs in parallel after group 1 lands.

## Decided (assumed)

Grill-me run against the report and the code; the user was not available.

- Hand-written move at the start, not the end: the generated files are wrong in every scenario and the importer would overwrite hand fixes (program step 7; the Night of the Zealot layout exists).
- Scenario scripts are the campaign's (`content/campaigns/the-dunwich-legacy/scripts/`), card scripts the pack's (`content/packs/dwl/scripts/`), as today; a card used by two scenarios has one script.
- Generic vocabulary is added in this change where it is first needed, as `nat-pack-cards` did; cycle mechanics stay in `engine-scenario-structure`.
- Story assets with a neutral faction are done with their scenario.
- Connections follow the card scans in the report; the guide's grid is not a source.
- One change for the whole campaign, one task group per scenario (user decision).

## Decided (user)

- **Blood on the Altar has two one-way connections, as printed.** The suggested placement map in `inspired/AHC_CYOA-main/02 The Dunwich Legacy OV.pdf` (p. 69) draws them as one-way arrows, and it matches the scan reading in the report node for node. Congregational Church → Village Commons and Village Commons → Osborn's General Store are one-way, in the scenario's `oneWay` list, which `queries.ts connections()` already reads. Every other pair is two-way.
- **The Exhibit deck is a face-down location side deck.** It holds the 6 Exhibit Halls, unrevealed side up. Setup shuffles the Restricted Hall with 2 random halls as the bottom 3, and puts the other 3 on top in random order (the campaign guide's Miskatonic Museum setup). The Museum Halls action (02127: spend 1 clue per investigator, as a group) puts the top card into play unrevealed.
- **Undimensioned and Unseen's weakness is for the campaign.** Each investigator gets a random basic weakness with the Madness, Injury or Pact trait, kept for the rest of the campaign, as the guide says (p. 99). The pool is every basic weakness the app has, so Pact weaknesses from later cycles count.
- **The guide's fan-made Optional Variant is out of scope.** The OV PDF adds it on pp. 138–143: two groups play Extracurricular Activity and The House Always Wins at the same time. Fan content is excluded.
