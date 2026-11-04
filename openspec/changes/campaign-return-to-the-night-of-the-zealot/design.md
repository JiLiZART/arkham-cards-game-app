## Context

Night of the Zealot is hand-written: `content/campaigns/night-of-the-zealot/` holds `campaign.json` (log labels, sections, chaos bags, `cards` per scenario), an empty `flow.json`, three scenario files whose `setup`, `sideDecks`, `randomEncounterSet`, `connections`, `oneWay`, `tokens` and `resolutions` are the whole scenario, and three scripts (`the-gathering.ts` advances act 3 on the Ghoul Priest's defeat; `the-midnight-masks.ts` redirects the Ghoul Priest to Your House and advances the act at 6 unique Cultists; `the-devourer-below.ts`). The core pack's `cards.json` and `scripts/` hold its 79 encounter cards; coverage reports it complete.

Return to the Night of the Zealot is generated (`content/campaigns-generated/return-to-the-night-of-the-zealot/`, ADR-0007) from ArkhamCards' `rtnotz` guide, and wrong in setup, connections, resolutions and log keys (report `notz-return.md`). The box's 38 encounter cards sit in `content/packs/return/cards.generated.json`; `content/packs/return/cards.json` holds one card of another box (51008). The Return scenarios keep the base reference card (`card: "01104"` and so on), so their token tables are real already; the three setup cards (50011, 50025, 50032a) are counted as second scenario cards no scenario names.

What the engine has that the cards lean on: setup ops `putIntoPlay`, `putRandomIntoPlay`, `setAside`, `remove`, `startAt`, `spawn`, `shuffleIntoEncounter`, `placeDoomOnAgenda`, `addChaosToken`, `discardRandomFromHands`, `script`; the `spawnRedirect` scenario hook (`rules/enemies.ts`) and `preyCandidates()`; `ModFlag`s with scopes (`damageCapOne`, `nonEliteCannotMoveInto`); token entries with `revealAnother` (`rules/skillTest.ts`); `searchEncounterDraw`, `discardFromHand {random}`, `perPointFailed`, `addSelfToVictory`, `enemyHealth perInvestigator`, `attachedTo` (`movement.ts`); scripts found through the registry (ADR-0028) and run through the adapter (ADR-0027) with the script API (ADR-0034); tests through the testkit and the scenario driver (ADR-0029).

Shared pieces this change uses but does not define: the "after you reveal this location" trigger and the random setup ops (`engine-scenario-structure`); `ScenarioDef.setupCards`, the `compose()` of scenario hooks in `src/engine/api.ts`, `tokensReal` counting a setup card without token lines as real, and `CampaignDef.options` with `replaceSets` (`scenario-import-fixes`, decisions 9 to 11, ADR-0038). The three base NotZ fixes (elder thing token, Lita for a killed lead, `01109.ts` Hallway by name) are a plain bug fix that lands first.

In-force ADRs: 0001–0036, none superseded. 0007 (generated from the guides) allows hand-written files to replace generated ones; 0011 (flow as typed steps) is honoured by an empty flow with resolutions in the scenario files, as base; 0012/0013 decide when the box counts; 0015 settles rules questions; 0025 and 0028 place the new ops and hooks; 0034 bounds what the card scripts may import.

## Goals / Non-Goals

**Goals:** the three Return scenarios set up as their cards say, play to every resolution with the base log, and are reported complete; every rtnotz encounter card works; Night of the Zealot offers the replacement-sets option.

**Non-Goals:** the 10 player cards (`player-cards-notz-return`); By the Book and the `return_cult` cards' optional use there (`campaign-side-by-the-book`); the base NotZ bug fixes and the base Devourer Below connection edges (findings, not changed here); the reveal trigger and random setup ops; `setupCards`, composition and options themselves; the bookmark's mixed-sets variant; connections per location instance (`engine-location-instances-grid`: every Return variant has its own code, so by-code connections suffice here).

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container, the engine is pure)

