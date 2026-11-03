## Context

`content/campaigns-generated/the-path-to-carcosa/` holds `campaign.json` (packs `core`, `ptc`), `flow.json` (compiled from ArkhamCards, ADR-0011) and 8 scenario files whose `setup` is `putIntoPlay`/`setAside`/`startAt` from the guide's layout grid, whose `tokens` are modifiers without effects, and whose `connections` are orthogonal grid neighbours. Night of the Zealot shows the hand-kept shape: `content/campaigns/night-of-the-zealot/scenarios/*.json` with `putRandomIntoPlay`, `spawn`, `remove` and `when: { logHas }` setup steps, token entries with `x`, `onReveal` and `onFail`, and `scripts/<scenario-id>.ts` exporting a `CardScript` with `hooks.checkObjectives` and friends (ADR-0028), importing only `src/engine/api.ts` (ADR-0034). Cards work through `content/packs/<pack>/cards.json` abilities or `scripts/<code>.ts` (ADR-0013 decides when a card counts).

What the engine has that these scenarios lean on: `putRandomIntoPlay`, `setAside`, campaign-log conditions in setup, `flags.connections` (`src/engine/world/flags.ts:130`, read by `queries.ts:connections`), `peril`, `enterCost` as a group clue cost (`rules/investigators.ts:430`), the `parley` designator (`schema.ts:960`, `round.ts:389`), `extraActionCost`, `scenarioFlag` conditions, `doomInPlay`, `succeededBy`, `searchEncounterDraw`, `forceResult` in `rules/skillTest.ts`, `skipScenario`/`nextScenario`, `count`/`cardChoice`/`crossOut`/`earnCard` flow effects, `logHas`/`logCount` flow conditions (`campaign/flow.ts:93`).

What it lacks, per the inspection report (`ptc.md` §2–4): the items in the proposal's vocabulary bullet, plus what the foundation changes bring: Hidden (`engine-generic-keywords`), two agenda decks, flipping and swapping double-sided cards, cards beneath the act or scenario card, story cards, random act versions, "would be defeated" replacements, conditional token modifiers (`engine-scenario-structure`), grid placement and per-instance connections (`engine-location-instances-grid`), the Midnight Masks subset and Return-to setup-card coverage (`scenario-import-fixes`), the play order with interludes (`campaign-flow-compiler-fixes`).

In-force ADRs: 0001–0036 (no `Supersedes` in `adr/`). 0007 (generated from the guides; the hand-written path stays open), 0011 (flow as a typed step language), 0012/0013 (coverage and what "works" means), 0025/0028/0034 (engine layers, script registry, script API), 0033 (deferred rules are typed step kinds).

## Goals / Non-Goals

**Goals:** every scenario of The Path to Carcosa plays from its printed setup to one of its printed resolutions with real tokens, on all four difficulties, for 1–4 investigators; every encounter card of the seven packs works; the flow asks the players only what the table can't tell; coverage reports the campaign complete.

**Non-Goals:** the Return-to box, Enthralling Encore, player cards and investigators (their changes); engine mechanics the foundation changes own; Time Warp; achievements; hot-seat secrecy of Hidden cards beyond what `engine-generic-keywords` gives.

## Diagram (C4-inspired, component level, ASCII; the engine is pure, the browser app the only container)

