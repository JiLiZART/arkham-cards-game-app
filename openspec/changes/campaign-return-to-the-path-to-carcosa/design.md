## Context

`content/campaigns-generated/return-to-the-path-to-carcosa/` holds 8 scenario files whose `card` is the base scenario card (03043 … 03316), whose `encounterSets` already name the replacement sets (the swaps match ArkhamCards and the bookmark), whose `tokens` are copies of the base placeholders, and whose `acts`/`agendas`/`setup` are the base's or wrong where the box replaces a card (report `ptc.md`, "Return to The Path to Carcosa"). The rtptc cards live in `content/packs/return/` (84 cards mixed with the other Return boxes; `cards.json` has one entry, 51008). Coverage counts each setup card as a second `scenario` card its scenario can never make real. `flow.json` is the base flow with renamed ids plus a six-way `ask_which_mid_game_token` and `vips_slain` variants, so it inherits every base flow fix.

After `campaign-the-path-to-carcosa`, the base campaign is hand-kept at `content/campaigns/the-path-to-carcosa/` with one script per scenario, real token tables, the flow fixed and the scenario recording what the guide asks (ADR-0050). `campaign-return-to-the-dunwich-legacy` adds `ScenarioDef.setupCards`, `compose()` in `src/engine/api.ts`, the setup-card coverage rule and `CampaignDef.options { id, labelKey, replaceSets }`; this change reuses all four. In-force ADRs: 0001–0036 and 0050; 0007, 0013, 0028, 0034, 0050 constrain this one.

## Goals / Non-Goals

**Goals:** the 8 Return scenarios set up and play as the setup cards say, reusing the base scripts and tables; the 69 rtptc encounter cards work; the base campaign offers the replacement sets; coverage reports the campaign complete.

**Non-Goals:** the 15 rtptc player cards (`player-cards-ptc`); the base campaign's rules; the achievements; Enthralling Encore.

## Diagram (C4-inspired, component level, ASCII)

```
 content/campaigns/the-path-to-carcosa/scripts/<id>.ts            content/packs/ptc/{cards.json, scripts/}
   exports its hooks (setup, checkObjectives, onActAdvance, …)       (base cards, unchanged)
   campaign.json: options [{ id: rtptc-replacement-sets, replaceSets: 5 pairs }]
            |  import { hooks as base }
            v
 content/campaigns/return-to-the-path-to-carcosa/
 +---------------------------------------------------------------+   content/packs/return/
 | campaign.json (hand-kept; packs core, ptc, return)            |   +---------------------------+
 | flow.json (base flow with return-to ids, 6-way token record)  |   | cards.json (69 encounter) |
 | scenarios/return-to-<id>.json: card = base card,              |   | scripts/<code>.ts (~40)   |
 |   setupCards [52014…], encounterSets with the replacements,   |   +---------------------------+
 |   full acts/agendas, tokens = base tables, connections        |
 | scripts/return-to-<id>.ts = compose(base, returnTo)           |
 +---------------------------------------------------------------+
            |  db.scripts["return-to-<id>"]
            v
 src/engine: createGame setup (base steps, then the setup card's), rules/scenario.ts objectives
   (returnTo hook first, then base); Hidden from engine-generic-keywords; two agenda decks, flips,
   cards beneath from engine-scenario-structure; the catacombs grid from engine-location-instances-grid
            |
 src/content/implemented.ts tokensReal: the base card's lines; a setup card with no lines is real
```

## Decisions

1. **A Return scenario's script composes the base's** through `compose()` (Dunwich decision 1): `scripts/return-to-<id>.ts` imports the base hooks and exports `{ setup: [base.setup, returnTo.setup], checkObjectives: first(returnTo, base), onActAdvance: [base, returnTo], … }`. Where the box replaces a base rule outright (The Unspeakable Oath's act 2 choice, Dim Carcosa's Palace), the Return hook runs first and marks the base rule skipped through a scenario flag the base script reads. _Alternative:_ copy the base script — rejected, as in the Dunwich change.