```
 content/campaigns/night-of-the-zealot/                       content/packs/return/
 +------------------------------------------------------+     +------------------------------------------+
 | campaign.json  options: [rtnotz-replacement-sets     |     | cards.json      38 rtnotz encounter cards|
 |   {replaceSets: {ghouls_of_umôrdhoth: ghouls,        |     |                 (abilities, spawn lists, |
 |                  the_devourers_cult: pentagram}}]     |     |                  flags, prey)            |
 | scripts/<id>.ts  export hooks (setup, actAdvance...) |     | scripts/<code>.ts  14 card scripts       |
 +------------------------------------------------------+     |   (50012 50013 50016 50024 50028 50030   |
            | import { hooks as base }                         |    50031 50032b 50037 50039 50040 50041  |
            v                                                  |    50042 50043)                          |
 content/campaigns/return-to-the-night-of-the-zealot/          +------------------------------------------+
 +------------------------------------------------------+                    | import only src/engine/api.ts
 | campaign.json  logLabels/logSections = base; packs    |                    |
 |   [core, return]; i18nId rtnotz; generated absent     |                    |
 | flow.json      {}                                     |                    |
 | scenarios/return-to-<id>.json                         |                    |
 |   card = base card, setupCards [50011|50025|50032a]   |                    |
 |   acts/agendas full, setup ops incl. random ops,      |                    |
 |   sideDecks, randomEncounterSet, connections (scans), |                    |
 |   tokens = base table, resolutions = base             |                    |
 | scripts/return-to-<id>.ts = compose(base, returnTo)   |                    |
 +------------------------------------------------------+                    |
            | zod: src/content/schema.ts (CardDef.spawn: string|string[], flags cannotDrawAction /     |
            |      cannotParley, scopes, ops, conditions)                                                |
            v                                                                                            v
 +-------------------------------------------------------------------------------------------------------+
 | src/engine                                                                                            |
 |  index.ts createGame: options.replaceSets swap sets; setup ops (random ops from engine-scenario-      |
 |    structure); rules/scenario.ts objectives (returnTo hook first, then base)                          |
 |  rules/enemies.ts    spawn over a list; preyCandidates nearestTo; cannotParley at/connecting          |
 |  rules/round.ts      actionsFor: no draw under cannotDrawAction; endTurn op clears actions            |
 |  rules/skillTest.ts  revealAnotherToken op sets revealAnother once per test                           |
 |  effects/            gainClues (pool), addUses {target, type}, endTurn, revealAnotherToken            |
 +-------------------------------------------------------------------------------------------------------+
            |
            v
 src/content/implemented.ts tokensReal (setup card without lines is real) -> coverage.ts -> coverage.json
```

## Decisions

1. **Hand-written over base, generated folder removed.** The scenario files start as copies of the base files with the Return edits applied by hand; `campaign.json` keeps the base `logLabels`, `logSections`, `chaosBags` and `prologue` structure with `i18nId: "rtnotz"`, `packs: ["core", "return"]`, `card: "50011"` and `cover` as today; `flow.json` is `{}`. `scripts/import-campaigns.ts` skips a hand-written folder of the same id, so the generated one is deleted and never comes back. _Alternative:_ fix the generated JSON in place — rejected: every file disagrees with base in setup, keys and resolutions, and base is the tested reference.

2. **Each scenario file carries both cards.** `card` stays the base scenario card (token table, tile art); `setupCards: ["50011"]` and so on. The token table is copied from the base file so the file is complete on its own (ADR-0013 measures the file). This is `scenario-import-fixes`' `setupCards` (ADR-0038), used unchanged.

3. **Setup in data, random choices through `engine-scenario-structure`'s ops.** RtG: `putIntoPlay 50013`; one of `[01113, 50018]` and one of `[01114, 50020]` set aside at random with the rest removed; `setAside [50017, 01115, 50019, 50021, 01116, 01117]`; `remove [01108, 01111, 01112]`; `startAt 50013`. RtMM: agenda 1 at random from `[01121a, 50026a]` with the chosen card's back set aside; the six `putRandomIntoPlay` pairs; `putIntoPlay [01133, 01128, 01124]`; `sideDecks {cultists: [cultists, return_cult]}` with 3 removed at random; `spawn 50041` at Southside, Downtown and the Graveyard by player count; the base `remove`/`startAt`/`shuffleIntoEncounter` lines unchanged. RtDB: `putIntoPlay 01149`; `putRandomIntoPlay 4 of [01150–01155, 50033–50036]`; `setAside [01156, 01157]`; 50032b attached to the set-aside 01157; the base doom, discard and Ghoul Priest lines. The exact op names are `engine-scenario-structure`'s. _Alternative:_ a `setup` script hook per scenario, as Brethren of Ash's `smoke-and-mirrors.ts` does — rejected: five Return boxes would each write the same random choices in code.

4. **The scenario scripts compose the base scripts.** `return-to-the-gathering.ts` imports `the-gathering.ts`'s hooks: the act-3 advance on the Ghoul Priest stays; the Hallway handling in `01109.ts` finds the Hallway by name (the bug fix), so act 2 works with 50017. `return-to-the-midnight-masks.ts` keeps the Ghoul Priest redirect and the 6-Cultist act advance. `return-to-the-devourer-below.ts` keeps the base and adds an `enemyEntersPlay` hook for Umôrdhoth (01157) that places 1 resource on the attached Vault per act left in the act deck. The base scripts export their hooks object; each Return script is `compose(base, returnTo)` from `src/engine/api.ts` (`scenario-import-fixes`).

5. **Flags with a location scope for the two bans.** `cannotDrawAction` (scope `investigatorsAtLocation`, on 50014 Guest Hall as a constant modifier) is read by `actionsFor` in `rules/round.ts` when the draw option is built; `cannotParley` (scope `enemiesAtOrConnectingLocation`, filter `{trait: Cultist}`, on 50026b Narôgath) is read where parley abilities are offered. _Alternative:_ scripts — rejected: a location that forbids an action to those on or beside it recurs in later boxes, and a flag reads like the card.

