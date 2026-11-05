# Campaign program

The plan for making every campaign complete (ADR-0012): 65 OpenSpec changes, listed below in the order they land, then the packs and
scenarios they complete. The tables were generated from `content/coverage.json` (`pnpm coverage`) and are kept by hand: each change
ticks its rows, updates its counts and its status. `scripts/program.test.ts` checks that every program change is listed once.

A pack is a card pack as ArkhamDB names it (the code on the card, `pack`): a deluxe box, a mythos pack, a Return-to box, an investigator
box. **Counts** are the cards that do not work yet out of the pack's cards: *encounter* (what a campaign's scenarios draw) and *player*
(assets, events, skills, weaknesses). A campaign is complete when every card its scenarios use works and every scenario has a scenario
script, so the encounter side of a pack gates its campaign; the player side gates the pack alone, since any investigator may bring the cards.

## What a pack's change does

One change per pack, each the size of Night of the Zealot's work or smaller and playable on its own. **A campaign box** (a pack that holds a whole campaign: `eoec`, `tskc`, `fhvc`, `tdcc`, `cob`, `fof`, `guardians`) **is worked one scenario at a time**: its scenarios are listed under it below, and each scenario's change is done when `content/coverage.json` reports that scenario complete (ADR-0013). A Return-to scenario plays with its base scenario's reference card, so its change starts from the base scenario's script and token tables.

1. the engine features its cards need (a cycle's new mechanics come first, in their own change below);
2. its encounter cards and player cards, with their tests;
3. its scenario script, for the pack's scenarios;
4. the real chaos token effects of its scenarios (in the scenario files, not placeholders);
5. its location connections, checked against the printed campaign guide in `inspired/`;
6. a bot playthrough of its scenario to a resolution;
7. for a campaign's last pack, the move of the campaign from `content/campaigns-generated/` to `content/campaigns/` (the campaign's `generated` flag goes with it).

The change is **done** when `pnpm coverage` reports the pack (and, for its last pack, the campaign) complete: the committed
`content/coverage.json` going up is the diff that shows it. Coverage is the progress measure, not the quality gate: a card whose written
abilities cover only part of its text counts as working, so the bot playthroughs and the card tests are the real check.

## The 65 changes, in landing order

Status comes from `openspec/changes/` (and `archive/`): *not written*, *being written* (artifacts missing), *ready* (tasks written, none done),
*in progress*, *implemented*, *archived*. A change is applied with `/opsx:apply <change>` after its proposal is on `main`.

### Foundations: the importers and the engine pieces every campaign uses

| Change | Status | Completes |
| --- | --- | --- |
| `scenario-import-fixes` | implemented (16/16) | generated scenarios: set-aside and removed cards, setup cards, chaos bags per difficulty, Return-to options |
| `campaign-flow-compiler-fixes` | implemented (11/11) | generated flows: the guide's order, interludes, resolutions with their links, shared steps |
| `engine-scenario-structure` | implemented (38/38) | scenario structure: several act and agenda decks, cards beneath locations and the other state one act and one agenda can't hold |
| `engine-generic-keywords` | implemented (24/24) | the keywords that recur across cycles (Patrol and the others no single campaign owns) |
| `engine-location-instances-grid` | implemented (11/11) | locations told apart by instance, not code, and grid placement |
| `engine-bless-curse` | ready (0/13) | bless and curse tokens (needed from The Innsmouth Conspiracy on) |

### Cycle mechanics

| Change | Status | Completes |
| --- | --- | --- |
| `engine-tfa-supplies-vengeance-exploration` | ready (0/24) | The Forgotten Age: supplies, vengeance, exploration |
| `engine-tcu-haunted-spectral-breaches` | being written | The Circle Undone: haunted, spectral, breaches |
| `engine-tde-linked-campaigns` | being written | The Dream-Eaters: two linked campaigns |
| `engine-tic-keys-flooding` | being written | The Innsmouth Conspiracy: keys, flooding |
| `engine-eoe-partners-frost` | being written | Edge of the Earth: partners, frost |
| `engine-tsk-keys-concealed` | being written | The Scarlet Keys: keys, concealed cards |
| `engine-tsk-world-map` | being written | The Scarlet Keys: the world map |
| `engine-fhv-days-relationships` | being written | The Feast of Hemlock Vale: days, relationships |
| `engine-tdc-flood-levels-tasks` | being written | The Drowned City: flood levels, tasks |