2. **The scenario file carries both cards** (`card` = base, `setupCards` = the box's); the token table is copied from the base file. A content check asserts a Return scenario's table equals its base's so the copies can't drift. _Alternative:_ a `tokens` reference to the base scenario — rejected: ADR-0013 measures the file, and the Dunwich change already chose the copy.

3. **Return-to setup is data where the ops exist, script where it does not.** Data: the six-way random act 2 of Curtain Call (`putRandomIntoPlay`-style act pick as `engine-scenario-structure` gives it), agenda `[52022, 03063]`, set-asides (52027, 52033 ×2, 52037, 52038, 52047 ×2, 52061–52063), the Basement floor in Echoes' per-floor random pools, act 2 by `logCompare` in the Oath, Phantom's six base-or-new picks, BSR's pile pick, the Palace swap. Script: 52014's attachment to Royal Emissary and its warnings, the eight-card Sickening Reality pile, the doorway pools with 52018/52019, Keeper of the Oath's spawn on act advance, Figure in the Shadows after The Organist enters play, the four extra Catacombs and the four unseen removals, Hastur's health floor and 52060b's version-keyed location, MitPM held in the Tomb.

4. **The rtptc cards follow the base change's split**: data in `content/packs/return/cards.json` for 52019, 52023 (with the new parley trigger), 52024, 52029, 52030, 52032, 52037, 52066, 52067, 52068, 52069, 52071–52075, 52077; scripts for 52014, 52015–52017, 52018, 52020, 52021, 52022, 52023b, 52024b, 52025, 52026, 52027, 52028, 52031, 52033, 52034, 52035, 52036, 52038, 52039, 52040, 52041–52046, 52047, 52048, 52049–52053, 52054, 52055, 52056, 52057, 52058, 52059, 52060/52060b, 52061/52061b, 52062/52062b, 52063/52063b, 52064, 52065, 52070, 52076, 52078. The new vocabulary (a per-turn record of action kinds for 52071–52074, `hiddenCardsInHand` for 52075 and 52030, parley that auto-evades for 52024, the `parleyed` trigger with "any investigator" for 52023, prey "lowest remaining sanity only" for 52069, `cluesDiscovered` with its count for 52032) is added here, one test each; Hidden itself comes from `engine-generic-keywords`.

5. **"Forget" a remembered fact** (52039 Clouded Memory) is a `forget` op over the remembered-flags store the base change adds (`rules/scenario.ts`), no new state.

6. **The replacement sets option** is declared on `content/campaigns/the-path-to-carcosa/campaign.json` as `rtptc-replacement-sets` with the bookmark's five pairs, in the shape the Dunwich change defines; nothing else is added to the option mechanism. Return to The Path to Carcosa lists the replacement sets directly in its scenario files, as today.

## Risks / Trade-offs

- [The base scripts' hook shapes change under `engine-script-registry`] → the composition is the Dunwich `compose()`; a test asserts every Return script's hook list is a superset of its base's.
- [Return to Dim Carcosa's three set-aside locations enter through 52060b by Hastur's version and must take the Palace's connections] → the slot keeps its edges (base decision 9); a test flips 52060 under each version.
- [Return to The Pallid Mask's four unseen removals change which Catacombs exist] → the catacombs deck is built by the base script from a code list the Return hook edits before the build; no new op.
- [Six-way act 2 in Return to Curtain Call feeds the flow's `cca_add_chaos_token` record] → the base script records the version code; the flow's six-way step reads it (ADR-0050).

## Migration Plan

Content only beyond the base change's engine work; the generated folder deleted and skipped by the importer. No engine version bump beyond the base change's. Rollback: revert.

## Open Questions

- 52048: The Man in the Pallid Mask "cannot leave Tomb of Shadows while act 2 is in play" blocks both his own movement and any effect that would move him (user decision).
- Return to Black Stars Rise's new Cloister/Knight's Hall (52055/52056) take the base pair's map links; confirm against their card icons.
- No in-force ADR needs revisiting.