6. **Small vocabulary, each at the place it is decided.** `CardDef.spawn: string | string[]` with `spawnResolves` and the spawn step taking the first location in play (50044; later boxes have the same "Otherwise" line). `prey: { nearestTo: CardFilter }` in `preyCandidates()` (50026b). `revealAnotherToken` op, limit `per: "test"`, setting the `revealAnother` that token entries set in `rules/skillTest.ts` (50034, 50036). `endTurn` op in `effects/` (50016). `damageCapOne` gains scope `enemiesAtLocation` (50035). `gainClues {amount}` from the pool (50029). `addUses {amount, type: [supply, ammo], target: chooseControlled}` (50027). Conditions `leadInvestigator` (50013's two-action draw) and `agendaStage {min}` (50041). Each op is one case in the existing switch of its file, with a unit test.

7. **Scripts where the vocabulary ends**, in `content/packs/return/scripts/`, importing from `src/engine/api.ts` only: 50012 (group spend restricted to the Guest Hall; the back's move, reveal and willpower test), 50013 (two-action lead draw, and the `spawnRedirect` hook that brings a not-in-play location into play), 50016 (token-kind check then `endTurn`), 50024 (branch on hand size per investigator), 50028 (move to any Arkham location), 50030 (discard a card with X willpower icons, remove X doom), 50031 (horror to those with 2+ clues, else doom that can advance), 50032b (Vault: cannot leave play, Umôrdhoth's health and fight by its resources), 50037 (discard, kill the empty-handed, heal each enemy 1), 50039 (cannot be evaded while its engaged investigator has no cards), 50040 (willpower 3, discards then damage for the shortfall), 50041 (doom or clue, both after agenda 1), 50042 (enemy-phase move toward Rivertown or the Main Path, else its doom to the agenda), 50043 (attach to the farthest Cultist, +2 health, Retaliate or Aloof by uniqueness). Data covers the rest: 50015, 50017–50021 (the reveal trigger plus `perPointFailed`, `discardFromHand`, `searchEncounterDraw`), 50026a (as 01121a), 50026b, 50027, 50029, 50033–50036, 50038, 50044–50046.

8. **Connections from the cards and the guide.** RtG (scans of 50013–50021, all symmetric, so no `oneWay`): 50014–50013, 50014–50015, 50014–50016, 50014–50017, 50017–01113, 50017–50018, 50017–01114, 50017–50020, 50017–01115, 50018–50019, 50020–50021. RtMM: the base 19 edges, which the guide's placement image (page 23 of `01 Night of the Zealot.pdf`) confirms, with each Return variant given the edges of the location it replaces (the scans of 50027–50030 print the same symbols as 01132, 01134, 01129, 01125). RtDB (scans): Main Path 01149 to every woods and to Ritual Site 01156; the Ritual Site to the Main Path only; woods to their printed partners (50033–50034, 50035–50036; the base woods a ring 01150–01152–01151–01154–01155–01153–01150, read off their scans). The base file's Ritual-Site-to-woods edges and its missing ring are a finding for the base campaign.

9. **The replacement-sets option on Night of the Zealot.** `content/campaigns/night-of-the-zealot/campaign.json` declares `options: [{ id: "rtnotz-replacement-sets", labelKey: "campaign.option.rtnotz-replacement-sets", replaceSets: { "ghouls_of_umôrdhoth": "ghouls", "the_devourers_cult": "pentagram" } }]`; the mechanism (state, menu toggle, set swap at setup) is `scenario-import-fixes`'. `return_cult` is not a replacement: the bookmark says the cultist deck draws from both sets.

10. **Translations.** `content/i18n/ru/campaign-texts/return-to-the-night-of-the-zealot.json` is regenerated by `pnpm import:i18n` from the `rtnotz` guide for names, intros and resolutions; its log labels are keyed by the base camelCase keys. New ability labels, script prompts and the option label get `ui.json` keys in `en` and `ru`.

11. **`ENGINE_VERSION` bump**, as every rules change: saved scenarios restart, campaign logs are kept.

## Risks / Trade-offs

- [`engine-scenario-structure` names its ops differently from decision 3] → the scenario files are written against what lands; the `setup` hook stays the fallback, a local change to three files.
- [The `01109.ts` Hallway lookup and the base fixes land late] → RtG's act 2 test fails until they do; the dependency is stated in the tasks.
- [Scripts in `content/packs/return/` for a pack that also holds the other four Return boxes] → scripts are keyed by card code, as the core pack's; nothing collides.
- [Connections transcribed from scans by eye] → the RtG tree and the woods ring are each one test (every move option from each location); a mis-read symbol fails it.

## Migration Plan

Content and engine in one change: the generated folder is deleted and the hand-written one added in the same commit so the campaign list never lacks the campaign; `ENGINE_VERSION` bump. Rollback: revert the commit (the importer regenerates the old folder).

## Open Questions

- None. The bookmark's "shuffle old and new sets together" variant is not offered (user decision).
- No in-force ADR needs revisiting; the shared pieces follow `scenario-import-fixes` (ADR-0038).