### Languages

| Change | Status | Completes |
| --- | --- | --- |
| `i18n-all-locales` | ready (0/27) | card and campaign text in the nine more languages the vendored sources carry |

### Campaigns: each base campaign before its Return-to, side scenarios after their cycle

| Change | Status | Completes |
| --- | --- | --- |
| `campaign-return-to-the-night-of-the-zealot` | ready (0/24) | campaign `return-to-the-night-of-the-zealot`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-by-the-book` | being written | campaign `side-by-the-book`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-dunwich-legacy` | in progress (66/67) | campaign `the-dunwich-legacy`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-return-to-the-dunwich-legacy` | implemented (35/35) | campaign `return-to-the-dunwich-legacy`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-all-or-nothing` | being written | campaign `side-all-or-nothing`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-read-or-die` | being written | campaign `side-read-or-die`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-path-to-carcosa` | ready (0/63) | campaign `the-path-to-carcosa`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-return-to-the-path-to-carcosa` | ready (0/35) | campaign `return-to-the-path-to-carcosa`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-enthralling-encore` | being written | campaign `side-enthralling-encore`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-forgotten-age` | ready (0/71) | campaign `the-forgotten-age`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-return-to-the-forgotten-age` | ready (0/38) | campaign `return-to-the-forgotten-age`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-bad-blood` | being written | campaign `side-bad-blood`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-relics-of-the-past` | being written | campaign `side-relics-of-the-past`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-circle-undone` | being written | campaign `the-circle-undone`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-return-to-the-circle-undone` | being written | campaign `return-to-the-circle-undone`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-laid-to-rest` | being written | campaign `side-laid-to-rest`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-dream-quest` | being written | campaign `the-dream-quest`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-web-of-dreams` | being written | campaign `the-web-of-dreams`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-innsmouth-conspiracy` | being written | campaign `the-innsmouth-conspiracy`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-red-tide-rising` | being written | campaign `side-red-tide-rising`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-edge-of-the-earth` | being written | campaign `edge-of-the-earth`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-scarlet-keys` | being written | campaign `the-scarlet-keys`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-feast-of-hemlock-vale` | being written | campaign `the-feast-of-hemlock-vale`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-the-drowned-city` | being written | campaign `the-drowned-city`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-children-of-blood` | being written | campaign `children-of-blood`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-fortune-and-folly` | being written | campaign `fortune-and-folly`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-guardians-of-the-abyss` | being written | campaign `guardians-of-the-abyss`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-in-the-labyrinths-of-lunacy` | being written | campaign `side-in-the-labyrinths-of-lunacy`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-the-midwinter-gala` | being written | campaign `side-the-midwinter-gala`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-film-fatale` | being written | campaign `side-film-fatale`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-carnevale-of-horrors` | ready (0/13) | campaign `side-carnevale-of-horrors`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-murder-at-the-excelsior-hotel` | being written | campaign `side-murder-at-the-excelsior-hotel`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-blob-that-ate-everything` | being written | campaign `side-blob-that-ate-everything`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-blob-that-ate-everything-else` | being written | campaign `side-blob-that-ate-everything-else`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-war-of-the-outer-gods` | ready (0/15) | campaign `side-war-of-the-outer-gods`: its encounter cards, scenario scripts, token effects, flow |
| `campaign-side-machinations-through-time` | being written | campaign `side-machinations-through-time`: its encounter cards, scenario scripts, token effects, flow |

### Player cards

| Change | Status | Completes |
| --- | --- | --- |
| `player-cards-notz-return` | implemented (8/8) | player cards: rtnotz |
| `player-cards-dwl` | in progress (27/28) | player cards: The Dunwich Legacy packs and rtdwl |
| `player-cards-ptc` | ready (0/28) | player cards: The Path to Carcosa packs and rtptc |
| `player-cards-tfa` | ready (0/29) | player cards: The Forgotten Age packs and rttfa |
| `player-cards-tcu` | being written | player cards: The Circle Undone packs and rttcu |
| `player-cards-tde` | being written | player cards: The Dream-Eaters packs |
| `player-cards-tic` | being written | player cards: The Innsmouth Conspiracy packs |
| `player-cards-eoe` | being written | player cards: eoep, eoec |
| `player-cards-tsk` | being written | player cards: tskp, tskc |
| `player-cards-fhv` | being written | player cards: fhvp, fhvc |
| `player-cards-tdc` | being written | player cards: tdcp, tdcc |
| `player-cards-side-and-promo` | being written | player cards: side scenario packs, parallel investigators, promos |
| `player-cards-investigator-decks` | being written | player cards: the investigator starter decks |

