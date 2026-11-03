## Context

The Forgotten Age exists as `content/campaigns-generated/the-forgotten-age/` (campaign, flow with 27 unsupported steps, 10 scenario files) written by `scripts/import-campaigns.ts` (ADR-0007). The files carry the right encounter sets and resolution texts but placeholder token tables (−2/−3 everywhere), `connections: []` or invented pairs, and setups with no exploration deck, one copy per set-aside code, wrong start locations (Time-Wracked Woods for Heart of the Elders 1, City of the Serpents for The Depths of Yoth) and both faces of Mouth of K'n-yan as two locations. The card side is `content/packs/tfa/cards.generated.json` (seven packs, the vengeance field restored by `scenario-import-fixes`) with an empty `cards.json` and no `scripts/`.

What the engine has after the foundations: the exploration deck, Explore, supplies, vengeance, Poisoned, token X sources, counters and clue flips (`engine-tfa-supplies-vengeance-exploration`, ADR-0052, ADR-0053); several act decks, act and agenda backs that flip into another card type, story cards, location stacking, random setup ops and conditional token modifiers (`engine-scenario-structure`); per-instance connections (`engine-location-instances-grid`); seal (`engine-bless-curse`); typed hooks (`engine-script-registry`, ADR-0028) and the explicit script API (ADR-0034); `campaignNotes` by which a scenario hands `log:`, `count:` and `cards:` entries to the flow (ADR-0050); `putRandomIntoPlay`, `setAside` by copy, `remove`, `addChaosToken`.

In-force ADRs: 0001–0036, 0045, 0046, 0050, 0052, 0053, 0082, 0083; none superseded. 0007, 0011, 0012, 0013, 0015, 0025, 0028, 0034, 0050, 0052, 0053 constrain this design.

## Goals / Non-Goals

**Goals:** the 10 scenarios play to every printed resolution with the printed setups, token effects and connections; every card they use works; the log entries that come from the table come from the table (Yig's Fury, the Harbinger's damage, the jungle watches, the depth reached, the tasks completed, who was killed); coverage reports the campaign complete.

**Non-Goals:** the Return-to box (`campaign-return-to-the-forgotten-age`), Relics of the Past and Bad Blood (`campaign-side-*`), player cards other than the story assets (`player-cards-tfa`), the mechanics the foundation changes own, locales beyond en and ru, bot strategy beyond legal play and exploring.

## Diagram (C4-inspired, component level, ASCII; the browser app is the one container)

```
 content/campaigns/the-forgotten-age/                content/packs/tfa/
 +--------------------------------------------+     +------------------------------------------+
 | campaign.json (generated: false, packs)    |     | cards.generated.json (read-only,         |
 | flow.json (supply steps, computed Yig's    |     |   vengeance from the importer)           |
 |   Fury, interludes I-V, epilogue -> TBT)   |     | cards.json: 239 encounter cards + 9 story|
 | scenarios/<id>.json x10: buildExploration, |     |   assets; symbol/connectsTo per location |
 |   setAside by copy, pick, tokens x4,       |     | scripts/<code>.ts (~110: acts, agendas,  |
 |   connections, acts (3 decks), resolutions |     |   Harbinger, Yig, Padma, the story backs) |
 | scripts/<id>.ts x10 (scenario hooks)       |     +------------------------------------------+
 +--------------------------------------------+                       |
            | loadCampaign / db.scripts[scenarioId]                   | db.scripts[code], db.cards
            v                                                         v
 +-------------------------------------------------------------------------------------------------+
 | src/engine                                                                                       |
 |  index.ts createGame: setup steps -> exploration pile, Poisoned pool, supplies copy, act decks   |
 |  rules/scenario.ts: Explore step; vengeance -> victory; end: record.vengeance, supplies,         |
 |    campaignNotes (harbinger damage, depth, tasks, killed, jungle watches)                        |
 |  rules/enemies.ts: attack each at connecting (04086), keyword gain by condition, pursuit flag   |
 |  rules/investigators.ts: handSize modifiers, Body of a Yithian swap                              |
 |  effects/: eachInvestigator, dropDifficultyTest, stat per vengeance/doom/clues, cannotMove ...   |
 |  rules/tokens.ts: x vengeanceInVictory | locationsInPlay | explorationDeckSize | locationsWith  |
 |    Doom | doomOnLocations | scenarioCounter(depth); autoFail poisoned; instead (doom here)       |
 +-------------------------------------------------------------------------------------------------+
            | ScenarioRecord {xp, victory, vengeance, supplies} + campaignNotes
            v
 src/engine/campaign/flow.ts: buySupplies, checkSupply, crossOffSupply, count {value: vengeance},
   recordCards vengeanceInVictory, revealTokens (Interlude IV), replay counter, nextScenario TBT
```

## Decisions

1. **The campaign is moved to `content/campaigns/the-forgotten-age/` first, then fixed by hand.** `git mv`, `generated: false`, the importer's skip. Scenario scripts in `scripts/<scenario-id>.ts`, card scripts in `content/packs/tfa/scripts/<code>.ts`. _Alternative:_ sidecar fixes over generated files — rejected as in `campaign-the-dunwich-legacy`: every setup is wrong and the exploration decks are specific card lists the importer cannot derive.