```
 content/campaigns/the-path-to-carcosa/ (moved from campaigns-generated, hand-kept)
   campaign.json  flow.json (order fixed upstream; none routes, logCompare, split XP here)
   scenarios/<id>.json  setup | tokens (4 difficulties) | connections | resolutions
   scripts/<id>.ts      8 scenario scripts: hooks.setup, checkObjectives, onActAdvance,
                        onAgendaAdvance, endOfRound, enemyPhase, record(...)
 content/packs/ptc/cards.json (252 encounter cards)   content/packs/ptc/scripts/<code>.ts
            |  abilities, token tables, setup ops              |  CardScript (api.ts only)
            v                                                  v
 +---------------------------------------------------------------------------------------+
 | src/engine                                                                            |
 |  rules/round.ts            rules/enemies.ts             rules/tokens.ts               |
 |  +----------------------+  +----------------------+     +-------------------------+   |
 |  | parley: cost {       |  | clues on enemies     |     | x: horrorOnYou,         |   |
 |  |  resources, discard, |  |  (clues table on any |     |  shroudOfYourLocation,  |   |
 |  |  actions}, then      |  |  entity, ADR-0024)   |     |  baseShroud..., highest |   |
 |  |  win("parleyed")     |  | takeControlOfClues   |     |  DoomOnEnemy/Agenda,    |   |
 |  | actAdvancedBy:       |  | enemy with no        |     |  doomOnEnemies/Agendas, |   |
 |  |  "clues"|"doom"|     |  |  location (zone      |     |  distanceFromStart; max |   |
 |  |  "script"            |  |  Enemy, loc: null)   |     | results: autoFailInstead|   |
 |  +----------------------+  | damageOnlyFrom       |     |  cancelCommittedSkills, |   |
 |  rules/investigators.ts    |  {traits|encounter}  |     |  moveEnemies toward,    |   |
 |  +----------------------+  | spawn from victory   |     |  enemyAttacksYou, lose  |   |
 |  | enterCost: flat      |  +----------------------+     |  Resources failedBy,    |   |
 |  | costModifier at      |  rules/scenario.ts            |  loseActions, placeDoom |   |
 |  |  location (hand)     |  +----------------------+     |  eachAgenda, clueFrom   |   |
 |  +----------------------+  | remembered flags     |     |  Bank                   |   |
 |  campaign/flow.ts          |  (set op + count)    |     +-------------------------+   |
 |  +----------------------+  | resetAgendaDeck      |                                   |
 |  | logCompare {a,b,op}  |  +----------------------+                                   |
 |  | removeAllChaosTokens |  queries.ts: cluesOn(entity), farthestFrom, nearestEnemy    |
 |  | xp split: "evenly"   |  api.ts: verbs for the above (ADR-0034)                     |
 |  +----------------------+                                                             |
 +---------------------------------------------------------------------------------------+
            |  PendingChoice {promptKey "prompt.parley.*", "prompt.ptc.*"}
            v
 src/ui (unchanged; strings in content/i18n/{en,ru}/ui.json)
```

## Decisions

1. **The campaign moves to `content/campaigns/` first and is hand-kept.** Generated files are never edited by hand (AGENTS.md, ADR-0006/0007), and every scenario file needs edits in every field. The move is task 1, after `campaign-flow-compiler-fixes` and `scenario-import-fixes` have regenerated the folder, so the moved copy starts from the fixed order and subset. `campaign.json` loses `generated`; `check:content` validates it like Night of the Zealot's. _Alternative:_ an overrides file merged by the import — rejected: a new pattern, and the program (step 7) and ADR-0007's follow-up already name the move. _Cost:_ a later import can't refresh PtC's text or flow; the i18n import still attaches by `i18nId`.