## The packs, in play order


### Night of the Zealot and the core set

| Done | Pack | Campaign | Encounter cards left | Player cards left | Change |
| --- | --- | --- | --- | --- | --- |
| [x] | `core` | shared by every campaign | 0 of 79 | 0 of 99 | — |
| [ ] | `rtnotz` | return-to-the-night-of-the-zealot, side-by-the-book | 33 of 38 | 0 of 10 | `campaign-return-to-the-night-of-the-zealot`, `player-cards-notz-return` |

### The cycles: each deluxe box, its mythos packs, its Return-to box

| Done | Pack | Campaign | Encounter cards left | Player cards left | Change |
| --- | --- | --- | --- | --- | --- |
| [x] | `dwl` | return-to-the-dunwich-legacy, side-all-or-nothing, side-read-or-die, the-dunwich-legacy | 0 of 59 | 0 of 40 | `campaign-the-dunwich-legacy`, `player-cards-dwl` |
| [x] | `tmm` | return-to-the-dunwich-legacy, the-dunwich-legacy | 0 of 26 | 0 of 16 | `campaign-the-dunwich-legacy`, `player-cards-dwl` |
| [x] | `tece` | return-to-the-dunwich-legacy, the-dunwich-legacy | 0 of 23 | 0 of 14 | `campaign-the-dunwich-legacy`, `player-cards-dwl` |
| [x] | `bota` | return-to-the-dunwich-legacy, the-dunwich-legacy | 0 of 26 | 0 of 15 | `campaign-the-dunwich-legacy`, `player-cards-dwl` |
| [x] | `uau` | return-to-the-dunwich-legacy, the-dunwich-legacy | 0 of 23 | 0 of 12 | `campaign-the-dunwich-legacy`, `player-cards-dwl` |
| [x] | `wda` | return-to-the-dunwich-legacy, the-dunwich-legacy | 0 of 25 | 0 of 14 | `campaign-the-dunwich-legacy`, `player-cards-dwl` |
| [x] | `litas` | return-to-the-dunwich-legacy, the-dunwich-legacy | 0 of 23 | 0 of 12 | `campaign-the-dunwich-legacy`, `player-cards-dwl` |
| [x] | `rtdwl` | return-to-the-dunwich-legacy, side-all-or-nothing | 0 of 60 | 0 of 13 | `campaign-return-to-the-dunwich-legacy`, `player-cards-dwl` |
| [ ] | `ptc` | return-to-the-path-to-carcosa, side-enthralling-encore, the-path-to-carcosa | 67 of 68 | 45 of 47 | `campaign-the-path-to-carcosa`, `player-cards-ptc` |
| [ ] | `eotp` | return-to-the-path-to-carcosa, the-path-to-carcosa | 24 of 24 | 16 of 17 | `campaign-the-path-to-carcosa`, `player-cards-ptc` |
| [ ] | `tuo` | return-to-the-path-to-carcosa, the-path-to-carcosa | 30 of 30 | 13 of 13 | `campaign-the-path-to-carcosa`, `player-cards-ptc` |
| [ ] | `apot` | return-to-the-path-to-carcosa, the-path-to-carcosa | 28 of 28 | 12 of 12 | `campaign-the-path-to-carcosa`, `player-cards-ptc` |
| [ ] | `tpm` | return-to-the-path-to-carcosa, the-path-to-carcosa | 24 of 24 | 11 of 12 | `campaign-the-path-to-carcosa`, `player-cards-ptc` |
| [ ] | `bsr` | return-to-the-path-to-carcosa, the-path-to-carcosa | 32 of 32 | 11 of 11 | `campaign-the-path-to-carcosa`, `player-cards-ptc` |
| [ ] | `dca` | return-to-the-path-to-carcosa, the-path-to-carcosa | 44 of 46 | 13 of 13 | `campaign-the-path-to-carcosa`, `player-cards-ptc` |
| [ ] | `rtptc` | return-to-the-path-to-carcosa | 61 of 69 | 15 of 15 | `campaign-return-to-the-path-to-carcosa`, `player-cards-ptc` |
| [ ] | `tfa` | return-to-the-forgotten-age, side-bad-blood, side-relics-of-the-past, the-forgotten-age | 57 of 57 | 39 of 40 | `campaign-the-forgotten-age`, `player-cards-tfa` |
| [ ] | `tof` | return-to-the-forgotten-age, side-bad-blood, the-forgotten-age | 41 of 41 | 13 of 15 | `campaign-the-forgotten-age`, `player-cards-tfa` |
| [ ] | `tbb` | return-to-the-forgotten-age, the-forgotten-age | 30 of 30 | 13 of 13 | `campaign-the-forgotten-age`, `player-cards-tfa` |
| [ ] | `hote` | return-to-the-forgotten-age, the-forgotten-age | 25 of 26 | 13 of 13 | `campaign-the-forgotten-age`, `player-cards-tfa` |
| [ ] | `tcoa` | return-to-the-forgotten-age, the-forgotten-age | 25 of 25 | 10 of 10 | `campaign-the-forgotten-age`, `player-cards-tfa` |
| [ ] | `tdoy` | the-forgotten-age | 26 of 26 | 13 of 13 | `campaign-the-forgotten-age`, `player-cards-tfa` |
| [ ] | `sha` | return-to-the-forgotten-age, the-forgotten-age | 35 of 35 | 11 of 11 | `campaign-the-forgotten-age`, `player-cards-tfa` |
| [ ] | `rttfa` | return-to-the-forgotten-age | 59 of 67 | 18 of 18 | `campaign-return-to-the-forgotten-age`, `player-cards-tfa` |
| [ ] | `tcu` | return-to-the-circle-undone, side-laid-to-rest, the-circle-undone | 64 of 64 | 26 of 36 | `campaign-the-circle-undone`, `player-cards-tcu` |
| [ ] | `tsn` | return-to-the-circle-undone, the-circle-undone | 30 of 30 | 12 of 12 | `campaign-the-circle-undone`, `player-cards-tcu` |
| [ ] | `wos` | return-to-the-circle-undone, side-laid-to-rest, the-circle-undone | 46 of 46 | 11 of 11 | `campaign-the-circle-undone`, `player-cards-tcu` |
| [ ] | `fgg` | return-to-the-circle-undone, the-circle-undone | 31 of 31 | 13 of 13 | `campaign-the-circle-undone`, `player-cards-tcu` |
| [ ] | `uad` | return-to-the-circle-undone, the-circle-undone | 35 of 35 | 13 of 13 | `campaign-the-circle-undone`, `player-cards-tcu` |
| [ ] | `icc` | return-to-the-circle-undone, the-circle-undone | 31 of 31 | 11 of 11 | `campaign-the-circle-undone`, `player-cards-tcu` |
| [ ] | `bbt` | return-to-the-circle-undone, the-circle-undone | 22 of 22 | 12 of 12 | `campaign-the-circle-undone`, `player-cards-tcu` |
| [ ] | `rttcu` | return-to-the-circle-undone | 54 of 61 | 17 of 17 | `campaign-return-to-the-circle-undone`, `player-cards-tcu` |
| [ ] | `tde` | the-dream-quest, the-web-of-dreams | 70 of 70 | 37 of 37 | `campaign-the-dream-quest`, `campaign-the-web-of-dreams`, `player-cards-tde` |
| [ ] | `sfk` | the-dream-quest | 48 of 52 | 10 of 10 | `campaign-the-dream-quest`, `player-cards-tde` |
| [ ] | `tsh` | the-web-of-dreams | 26 of 27 | 13 of 14 | `campaign-the-web-of-dreams`, `player-cards-tde` |
| [ ] | `dsm` | the-dream-quest | 26 of 26 | 14 of 14 | `campaign-the-dream-quest`, `player-cards-tde` |
| [ ] | `pnr` | the-web-of-dreams | 38 of 39 | 15 of 15 | `campaign-the-web-of-dreams`, `player-cards-tde` |
| [ ] | `wgd` | the-dream-quest | 37 of 37 | 10 of 10 | `campaign-the-dream-quest`, `player-cards-tde` |
| [ ] | `woc` | the-web-of-dreams | 22 of 22 | 10 of 10 | `campaign-the-web-of-dreams`, `player-cards-tde` |
| [ ] | `tic` | side-red-tide-rising, the-innsmouth-conspiracy | 66 of 66 | 37 of 37 | `campaign-the-innsmouth-conspiracy`, `player-cards-tic` |
| [ ] | `itd` | the-innsmouth-conspiracy | 27 of 27 | 16 of 17 | `campaign-the-innsmouth-conspiracy`, `player-cards-tic` |
| [ ] | `def` | the-innsmouth-conspiracy | 28 of 28 | 15 of 15 | `campaign-the-innsmouth-conspiracy`, `player-cards-tic` |
| [ ] | `hhg` | the-innsmouth-conspiracy | 29 of 29 | 13 of 13 | `campaign-the-innsmouth-conspiracy`, `player-cards-tic` |
| [ ] | `lif` | the-innsmouth-conspiracy | 31 of 31 | 11 of 11 | `campaign-the-innsmouth-conspiracy`, `player-cards-tic` |
| [ ] | `lod` | the-innsmouth-conspiracy | 27 of 27 | 15 of 15 | `campaign-the-innsmouth-conspiracy`, `player-cards-tic` |
| [ ] | `itm` | the-innsmouth-conspiracy | 29 of 29 | 11 of 11 | `campaign-the-innsmouth-conspiracy`, `player-cards-tic` |