2. **Exploration decks are setup data, symbols are card data.** Each scenario file's `buildExploration` lists the guide's cards and copies (Wilds p.18: 04069–04073 and one each of 04081, 04076, 04080, 04082, 04087; Eztli p.52: 04063–04067, 04092, 04094, 04088, 04089, 01167; Boundary p.119: 04174–04185, 04189, 04190, 04090, 04091; HotE 1 p.154: 04069–04073, 04217, 04215, 04221, 04081, 04082 plus `pick` one of 04074, 04075, 04218; HotE 2 p.164: the five K'n-yan locations not in play, 04215, 04228, 04094, 04088; Depths p.228: 04286 plus `pick` 4 of the remaining nine, rebuilt per depth by the script; Shattered p.263: 04327–04329, 04339, 04340, 01166; Turn Back Time as Eztli). `symbol` and `connectsTo` go on each location in `cards.json` from the scans, in the group of the first scenario using it (the Rainforest set in group 1, Eztli in 2, Tenochtitlán in 4, K'n-yan in 6, Yoth in 8, the Otherworld in 9). The guide's two placement maps (p.93, p.120) are a check on the transcription, not a source of pairs (ADR-0052).

3. **Three act decks in Threads of Fate.** `ScenarioDef.acts` becomes a list of decks (from `engine-scenario-structure`): deck 1 the a/b pair 04117a–04124, deck 2 c/d 04125a–04132, deck 3 e/f 04133a–04140, each trimmed to one version by `when` (relic custody from the log; the police choice as a flow input before the scenario; Ichtaca's tale from the log). The b-sides that are locations (04117b Eztli Exhibit, 04126b Arkham Police Station, 04128b Train Tracks, 04133b Black Cave), story assets (04118b Harlan, 04125b Henry, 04134b Maria) and enemies (04122b, 04130b, 04137b) flip into play through the structure change's verbs; each act's objective is a card script. Agendas 04114/04115 read "if only two act decks are in play" through the deck count.

4. **The Depths of Yoth's pursuit and depth as script over existing zones.** Enemies "in the pursuit area" are set aside with a `pursuit` flag (`flags.ts` family) keeping their damage; the depth level is the counter `depth` (token X `scenarioCounter`, conditions on it, clue values "X per investigator" where X is the depth read by a script); act 04285's back rebuilds the exploration deck from the set-aside Yoth locations and moves the investigators to a new random start; the scenario's end writes `count:tfa:depth` and the killed list. _Alternative:_ a `ZONE.Pursuit` — rejected: nothing reads it but this scenario's script, and the set-aside zone already keeps damage.

5. **Body of a Yithian is an investigator swap in `rules/investigators.ts`**: the investigator's card id is replaced by 04244's for the scenario (stats 4/4/4/4, health and sanity 7, no elder sign ability), the deck, hand and name kept; the end restores it. One engine hook, called by the scenario script's setup.

6. **The Harbinger of Valusia and the Relic travel through the log.** The Harbinger's damage is `count:tfa:harbinger_damage` written by Eztli's, HotE 2's, Depths' and Shattered Aeons' `ended` hooks (the agendas that spawn it read the count at setup), replacing the generated `campaign_data` prompts. The Relic of Ages versions (04061, 04191, 04303, 04343) are earned and removed by the flow's `earnCard`/`removeCard` as the resolutions say; Turn Back Time removes 04061 and sets aside its owner's 04303.

7. **Token tables are data.** Each scenario file's `tokens` carries the printed card's four difficulties with the X sources and `autoFail` from the engine change and the `instead` form from `engine-scenario-structure` (Eztli's skull −1/−3 with doom on your location, HotE's skull in a Cave, Shattered Aeons' skull with the Relic at your location, City's skull with 5+ cards in hand). Turn Back Time's card prints no cultist or tablet line; the file carries none and the campaign bag's tokens resolve as 0.

8. **The flow reads the table** (ADR-0050): Yig's Fury `count { value: "vengeance" }` after every scenario; "the jungle watches" `recordCards { source: vengeanceInVictory }`; Interlude IV's mishap table as a flow step `revealTokens { count: 1 | 2, pick: "lower", outcomes }` (new in `flow.ts`, one step, since it is a chaos draw outside a scenario); the Depths' "all killed" from `ScenarioFacts.defeated`; the conditional set gathering of The Boundary Beyond and Shattered Aeons as setup steps `when: { bagHas: { token, min } }` over the campaign bag; `eztli_replays` incremented by the replay step and read by Eztli's setup (`placeDoom` on the Entryway).

9. **`ENGINE_VERSION` bump.**

## Risks / Trade-offs

- [Symbols transcribed from scans] → the engine change's reachability check, plus a test per explored scenario that explores from the start to every location in the deck.
- [Threads of Fate's three decks and the act b-sides depend on `engine-scenario-structure`] → group 3 is ordered after it; groups 1 and 2 need only the TFA engine change.
- [The Depths of Yoth's pursuit as a flag could leak into other scenarios' set-aside logic] → the flag is read only by the Depths script and its agenda scripts; a test spawns a pursuit enemy with its damage kept.
- [Body of a Yithian touches investigator identity] → one swap function with a test that the deck and name survive and the stats change, and that the end restores the card.
- [About 110 card scripts] → one task group per scenario, each playable and coverable on its own; the shared sets land in groups 1 and 2.

## Migration Plan

Content and engine in one change; `ENGINE_VERSION` bump (a saved TFA scenario restarts, its campaign log kept). The generated folder is deleted and the importer skips the campaign. Rollback: revert; the importer regenerates the old files.

## Open Questions

- None open. No in-force ADR needs revisiting.
