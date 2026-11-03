## Context

`content/campaigns-generated/return-to-the-dunwich-legacy/` holds 8 scenario files whose `card` is the base scenario card (02041…02311), whose `encounterSets` already name the replacement sets, and whose `acts`/`agendas` are wrong where the box replaces a card (Return to Essex keeps 02160; Return to Lost in Time and Space lists only 51054 and 51055). Coverage counts the setup card (51012…51053) as a second `scenario` card per Return scenario, so `tokensReal` (`src/content/implemented.ts:84`) can never be true for them today. The rtdwl pack (`content/packs/return/cards.generated.json`, 73 cards: 60 encounter, 13 player) has an empty `cards.json`. `docs/campaign-program.md` says a Return-to scenario plays with its base scenario's reference card and starts from the base scenario's script and token tables.

After `campaign-the-dunwich-legacy`, the base campaign is hand-written at `content/campaigns/the-dunwich-legacy/` with one script per scenario (`scripts/<id>.ts`) and one per card (`content/packs/dwl/scripts/<code>.ts`), the token tables real, and the flow hand-fixed. In-force ADRs as in that change; 0007 (hand-written campaigns kept), 0013 (a reference card works by its token lines), 0028 (typed hooks) and 0034 (explicit script API) constrain this one.

## Goals / Non-Goals

**Goals:** the 8 Return scenarios set up and play as the setup cards say, reusing the base scripts and tables; the 60 rtdwl encounter cards work; coverage reports the campaign complete.

**Non-Goals:** the 13 rtdwl player cards (`player-cards-dwl`); the base campaign's rules. The base campaign's replacement-sets option is in scope (decision 6).

## Diagram (C4-inspired, component level, ASCII)

```
 content/campaigns/the-dunwich-legacy/scripts/<id>.ts        content/packs/dwl/{cards.json, scripts/}
   exports: setup, checkObjectives, spawnRedirect, ended         (base cards, unchanged)
            |  import { hooks as base }
            v
 content/campaigns/return-to-the-dunwich-legacy/
 +-----------------------------------------------------------+   content/packs/return/
 | campaign.json (generated: false; packs core, dwl, return) |   +------------------------------+
 | flow.json (base flow + Return-to log keys, Naomi option)  |   | cards.json (60 encounter)    |
 | scenarios/return-to-<id>.json: card = base card,          |   | scripts/<code>.ts (~30)      |
 |   setupCards [51012…], encounterSets with replacements,   |   +------------------------------+
 |   full acts/agendas, tokens = base tables, connections    |
 | scripts/return-to-<id>.ts = compose(base, returnTo)       |
 +-----------------------------------------------------------+
            |  db.scripts["return-to-<id>"]
            v
 src/engine: createGame setup (base steps, then the setup card's), rules/scenario.ts objectives
   (returnTo hook first, then base), the void / cards beneath / side decks from engine-scenario-structure
            |
 src/content/implemented.ts tokensReal: reference card's lines; a setup card with no lines is real
```

## Decisions

1. **A Return scenario's script composes the base's.** Each base scenario script exports its hooks as a named object; `scripts/return-to-<id>.ts` imports it and exports `{ hooks: { setup: [base.setup, returnTo.setup], checkObjectives: first(returnTo, base), ended: base.ended, … } }` through a small `compose()` in `src/engine/api.ts` (the registry's typed hooks make the shape checkable). _Alternative:_ copy the base script — rejected: a base fix would have to be made twice, and the program says Return-to starts from the base script.

2. **The scenario file carries both cards.** `ScenarioDef` gains `setupCards: string[]` (the box's setup card), `card` staying the base scenario card so the token table and the tile's art are the base's; `tokensReal` and `coverage.ts` count a setup card without token lines as real. The token table is copied from the base file, not referenced, so a scenario file is complete on its own (ADR-0013 measures the file).

3. **Return-to setup is data where the ops exist, script where it does not.** Random copies (`putRandomIntoPlay`), set-asides and the replacement set swaps are setup steps; the Exhibit changes, the 10-car and 4-engine pools, the three-copy village, the Brood variants and Realms Beyond are the `returnTo.setup` hook, after the base's setup has run. Full act and agenda decks are listed in the file; the `ritual_completed` choice of 02317 or 51055 is a setup step with `when: logHas`.

4. **The rtdwl cards follow the base change's split**: data in `content/packs/return/cards.json` (51013, 51018, 51021, 51030, 51033 with a flag, 51034–51039, 51043, 51064, 51068, 51069, 51071), scripts for 51014, 51016, 51017, 51019, 51022, 51023, 51024, 51026, 51026b, 51027, 51028, 51029, 51031, 51040, 51042, 51044, 51045, 51046, 51048, 51049, 51050, 51051, 51052, 51054, 51055, 51056, 51057, 51058, 51059, 51060, 51061, 51062, 51063, 51065, 51066, 51067, 51070, 51072. The new vocabulary (51065 attach where most investigators + `cannotLeave`; 51066 per-point choice; 51070 difficulty from clues; attachments surviving the void for 51023) is added here, one test each.

5. **Return to The Miskatonic Museum's "next agenda's Forced is active while resolving the back"** is a scenario flag the Return scenario script sets while an agenda back resolves, read by the base agenda scripts 02119–02121 through a shared helper; no engine rule.

6. **The replacement sets are a campaign option on the base campaign.**
   - **Data:** `CampaignDef.options` is new in `src/content/schema.ts`: `{ id, labelKey, replaceSets: Record<newSet, oldSet> }`. The base `content/campaigns/the-dunwich-legacy/campaign.json` declares `rtdwl-replacement-sets` with the bookmark's six pairs.
   - **State:** the new-campaign menu shows the options as toggles, off by default. The chosen ids go into the campaign state (`src/engine/campaign/campaign.ts`) and the save, so they can't change mid-campaign.
   - **Setup:** when a scenario gathers its encounter sets, the scenario setup reads `replaceSets` and swaps each listed old set for its new one. It also drops any set that a set already in the list replaces, so Return-to scenario files that list the new sets are unaffected.
   - **Reuse:** the other Return-to boxes use the same shape for their own options.
   - _Alternative:_ a second campaign entry, "The Dunwich Legacy (replacement sets)", rejected: it doubles the campaign list and the flow file for a six-line difference.

## Risks / Trade-offs

- [The base scripts' hook shapes change under `engine-script-registry`] → the composition is one helper in `api.ts`; a test asserts every Return script's hook list is a superset of its base's.
- [Return to Lost in Time and Space's deck by `ritual_completed` and Realms Beyond's redirect from Another Dimension interact with the base's location-leaves-play rule] → a test runs a location removal with both in play.
- [Return-to Blood on the Altar's three copies per location make the random pool 18 cards] → the pool is built by the script from codes, no new op.

## Migration Plan

Content and a small schema addition (`setupCards`); the generated folder deleted and skipped by the importer. No engine version bump beyond the base change's. Rollback: revert.

## Open Questions

- None open. 51020's reading and the base campaign's replacement-sets option are decided (proposal).
- No in-force ADR needs revisiting.