### The campaign boxes, with their investigator boxes

| Done | Pack | Campaign | Encounter cards left | Player cards left | Change |
| --- | --- | --- | --- | --- | --- |
| [ ] | `eoep` | — | 0 of 0 | 131 of 132 | `player-cards-eoe` |
| [ ] | `eoec` | edge-of-the-earth | 223 of 223 | 42 of 43 | `campaign-edge-of-the-earth`, `player-cards-eoe` |
| [ ] | `tskp` | — | 0 of 0 | 120 of 122 | `player-cards-tsk` |
| [ ] | `tskc` | the-scarlet-keys | 276 of 277 | 34 of 34 | `campaign-the-scarlet-keys`, `player-cards-tsk` |
| [ ] | `fhvp` | — | 0 of 0 | 133 of 133 | `player-cards-fhv` |
| [ ] | `fhvc` | the-feast-of-hemlock-vale | 271 of 272 | 28 of 28 | `campaign-the-feast-of-hemlock-vale`, `player-cards-fhv` |
| [ ] | `tdcp` | — | 0 of 0 | 122 of 122 | `player-cards-tdc` |
| [ ] | `tdcc` | the-drowned-city | 258 of 259 | 36 of 36 | `campaign-the-drowned-city`, `player-cards-tdc` |
| [x] | `core_2026` | brethren-of-ash | 0 of 89 | 0 of 72 | — |
| [ ] | `cob` | children-of-blood | 110 of 111 | 8 of 8 | `campaign-children-of-blood`, `player-cards-side-and-promo` |

