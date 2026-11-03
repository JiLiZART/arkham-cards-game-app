## Context

`content/campaigns-generated/side-war-of-the-outer-gods/` holds a one-scenario campaign generated from ArkhamCards' `side` guide (ADR-0007): `campaign.json` with the Night of the Zealot chaos bags, `flow.json` (37 steps, including the leaked Fortune and Folly checkpoint), and `scenarios/war-of-the-outer-gods.json` with acts `86011–86013`, the blue agendas only (`86002–86004`), no start location, no set-asides, and the Hub connected to every location. `content/packs/side/cards.json` is `{}`; 0 of 58 `wog` cards work (`inspect/sides.md` §4.6).

What the engine offers today: one agenda (`game.s.agenda`, `rules/scenario.ts` `advanceAgendaHandler`/`nextAgenda`), `healthPerInvestigator` on enemies (`schema.ts:1049`), `flags.beneath` (one card per location) and `flags.underAct` (`world/flags.ts:89,134`), `addChaosTokens`, `sideDecks` and `oneWay` on `ScenarioDef` (`schema.ts:1426,1443`), a scenario script with hooks (`content/campaigns/night-of-the-zealot/scripts/*.ts`, registered through ADR-0028's registry, run through ADR-0027's adapter, limited to the `api.ts` list of ADR-0034). `connections()` in `src/engine/queries.ts:123` reads `scen.connections` plus `flags.connections`.