2. **One scenario script per scenario, one card script per card code, shared sets in data.** `scripts/<scenario-id>.ts` holds what belongs to the scenario (setup branches the data can't say, objectives, agenda backs, end-of-round rules, recorded log keys). `content/packs/ptc/scripts/<code>.ts` holds cards whose text no vocabulary entry covers (the report's "Need a script" lists). Everything the vocabulary covers, including the shared sets (Delusions, Hauntings, Cult of the Yellow Sign, Evil Portents, Hastur's Gift, Decay, The Stranger, Inhabitants of Carcosa, Byakhee), goes in `cards.json`, so ADR-0013 counts it and the Return-to change reuses it. _Alternative:_ one script per encounter set — rejected: the registry is by code (ADR-0028).

3. **Small generic vocabulary lands here, as `nat-pack-cards` did.** PtC has no cycle engine change; the mechanics that only this cycle needs now but others will reuse (parley costs and window, clues on enemies, location cost modifier, flat enter cost, enemy at no location, damage-source restriction, act-advance cause, remembered flags, the token sources and results) are added where their family lives (`effects/tokens.ts`, `effects/placement.ts`, `rules/round.ts`, `rules/enemies.ts`, `rules/tokens.ts`), each with a schema entry, an `EFFECT_OPS` line and a unit test, and each used by at least two cards or one card nothing else can express. Big mechanics stay with their foundation change: BSR's two agenda decks, Last King's Sickening Reality flip-and-swap, Oath's pile beneath the act, Dim Carcosa's story flips and sanity rule (`engine-scenario-structure`); Hidden (`engine-generic-keywords`); the catacombs grid (`engine-location-instances-grid`). Their scripts here call the verbs those changes add.

4. **Clues on enemies and assets reuse the clues table.** ADR-0024 gives every entity fact its own table; `clues` is read for locations today. Fanatic, Agent of the King, The King's Edict, Seeker of Carcosa, Echoes' agendas and the Bystanders put clues on enemies and assets, so `cluesOn(game, id)` reads the same table for any entity, `placeClues`/`moveClues` take an entity target, and `takeControlOfClues { from }` moves them to an investigator. The Echoes agendas count `doomOnEnemies` after the clue→doom flip. _Alternative:_ a per-card counter flag — rejected: the token X sources and the UI's clue display both read the clues table.

5. **Parley is an action with a cost and a window.** `Ability.action: "parley"` exists; `Cost` gains `resources { min }` gates, `discardFromHand { n }`, `actions: 2`, `noTest: true`, and `performActionHandler` opens `win("parleyed", { inv, card })` after a parley resolves (Ballroom, Living Room, Return to's Dianne). `extraActionCost` already takes a designator (Tough Crowd). _Alternative:_ a trigger `afterParley` per card — rejected: windows are the one trigger mechanism (ADR-0014's pattern).

6. **Token tables are data with the new sources and results.** `TokenEffect.x` gains the eight sources; `xMax` caps (Phantom skull max 5, Pallid Mask skull max 5); conditional modifiers ("−3 instead if ≥3 horror", "−4 if no sanity") use `engine-scenario-structure`'s `modifierIf`; `onReveal`/`onFail` gain the results listed in the diagram; "automatically fail instead" is `forceResult` (`rules/skillTest.ts`) exposed as a token result; the Oath elder thing's choice is `chooseOne` over two results. Each table is written for Easy/Standard and Hard/Expert exactly as the reference card's front and back read (`ptc.md` §4 tables), so `tokensReal` passes.

7. **The scenario records what the guide asks the players.** Where the flow holds a `chooseOne`, `cardChoice` or `counter` whose answer the table knows — which act 2 Curtain Call played, the Bystanders interviewed and the VIPs slain, Sebastien in the victory display, Daniel's state, The Pallid Mask's act 2 objective, the possessed investigators, Last King's clues on the act — the scenario script writes the log key (`record`/`setData`/`recordCards` through the resolution's data) and the flow step is dropped from `flow.json`. The flow keeps the questions only the players can answer (reading Act II of the Pallid Mask, the Clasp's new bearer). This is ADR-0050. _Alternative:_ keep the prompts — rejected: a player answering wrong desynchronises the log from the game, and online play would ask one client what every client knows.

8. **Flow conditions and effects.** `campaign/flow.ts` gains `logCompare { a, b, op }` over two count sections (Doubt vs Conviction: Phantom setup, Dim Carcosa act 2 and R4/R5, BSR `none`), `removeAllChaosTokens { token }`, and `xp { split: "evenly", amount: "input" }` for Last King's 1 XP per 2 clues. The `none` resolutions are written by hand in the moved `flow.json` (Echoes → R4's steps; BSR → R3's; Dim Carcosa → `logCompare` to R4 or R5; Last King → R1's steps if anyone resigned, else R2's; Oath → insanity for each defeated investigator, campaign lost if all, else R1's). If `campaign-flow-compiler-fixes` compiles `math` to `logCompare` first, the hand-written branches are what it generates.