The campaign boxes by scenario. A row is done when the scenario is complete: its cards work, its token effects are real on all four difficulties, and it has a scenario script.


**`eoec` — edge-of-the-earth**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `ice-and-death-part-1` | 32 of 33 | not yet | no |
| [ ] | scenario `ice-and-death-part-2` | 49 of 49 | not yet | no |
| [ ] | scenario `ice-and-death-part-3` | 54 of 54 | not yet | no |
| [ ] | scenario `to-the-forbidden-peaks` | 36 of 36 | not yet | no |
| [ ] | scenario `city-of-the-elder-things` | 39 of 40 | not yet | no |
| [ ] | scenario `the-heart-of-madness-part-1` | 32 of 34 | not yet | no |
| [ ] | scenario `the-heart-of-madness-part-2` | 43 of 49 | not yet | no |
| [ ] | scenario `fatal-mirage-2` | 87 of 89 | not yet | no |
| [ ] | scenario `fatal-mirage-3` | 87 of 89 | not yet | no |
| [ ] | scenario `fatal-mirage` | 87 of 89 | not yet | no |

**`tskc` — the-scarlet-keys**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `riddles-and-rain` | 33 of 39 | not yet | no |
| [ ] | scenario `marrakesh` | 33 of 39 | not yet | no |
| [ ] | scenario `buenos-aires` | 31 of 34 | not yet | no |
| [ ] | scenario `istanbul` | 33 of 41 | not yet | no |
| [ ] | scenario `havana` | 35 of 36 | not yet | no |
| [ ] | scenario `anchorage` | 45 of 47 | not yet | no |
| [ ] | scenario `alexandria` | 37 of 40 | not yet | no |
| [ ] | scenario `kuala-lampur` | 53 of 56 | not yet | no |
| [ ] | scenario `bermuda-triangle` | 33 of 33 | not yet | no |
| [ ] | scenario `tunguska` | 57 of 62 | not yet | no |

