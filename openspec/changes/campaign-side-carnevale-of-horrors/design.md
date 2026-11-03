## Context

`content/campaigns-generated/side-carnevale-of-horrors/` is the importer's output: `campaign.json` with the Night of the Zealot bags, `scenarios/carnevale-of-horrors.json` with `putIntoPlay [82008]`, `startAt 82008`, `connections: []`, `oneWay: []`, `setAside [82027, 82023–82026]`, placeholder tokens, and a `flow.json` whose only real gap is `choose_masks` (plus the leaked Fortune and Folly interlude, owned by `campaign-flow-compiler-fixes`). `content/packs/side/cards.json` is `{}`. 1 card works (82002, the agenda front: keywords only).

What the engine has: `ScenarioDef.oneWay` (one-directional links, read by `connections()` in `src/engine/queries.ts`), `setAside` and `putRandomIntoPlay` setup ops, `flags.beneath`/`flags.underAct` (`src/engine/world/flags.ts`, one card each), `setCode` in `src/engine/context.ts`, `healthPerInvestigator`, a `setup` hook per scenario script (`game.db.scripts[id].hooks`, ADR-0028), `tokens` per difficulty with `x` sources, flow steps `investigatorChoice` (no card list) and `cardChoice` (not per investigator).

Engine changes this one waits for: flip in place, cards beneath any card, relative spawn ("across from you", "counter-clockwise"), conditional token modifiers (`engine-scenario-structure`); connections per location instance (`engine-location-instances-grid`).

In-force ADRs: 0001–0036 (0019 superseded in part by 0020; 0027–0036 proposed, honoured here). 0007 keeps hand-written campaigns out of the importer. 0013 decides when a card works. 0011 makes the flow a typed step language, so the mask choice is a flow step, not a prompt in the scenario. 0028/0034 shape the scenario script: hooks from the registry, reads and intent verbs from `src/engine/api.ts`.

## Goals / Non-Goals

**Goals:** the scenario sets up, plays and ends as the printed guide says, on all four difficulties; every `coh` card works; the rewards reach a host campaign's decks.

**Non-Goals:** the generic engine mechanics listed above; hosting (which campaigns offer Carnevale and when: the host campaign changes); the Venetian art and music.

## Diagram (C4 component level, ASCII; the browser app is the only container)

```
 content/campaigns/side-carnevale-of-horrors/
   campaign.json  (bags Std/Hard, Easy=Std, Expert=Hard; packs [side])
   scenarios/carnevale-of-horrors.json  (sets, setup ops, tokens x4, resolutions, layout)
   flow.json  (R1/R2/none -> setData counts -> investigatorChoice{codes: masks})
   scripts/carnevale-of-horrors.ts  (hooks: setup, checkObjectives, encounterDraw, spawn)
            |                                        content/packs/side/
            |                                          cards.json (39 coh entries)
            v                                          scripts/820xx.ts (~25)
 +----------------------------------------------------------------------------+
 | src/engine                                                                 |
 |  rules/scenario.ts  setup hook -> ring: remove 1, shuffle 8, oneWay links  |
 |                     per instance (engine-location-instances-grid)          |
 |  queries.ts         across(loc), clockwise(loc), counterClockwise(loc)     |
 |  rules/tokens.ts    x: revelersBeneathAgenda | revelersBeneathActOrAgenda  |
 |  rules/skillTest.ts substituteSkill reaction at test start                 |
 |  rules/enemies.ts   Cnidathqua: no location, attackable from anywhere      |
 |  campaign/flow.ts   investigatorChoice{codes}: one pick per investigator   |
 +----------------------------------------------------------------------------+
            |  prompts by key (content/i18n/{en,ru}/ui.json)
            v
 src/ui (unchanged components)
```

## Decisions

1. **Hand-written campaign folder.** `content/campaigns/side-carnevale-of-horrors/` with `campaign.json`, `scenarios/carnevale-of-horrors.json`, `flow.json` and `scripts/carnevale-of-horrors.ts`, as Night of the Zealot is laid out; the generated folder is deleted and `import:campaigns` skips the id (ADR-0007). _Alternative:_ patch the generated JSON by hand — rejected: `*-generated/` is never edited by hand (AGENTS.md), and the next import would overwrite it.

2. **The ring is built in the `setup` hook.** Scenario data lists the nine locations; the hook removes one at random (re-drawing San Marco or Canal-side), shuffles the rest, and writes one-way links instance to instance. `across(loc)` is `ring[(i + 4) % 8]`; clockwise and counter-clockwise are the neighbours. The clockwise connection line on every location is accounted for by a `LINE_RULE` naming `oneWay` (ADR-0013). _Alternative:_ a `ring` setup op — rejected: one scenario.

3. **Revelers beneath the act and agenda are the `beneath` pile** of `engine-scenario-structure`, keyed by the act or agenda card; the token `x` sources count that pile. Resolutions write both counts with `setData` so the flow branches (`logCount`) instead of asking `ask_innocent_revelers_saved/killed`.

4. **Masked Carnevale-Goer / Innocent Reveler** is one card with two faces: the flip is `engine-scenario-structure`'s in-place flip; "placed beneath the agenda when discarded" is a script on 82017b–82021 using the `discarded` window. Sentinel's block of the peek and Elisabetta's flip-when-peeked are conditions in the act-1 script.

5. **Cnidathqua (82027)** is an enemy at no location (`flags` location `none`), attackable by any investigator (`fight` target `anywhere`), cannot be evaded, spawns Writhing Appendages; 82030's defeat damages it. Its defeat ends the scenario in R2 through `checkObjectives`.

6. **Masks are a reaction `substituteSkill { skill }`** on `skillTestStarted` for the bearer, limit once per round, in `rules/skillTest.ts`; "Limit 1 Mask per investigator" is a play condition `controlsNone { trait: Mask }`. The flow's `choose_masks` is `investigatorChoice { codes: [82023, 82024, 82025, 82026], optional: true }`: `campaign/flow.ts` loops the active investigators in player order, removing taken codes, binding `earnCard` to the picker (`who: "input"`).

7. **Standalone cost is zero.** `xp_cost: 3` from the guide is kept only as the `cost` a host campaign's `sideScenario` step carries; the hand-written flow has no cost step.

8. **Tokens.** Easy = the front, Expert = the back; Ta's "nearest Innocent Reveler" is a target in the token effect (`nearestEnemy { trait: Innocent }`, from `engine-scenario-structure`'s trait targeting); ET's "Cnidathqua attacks you" is `enemyAttacks { code: 82027, ifInPlay: true }`.

## Risks / Trade-offs

- [Connections come from the scans] → the ring needs none: the links are positional; only the removed-location rule is data.
- [Many flips and beneath moves in one scenario before the engine changes land] → the card scripts are written against `engine-scenario-structure`'s ops; the scenario test (`testkit`) stubs none of them, so the change lands after that one.
- [The peek shows hidden information in hot-seat] → the act-1 prompt shows the back only to the peeking investigator's view (view state, ADR-0004); recorded in the event log as a reveal.
- [Reveler horror to every investigator on discard is noisy] → one `dealHorror each` per discard event.

## Migration Plan

Content and schema additions; the generated folder is removed in the same commit. `ENGINE_VERSION` bumps only if `engine-scenario-structure` has not already bumped it. Rollback: restore the generated folder.

## Open Questions

- Whether `engine-scenario-structure`'s relative spawn covers "counter-clockwise" and "across" or the script resolves them with the helpers above (assumed: the helpers).
- The mask deck limit in a host campaign (one per investigator across the campaign) needs a deck-option rule; proposed as part of the host's `sideScenario` reward handling.