9. **Connections.** Read from the guide's Suggested Location Placement maps (`inspired/AHC_CYOA-main/03 The Path to Carcosa.pdf` pp. 16, 27, 47, 70, 133, 164, 180; every arrow is two-way, so each `oneWay` list stays empty) into each scenario's `connections` by card code, the map's symbols matched to cards by the icon on each scan (`inspired/CARDS_ru/Локации`); the maps differ from the report's memory in Dim Carcosa (the Palace links only to Dim Streets and Ruins; Depths and Bleak Plains link to those two, not to the Palace) and Black Stars Rise (Outer Wall–North Tower); locations with random versions (Phantom's three pairs, BSR's four, Dim Carcosa's four, Oath's halls) list every version so the slot keeps its edges; doorways, Chœur Gothique, Hidden Library and the set-aside towers are added by script when they enter play (`flags.connections`). The Pallid Mask has no static list: adjacency comes from the grid (`engine-location-instances-grid`). Echoes' floors and Passageways are trait-based connections the script computes each time a location is revealed or Peabody readies.

10. **Setup.** Data where the ops exist (`putRandomIntoPlay` per floor pool, `setAside`, `spawn … when`, `startAt … when { logHas }`, `addChaosToken` for Oath's and BSR's difficulty tokens); a `script` setup step for the rest: Curtain Call's doorway pools and Lola at Backstage, Last King's Bystanders with 1 + 1 per investigator clues and the Sickening Reality pile, Echoes' Seekers by player count, Oath's two piles, Phantom's dreams and Lost Soul, Pallid Mask's catacombs deck, BSR's Flood/Vortex pick and weaknesses, Dim Carcosa's doom by tallies and half-sanity horror. MitPM and the Clasp bearer checks are one shared function in `scripts/shared.ts` (a module beside the scripts, importing only `api.ts`).

11. **Tests.** Per scenario a `src/engine/__tests__/ptc-<scenario>.test.ts` after `brethren.test.ts`: `start(id, invs, seed, { campaignLog })` with `testkit`, then `pick`/`mutate` through the printed path to each resolution and the `none` route; a bot playthrough per scenario on Standard in `generated.test.ts`'s style to a resolution. Card tests per set in `ptcCards.test.ts`.

12. **`ENGINE_VERSION` +1.** New steps and prompts; saves in progress restart, campaign kept.

## Risks / Trade-offs

- [The guide's maps show in-play locations only] → set-aside locations (doorways, Chœur Gothique, the towers, the Patient Confinements, Hidden Library) take their links from their card icons when they enter play; the test asserts the map from the data.
- [Eight scenario scripts the size of Brethren of Ash or larger, Dim Carcosa and The Last King biggest] → shared helpers in `scripts/shared.ts`; each scenario is its own task group and lands on its own.
- [The move forks PtC from the import] → the i18n import still attaches by `i18nId`; a later guide fix is applied by hand, as for Night of the Zealot.
- [Vocabulary creep] → each addition is listed in the spec with the cards that need it; a card nothing else needs gets a script.
- [The foundation changes may land with different verb names] → the scripts here are written after them; the tasks name the mechanic, not the verb.

## Migration Plan

Content and engine in one change; `ENGINE_VERSION` +1. Rollback: revert; the generated folder returns with the import.

## Open Questions

- Echoes of the Past: the guide (p.46) gathers Dark Cult, and `pentagram` is the set code the core Dark Cult cards carry in `content/packs/core/cards.generated.json` (Acolyte, Wizard of the Order). They are the same set, confirmed.
- The Last King R3: the guide crosses off each interviewed VIP; ArkhamCards' R3 is R2 without the cross-off. Followed the guide.
- Echoes `none`: the guide sends to R4; ArkhamCards leaves it empty. Followed the guide.
- Dim Carcosa R4/R5 and BSR R3 end with "each investigator is driven insane". The flow records each investigator as insane, with mental trauma equal to their sanity, before `end: lose`, so the lost campaign's log shows it (user decision).
- Black Stars Rise's map (p.164) draws a four-way arrow in the centre of Grand Rue, Outer Wall, North Tower and Broken Steps; it joins both opposite pairs of the diamond. With the four sides, Grand Rue, Outer Wall, North Tower and Broken Steps are each connected to each other, so the reading doesn't depend on which symbol is which location. Confirmed against the map.
- `inspired/AHC_CYOA-main/` has no "OV" (fan variant) copy of The Path to Carcosa; nothing to exclude.
- If `campaign-flow-compiler-fixes` does not take `math` → `logCompare`, decision 8 adds the condition here; either way the moved `flow.json` carries it.