**`fhvc` — the-feast-of-hemlock-vale**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `fhv-prologue` | 41 of 41 | not yet | no |
| [ ] | scenario `written-in-rock` | 54 of 59 | not yet | no |
| [ ] | scenario `hemlock-house` | 66 of 68 | not yet | no |
| [ ] | scenario `the-silent-heath` | 56 of 59 | not yet | no |
| [ ] | scenario `the-lost-sister` | 57 of 57 | not yet | no |
| [ ] | scenario `the-thing-in-the-depths` | 53 of 54 | not yet | no |
| [ ] | scenario `dawn-of-the-second-day` | 42 of 42 | not yet | no |
| [ ] | scenario `the-twisted-hollow` | 55 of 55 | not yet | no |
| [ ] | scenario `the-longest-night` | 58 of 66 | not yet | no |
| [ ] | scenario `dawn-of-the-final-day` | 50 of 50 | not yet | no |
| [ ] | scenario `the-final-evening` | 48 of 48 | not yet | no |
| [ ] | scenario `fate-of-the-vale` | 93 of 93 | not yet | no |

**`tdcc` — the-drowned-city**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `one-last-job` | 19 of 39 | not yet | no |
| [ ] | scenario `the-western-wall` | 40 of 42 | not yet | no |
| [ ] | scenario `the-drowned-quarter` | 38 of 38 | not yet | no |
| [ ] | scenario `the-apiary` | 43 of 49 | not yet | no |
| [ ] | scenario `the-grand-vault` | 40 of 40 | not yet | no |
| [ ] | scenario `court-of-the-ancients` | 43 of 43 | not yet | no |
| [ ] | scenario `obsidian-canyons` | 48 of 56 | not yet | no |
| [ ] | scenario `sepulchre-of-the-sleeper` | 21 of 25 | not yet | no |
| [ ] | scenario `the-doom-of-arkham-part-1` | 19 of 35 | not yet | no |
| [ ] | scenario `the-doom-of-arkham-part-2` | 48 of 61 | not yet | no |

**`cob` — children-of-blood**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `river-of-blood` | 45 of 49 | not yet | no |
| [ ] | scenario `new-horizons` | 49 of 51 | not yet | no |
| [ ] | scenario `blood-money` | 41 of 43 | not yet | no |

**`fof` — fortune-and-folly**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `fortune-and-folly-part-1` | 72 of 72 | not yet | no |
| [ ] | scenario `fortune-and-folly-part-2` | 72 of 72 | not yet | no |

**`guardians` — guardians-of-the-abyss**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `the-eternal-slumber` | 47 of 47 | not yet | no |
| [ ] | scenario `the-nights-usurper` | 52 of 53 | not yet | no |

### The side scenarios

