## Context

`content/campaigns-generated/return-to-the-forgotten-age/` holds 9 scenario files (Return to The Depths of Yoth is skipped by the importer: its setup puts a random location into play, so it finds "no location"; `scenario-import-fixes` generates it). Each file's `card` is the base scenario card (04043…04344) and its `encounterSets` name the Return-to sets, but the setups are the base setups' copies plus the Return-to cards put into play beside the originals (both 04060 and 53019 Entryways; both Harbingers and both Chambers set aside), `acts` are one card per stage across decks (53029, 53031, 53035 for four decks of Threads; 53054 alone for The City of Archives), and no "one of two per symbol" deck exists. The rttfa pack (`content/packs/return/cards.generated.json`: 85 cards, 67 encounter, 15 player, 3 scenario-set player-side) has an empty `cards.json` for these codes. The box's rules beyond the setup cards are three: the exploration rule after a successful exploration, the resupply changes, and the Key of Eztli (RtTFA guide ll.1728–1747, 3454).

After `campaign-the-forgotten-age` the base campaign is hand-written with one script per scenario exporting its hooks, symbols on every base location, real token tables and a hand-fixed flow; after `campaign-return-to-the-dunwich-legacy`, `ScenarioDef.setupCards`, `compose()` in `src/engine/api.ts` and `CampaignDef.options` with `replaceSets` exist. The TFA engine change gives `buildExploration.bySymbol`, `ScenarioDef.afterExplore` and `buySupplies.xpRate`.

In-force ADRs as in the base change; 0007, 0013, 0028, 0034, 0052, 0053 constrain this one.

## Goals / Non-Goals

**Goals:** the 10 Return scenarios set up and play as the setup cards say, reusing the base scripts, tables and symbols; the 67 rttfa encounter cards work; the base campaign's replacement-sets option; coverage reports the campaign complete.

**Non-Goals:** the 15 rttfa player cards (`player-cards-tfa`); the base campaign's rules; the achievement list (out of scope, no game effect).

## Diagram (C4-inspired, component level, ASCII)

```
 content/campaigns/the-forgotten-age/scripts/<id>.ts          content/packs/tfa/{cards.json, scripts/}
   exports: setup, checkObjectives, ended, explore hooks        (base cards with symbol/connectsTo)
            |  import { hooks as base }
            v
 content/campaigns/return-to-the-forgotten-age/
 +-----------------------------------------------------------------+   content/packs/return/
 | campaign.json (generated: false; packs core, tfa, return)       |   +--------------------------------+
 | flow.json (base flow + return-to keys, xpRate resupply,         |   | cards.json (67 encounter:      |
 |   Key of Eztli, sticky goop, act-card XP restriction)           |   |   symbols on the new locations)|
 | scenarios/return-to-<id>.json x10: card = base, setupCards      |   | scripts/<code>.ts (~30)        |
 |   [53016…], sets with replacements + return_to_the_rainforest,  |   +--------------------------------+
 |   buildExploration {bySymbol}, afterExplore (top encounter card |
 |   into the deck), full act decks, tokens = base tables          |
 | scripts/return-to-<id>.ts = compose(base, returnTo)             |
 +-----------------------------------------------------------------+
            |  db.scripts["return-to-<id>"]
            v
 src/engine: createGame (base steps, then the setup card's; replaceSets from the campaign options),
   rules/scenario.ts Explore + afterExplore, bySymbol pick, supplies (Key of Eztli as a supply id)
            |
 src/content/implemented.ts tokensReal: the base card's lines; a setup card with none is real
```

## Decisions

1. **A Return scenario's script composes the base's** with `compose()` as the Dunwich Return-to does; setup hooks run after the base's, objective hooks before. Return to Turn Back Time composes Return to The Doom of Eztli's.

2. **The scenario file carries both cards** (`card` = base, `setupCards` = the Return-to card), the token table copied from the base file (ADR-0013 measures the file).

3. **Return-to setup is data where the ops exist, script where it does not.** `bySymbol` decks (Wilds: two Jungle locations per symbol over 04069–04073 and 53067–53070 for Purple Moon, Blue Triangle, Red Square, Orange Heart; HotE 1: six over the Jungle and Time-Wracked Woods; HotE 2: K'n-yan with Green Diamond), the replaced Eztli locations (remove 04065, 04066, 04067; 53019, 53021, 53022, 53025, 53018 in place of 04060, 04063, 04064, 04068, 04062), three Pit Vipers set aside, Veda Whitsley set aside, the Boundary's one-of-each-pair (`putRandomIntoPlay` per pair over 04168–04173 and 53039–53044), the twelve-Ancient exploration deck, the Southern Corridors 53055 in play and the Vaults and Conservatory set aside, the Otherworld four and the new Shattered locations set aside are setup steps; the "sticky goop" record, the Snake Pit's set-aside Vipers, the Throne Room's vengeance static with doom, Perils of Yoth into each new deck (a hook on the base's depth advance) and the fourth act deck's trimming by choice are the `returnTo` hooks. `afterExplore` on every explored scenario file carries the box's rule.

4. **Act decks.** Return to Threads of Fate: the base's three decks plus deck 4 (g/h from 53029–53036, one version by a flow choice before the scenario), agendas unchanged. Return to Heart of the Elders 1: act 1a 53046 "A Familiar Pattern" (53046b The Winged Serpent flips in at 5+ damage) in place of 04209. Return to The City of Archives: acts 04241, 53054, 04243.

5. **The rttfa cards follow the base change's split**: data for 53019–53022, 53025, 53026, 53049–53052, 53055–53058, 53067–53070, 53074, 53079, 53080; scripts for 53018 Harbinger (composing 04062's), 53023, 53024, 53027, 53029–53036 and their b-sides, 53037, 53039–53044, 53046/53046b, 53047, 53054, 53060, 53062–53065, 53071–53073, 53075–53078. New vocabulary, one test each: an evade paid with a supply (53047), explore reactions on a successful investigate, fight or evade (53039, 53043), a treachery attached to a location worth vengeance (53074), doom divided evenly (53073), copies drawn from the victory display (53078), an explore cost of 10+ resources or 4 skill icons (53040–53042).

6. **The Key of Eztli is a supply id** in the engine change's `SUPPLY` set, recorded by the Depths' resolution with `addSupply` for a chosen investigator and read by 53020's check; it is not a card.

7. **The replacement sets option on the base campaign** reuses `CampaignDef.options` with `replaceSets` (the four pairs); Return to the Rainforest's addition is the open question (an `addSets` list on the same option if the user wants it).

## Risks / Trade-offs

- [The base scripts' hook shapes change] → the composition helper is the Dunwich change's; a test asserts every Return script's hook list is a superset of its base's.
- [`bySymbol` over two sets picks by the transcribed symbols] → the engine change's reachability check runs over the Return-to decks too; a test per Return scenario explores to every location.
- [Return to The Depths of Yoth depends on an importer fix] → ordered after `scenario-import-fixes`; until then the group's first task fails on a missing file.
- [Perils of Yoth into each new deck hooks the base's depth advance] → the base script exports `onDepthAdvance`; a test advances depth and finds 53060 in the new deck.

## Migration Plan

Content only, plus the base campaign's option declaration; the generated folder deleted and skipped by the importer. No engine version bump beyond the base change's. Rollback: revert.

## Open Questions

- Return to the Rainforest in the base option (proposal). No in-force ADR needs revisiting.