Neighbours this design assumes landed: `engine-scenario-structure` (N agenda decks, flip, a `beneath` pile keyed by any card, named tokens, story cards, "not at any location", trait spawn, conditional token modifiers), `engine-generic-keywords` (Swarming), `scenario-import-fixes` (standalone bags, single-group sets), `campaign-flow-compiler-fixes` (the checkpoint leak). In-force ADRs: 0001–0036 plus 0082 (this change's Single Group rule) and 0083; none superseded.

## Goals / Non-Goals

**Goals:** the scenario plays from setup to every resolution as printed, Single Group; every `wog` card works; tokens real on four difficulties; connections from the scans; coverage complete.

**Non-Goals:** Epic Multiplayer (ADR-0082); any engine change (what the scenario needs is owned by the engine changes above; a gap found here is reported to them, not patched in the script); the player side of `wog` beyond the five earned assets (86051–86055 are in this scenario's count).

## Diagram (C4 component level, ASCII)

```
 content/campaigns/side-war-of-the-outer-gods/
   campaign.json  (packs core+side, printed bags x4, requiredInvestigators: none)
   flow.json      (setup story, playScenario, R1..R7 + none, sideScenario cost 3 via host)
   scenarios/war-of-the-outer-gods.json
     encounterSets [wog, children_of_paradise, swarm_of_assimilation, death_of_stars]
     agendaDecks {green:[86005..7], blue:[86002..4], red:[86008..10]}   <- engine-scenario-structure
     acts [86011..13]; startAt 86014; setAside [86024, 86052, faction sets]
     spawnAtSetup [86025@.., 86027@.., 86029@..]; connections + oneWay from scans
     tokens {easy,standard,hard,expert}
   scripts/war-of-the-outer-gods.ts  (CardScript hooks)
        |
        v  imports only src/engine/api.ts (ADR-0034)
 +------------------------------------------------------------------+
 | src/engine                                                        |
 |  rules/scenario.ts  agenda decks: checkDoom per deck, advance,    |
 |                     carry-over doom, flip Hub on 3rd (hook)       |
 |  rules/enemies.ts   enemy phase: Warring attacks (script hook     |
 |                     enemyPhase), Swarming host/swarm (keywords)   |
 |  rules/tokens.ts    x: cluesYouControl, xTimes 2; onFail effects  |
 |  effects/placement  named tokens ward/mutation; beneath(card)     |
 |  campaign/flow.ts   resolution picked by script: leadingFaction   |
 +------------------------------------------------------------------+
        |
        v
 content/packs/side/cards.json (86001-86055 data) + scripts/<code>.ts (card scripts)
 content/coverage.json, docs/campaign-program.md (wog row)
```

## Decisions

1. **A hand-written campaign folder replaces the generated one.** `content/campaigns/side-war-of-the-outer-gods/` with `campaign.json`, `flow.json`, the scenario file and `scripts/war-of-the-outer-gods.ts`; `scripts/import-campaigns.ts` already skips hand-written campaigns, so the generated folder is deleted. _Why:_ the generated setup, agendas, start and connections are all wrong; patching a generated file is forbidden (AGENTS.md) and the program's step 7 moves a finished campaign anyway. _Alternative:_ overrides merged over the generated scenario — rejected: no such mechanism exists and the whole file changes.

2. **Three agenda decks are data; faction rules are the scenario script.** The scenario file declares `agendaDecks` (the shape `engine-scenario-structure` adds); the script's hooks do what the agenda backs print: on `agendaAdvanced(deck)` shuffle that faction's set-aside set in (`shuffleSetAsideSet`), add the faction's symbol token when the campaign is standalone (`isStandalone(game)`), and on the third distinct deck advancing flip Hub Dimension; `leadingFaction(game)` compares doom and stage. _Why:_ the engine owns "several decks"; which deck means what is this scenario's business. _Alternative:_ three scripted agendas as acts — rejected: doom placement rules and the UI's agenda panel would both lie.

3. **Warring is a scenario-script enemy-phase rule, faction colour a trait-like tag from the encounter set.** `factionOf(card)` maps `children_of_paradise`→green, `swarm_of_assimilation`→blue, `death_of_stars`→red; the `enemyPhase` hook makes each ready Warring enemy attack one enemy of another faction at its location before hunters move, through the script verb for enemy-vs-enemy damage. _Why:_ only this scenario has Warring; a keyword in `implemented.ts` would be a generic for one user. _Alternative:_ an engine keyword — rejected (YAGNI).

4. **Wards and mutations are named tokens, swarm cards the keyword's pile.** `placeTokens { name: "ward" | "mutation" }` from `engine-scenario-structure`; the elder-thing effect "beneath an Insect" uses the Swarming pile from `engine-generic-keywords`; the Ancient Ones use `healthPerInvestigator`. "Per group" reads as the table (ADR-0082).

5. **Token effects in data.** `x: cluesYouControl` exists; Hard uses `xTimes: 2`; `onFail`/`always` carry `placeTokens mutation nearestWithTrait Mutated` / `eachWithTrait`, `drawFromEncounterDiscard { trait: Hex }`, `swarmCommitted { count: 1 | all }`. Where the vocabulary lacks a target, the token effect names a script condition (`{ script: "..." }`, `schema.ts:261`).

6. **Connections from the scans, one-way where printed.** Hub Dimension to the four Ritual Sites only; Arkham to the three cities; each city's Streets as its hub; recorded in `connections` with `layout` for the table; the check is a test asserting the printed neighbour list.

7. **No-resolution ending computed.** The scenario's `Resolution` step is pushed by the script with the leading faction's id; the flow has `none` branch to R5/R6/R7 by a `scenarioData` the script records, so no question is asked.

## Risks / Trade-offs

- [`engine-scenario-structure` lands with a different agenda-deck shape] → the scenario file is the only consumer; adjust on apply.
- [Warring attacks interleave with hunter moves and engagement] → the hook runs before `HunterMoves`; a test fixes the order.
- [Connections unverifiable from text] → the scans in `inspired/` are the source; the task names the reviewer check.
- [The standalone bag changes mid-game] → `addChaosTokens` already exists; tokens added persist for the scenario only.

## Migration Plan

Content only; no save-format change. Delete `content/campaigns-generated/side-war-of-the-outer-gods/` when the hand-written folder passes `check:content`. Rollback: restore the generated folder.

## Open Questions

- Expert bag: the S2 PDF prints Easy/Standard/Hard/Expert for WotOG; ArkhamCards' side guide lacks Expert. The printed guide wins (user decision); confirm the Expert symbol count on apply.
- Hub Dimension's second face: the scans decide whether the flipped Hub keeps the Ritual Site connections.