| Done | Pack | Campaign | Encounter cards left | Player cards left | Change |
| --- | --- | --- | --- | --- | --- |
| [ ] | `lol` | side-in-the-labyrinths-of-lunacy | 57 of 58 | 9 of 9 | `campaign-side-in-the-labyrinths-of-lunacy`, `player-cards-side-and-promo` |
| [ ] | `tmg` | side-the-midwinter-gala | 51 of 51 | 23 of 23 | `campaign-side-the-midwinter-gala`, `player-cards-side-and-promo` |
| [ ] | `film_fatale` | side-film-fatale | 56 of 59 | 5 of 5 | `campaign-side-film-fatale`, `player-cards-side-and-promo` |
| [ ] | `cotr` | — | 31 of 31 | 5 of 5 | `player-cards-side-and-promo` |
| [ ] | `coh` | side-carnevale-of-horrors | 32 of 33 | 7 of 7 | `campaign-side-carnevale-of-horrors`, `player-cards-side-and-promo` |
| [ ] | `guardians` | guardians-of-the-abyss | 65 of 66 | 4 of 4 | `campaign-guardians-of-the-abyss`, `player-cards-side-and-promo` |
| [ ] | `hotel` | side-murder-at-the-excelsior-hotel | 44 of 44 | 8 of 8 | `campaign-side-murder-at-the-excelsior-hotel`, `player-cards-side-and-promo` |
| [ ] | `blob` | side-blob-that-ate-everything-else, side-blob-that-ate-everything | 46 of 46 | 7 of 7 | `campaign-side-blob-that-ate-everything`, `player-cards-side-and-promo` |
| [ ] | `wog` | side-war-of-the-outer-gods | 53 of 53 | 5 of 5 | `campaign-side-war-of-the-outer-gods`, `player-cards-side-and-promo` |
| [ ] | `mtt` | side-machinations-through-time | 58 of 58 | 11 of 11 | `campaign-side-machinations-through-time`, `player-cards-side-and-promo` |
| [ ] | `fof` | fortune-and-folly | 84 of 84 | 5 of 5 | `campaign-fortune-and-folly`, `player-cards-side-and-promo` |
| [ ] | `blbe` | side-blob-that-ate-everything-else | 19 of 19 | 11 of 11 | `campaign-side-blob-that-ate-everything-else`, `player-cards-side-and-promo` |
| [ ] | `rod` | side-read-or-die | 4 of 4 | 2 of 2 | `campaign-side-read-or-die`, `player-cards-side-and-promo` |
| [ ] | `aon` | side-all-or-nothing | 6 of 6 | 2 of 2 | `campaign-side-all-or-nothing`, `player-cards-side-and-promo` |
| [ ] | `bad` | side-bad-blood | 5 of 5 | 2 of 2 | `campaign-side-bad-blood`, `player-cards-side-and-promo` |
| [ ] | `btb` | side-by-the-book | 6 of 6 | 7 of 7 | `campaign-side-by-the-book`, `player-cards-side-and-promo` |
| [ ] | `rtr` | side-red-tide-rising | 4 of 4 | 5 of 5 | `campaign-side-red-tide-rising`, `player-cards-side-and-promo` |
| [ ] | `ltr` | side-laid-to-rest | 6 of 6 | 5 of 5 | `campaign-side-laid-to-rest`, `player-cards-side-and-promo` |
| [ ] | `rop` | side-relics-of-the-past | 10 of 10 | 6 of 6 | `campaign-side-relics-of-the-past`, `player-cards-side-and-promo` |
| [ ] | `enc` | side-enthralling-encore | 4 of 4 | 6 of 6 | `campaign-side-enthralling-encore`, `player-cards-side-and-promo` |

### The investigator starter decks, promos and parallel investigators

| Done | Pack | Campaign | Encounter cards left | Player cards left | Change |
| --- | --- | --- | --- | --- | --- |
| [x] | `nat` | — | 0 of 0 | 0 of 28 | — |
| [ ] | `tom` | — | 0 of 0 | 28 of 28 | `player-cards-investigator-decks` |
| [ ] | `har` | — | 0 of 0 | 29 of 29 | `player-cards-investigator-decks` |
| [ ] | `car` | — | 0 of 0 | 27 of 27 | `player-cards-investigator-decks` |
| [ ] | `win` | — | 0 of 0 | 24 of 25 | `player-cards-investigator-decks` |
| [ ] | `and` | — | 0 of 0 | 27 of 27 | `player-cards-investigator-decks` |
| [ ] | `jac` | — | 0 of 0 | 26 of 26 | `player-cards-investigator-decks` |
| [ ] | `mar` | — | 0 of 0 | 28 of 28 | `player-cards-investigator-decks` |
| [ ] | `ste` | — | 0 of 0 | 24 of 24 | `player-cards-investigator-decks` |
| [ ] | `mig` | — | 0 of 0 | 28 of 30 | `player-cards-investigator-decks` |
| [ ] | `otr` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `ptr` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `hfa` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `aof` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `pap` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `hoth` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `tdor` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `iotv` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `tftbw` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `tdg` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `bob` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `dre` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
| [ ] | `promo` | — | 0 of 0 | 2 of 2 | `player-cards-side-and-promo` |
