# Campaign program

The plan for making every campaign complete, one pack at a time (ADR-0012). It was generated once from `content/coverage.json`
(`npm run coverage`) and is kept by hand: each pack's change ticks its row and updates its counts.

A pack is a card pack as ArkhamDB names it (the code on the card, `pack`): a deluxe box, a mythos pack, a Return-to box, an investigator
box. **Counts** are the cards that do not work yet out of the pack's cards: *encounter* (what a campaign's scenarios draw) and *player*
(assets, events, skills, weaknesses). A campaign is complete when every card its scenarios use works and every scenario has a scenario
script, so the encounter side of a pack gates its campaign; the player side gates the pack alone, since any investigator may bring the cards.

## What a pack's change does

One change per pack, each the size of Night of the Zealot's work or smaller and playable on its own. **A campaign box** (a pack that holds a whole campaign: `eoec`, `tskc`, `fhvc`, `tdcc`, `cob`, `fof`, `guardians`) **is worked one scenario at a time**: its scenarios are listed under it below, and each scenario's change is done when `content/coverage.json` reports that scenario complete (ADR-0013). A Return-to scenario plays with its base scenario's reference card, so its change starts from the base scenario's script and token tables.

1. the engine features its cards need (a cycle's new mechanics come first, see below);
2. its encounter cards and player cards, with their tests;
3. its scenario script, for the pack's scenarios;
4. the real chaos token effects of its scenarios (in the scenario files, not placeholders);
5. its location connections, checked against the printed campaign guide in `inspired/`;
6. a bot playthrough of its scenario to a resolution;
7. for a campaign's last pack, the move of the campaign from `content/campaigns-generated/` to `content/campaigns/` (the campaign's `generated` flag goes with it).

The change is **done** when `npm run coverage` reports the pack (and, for its last pack, the campaign) complete: the committed
`content/coverage.json` going up is the diff that shows it. Coverage is the progress measure, not the quality gate: a card whose written
abilities cover only part of its text counts as working, so the bot playthroughs and the card tests are the real check.

## Cycles whose mechanics need a change of their own first

| Cycle | Mechanics |
| --- | --- |
| The Forgotten Age | supplies, vengeance, exploration |
| The Circle Undone | tarot, hidden cards |
| The Dream-Eaters | linked campaigns (The Dream-Quest, The Web of Dreams) |
| The Innsmouth Conspiracy | keys, flooding |
| Edge of the Earth | partners, frost |
| The Scarlet Keys | keys, concealed cards |
| The Feast of Hemlock Vale | days, relationships |

## The packs, in play order


### Night of the Zealot and the core set

| Done | Pack | Campaign | Encounter cards left | Player cards left |
| --- | --- | --- | --- | --- |
| [x] | `core` | shared by every campaign | 0 of 79 | 0 of 99 |
| [ ] | `rtnotz` | return-to-the-night-of-the-zealot, side-by-the-book | 30 of 38 | 10 of 10 |

### The cycles: each deluxe box, its mythos packs, its Return-to box

| Done | Pack | Campaign | Encounter cards left | Player cards left |
| --- | --- | --- | --- | --- |
| [ ] | `dwl` | return-to-the-dunwich-legacy, side-all-or-nothing, side-read-or-die, the-dunwich-legacy | 54 of 59 | 39 of 40 |
| [ ] | `tmm` | return-to-the-dunwich-legacy, the-dunwich-legacy | 25 of 26 | 14 of 16 |
| [ ] | `tece` | return-to-the-dunwich-legacy, the-dunwich-legacy | 18 of 23 | 14 of 14 |
| [ ] | `bota` | return-to-the-dunwich-legacy, the-dunwich-legacy | 23 of 26 | 15 of 15 |
| [ ] | `uau` | return-to-the-dunwich-legacy, the-dunwich-legacy | 23 of 23 | 12 of 12 |
| [ ] | `wda` | return-to-the-dunwich-legacy, the-dunwich-legacy | 22 of 25 | 13 of 14 |
| [ ] | `litas` | return-to-the-dunwich-legacy, the-dunwich-legacy | 23 of 23 | 12 of 12 |
| [ ] | `rtdwl` | return-to-the-dunwich-legacy, side-all-or-nothing | 58 of 60 | 12 of 13 |
| [ ] | `ptc` | return-to-the-path-to-carcosa, side-enthralling-encore, the-path-to-carcosa | 64 of 68 | 47 of 47 |
| [ ] | `eotp` | return-to-the-path-to-carcosa, the-path-to-carcosa | 22 of 24 | 16 of 17 |
| [ ] | `tuo` | return-to-the-path-to-carcosa, the-path-to-carcosa | 27 of 30 | 13 of 13 |
| [ ] | `apot` | return-to-the-path-to-carcosa, the-path-to-carcosa | 28 of 28 | 12 of 12 |
| [ ] | `tpm` | return-to-the-path-to-carcosa, the-path-to-carcosa | 23 of 24 | 11 of 12 |
| [ ] | `bsr` | return-to-the-path-to-carcosa, the-path-to-carcosa | 29 of 32 | 11 of 11 |
| [ ] | `dca` | return-to-the-path-to-carcosa, the-path-to-carcosa | 44 of 46 | 13 of 13 |
| [ ] | `rtptc` | return-to-the-path-to-carcosa | 68 of 69 | 15 of 15 |
| [ ] | `tfa` | return-to-the-forgotten-age, side-bad-blood, side-relics-of-the-past, the-forgotten-age | 57 of 57 | 39 of 40 |
| [ ] | `tof` | return-to-the-forgotten-age, side-bad-blood, the-forgotten-age | 41 of 41 | 15 of 15 |
| [ ] | `tbb` | return-to-the-forgotten-age, the-forgotten-age | 27 of 30 | 12 of 13 |
| [ ] | `hote` | return-to-the-forgotten-age, the-forgotten-age | 24 of 26 | 13 of 13 |
| [ ] | `tcoa` | return-to-the-forgotten-age, the-forgotten-age | 25 of 25 | 10 of 10 |
| [ ] | `tdoy` | the-forgotten-age | 21 of 26 | 13 of 13 |
| [ ] | `sha` | return-to-the-forgotten-age, the-forgotten-age | 35 of 35 | 11 of 11 |
| [ ] | `rttfa` | return-to-the-forgotten-age | 67 of 67 | 18 of 18 |
| [ ] | `tcu` | return-to-the-circle-undone, side-laid-to-rest, the-circle-undone | 62 of 64 | 36 of 36 |
| [ ] | `tsn` | return-to-the-circle-undone, the-circle-undone | 30 of 30 | 12 of 12 |
| [ ] | `wos` | return-to-the-circle-undone, side-laid-to-rest, the-circle-undone | 45 of 46 | 11 of 11 |
| [ ] | `fgg` | return-to-the-circle-undone, the-circle-undone | 28 of 31 | 13 of 13 |
| [ ] | `uad` | return-to-the-circle-undone, the-circle-undone | 32 of 35 | 13 of 13 |
| [ ] | `icc` | return-to-the-circle-undone, the-circle-undone | 31 of 31 | 11 of 11 |
| [ ] | `bbt` | return-to-the-circle-undone, the-circle-undone | 22 of 22 | 12 of 12 |
| [ ] | `rttcu` | return-to-the-circle-undone | 61 of 61 | 17 of 17 |
| [ ] | `tde` | the-dream-quest, the-web-of-dreams | 68 of 70 | 37 of 37 |
| [ ] | `sfk` | the-dream-quest | 52 of 52 | 10 of 10 |
| [ ] | `tsh` | the-web-of-dreams | 26 of 27 | 13 of 14 |
| [ ] | `dsm` | the-dream-quest | 24 of 26 | 14 of 14 |
| [ ] | `pnr` | the-web-of-dreams | 38 of 39 | 15 of 15 |
| [ ] | `wgd` | the-dream-quest | 33 of 37 | 10 of 10 |
| [ ] | `woc` | the-web-of-dreams | 22 of 22 | 10 of 10 |
| [ ] | `tic` | side-red-tide-rising, the-innsmouth-conspiracy | 65 of 66 | 37 of 37 |
| [ ] | `itd` | the-innsmouth-conspiracy | 27 of 27 | 17 of 17 |
| [ ] | `def` | the-innsmouth-conspiracy | 28 of 28 | 15 of 15 |
| [ ] | `hhg` | the-innsmouth-conspiracy | 29 of 29 | 13 of 13 |
| [ ] | `lif` | the-innsmouth-conspiracy | 31 of 31 | 11 of 11 |
| [ ] | `lod` | the-innsmouth-conspiracy | 27 of 27 | 15 of 15 |
| [ ] | `itm` | the-innsmouth-conspiracy | 28 of 29 | 11 of 11 |

### The campaign boxes, with their investigator boxes

| Done | Pack | Campaign | Encounter cards left | Player cards left |
| --- | --- | --- | --- | --- |
| [ ] | `eoep` | — | 0 of 0 | 131 of 132 |
| [ ] | `eoec` | edge-of-the-earth | 218 of 223 | 42 of 43 |
| [ ] | `tskp` | — | 0 of 0 | 122 of 122 |
| [ ] | `tskc` | the-scarlet-keys | 268 of 277 | 34 of 34 |
| [ ] | `fhvp` | — | 0 of 0 | 133 of 133 |
| [ ] | `fhvc` | the-feast-of-hemlock-vale | 270 of 272 | 28 of 28 |
| [ ] | `tdcp` | — | 0 of 0 | 122 of 122 |
| [ ] | `tdcc` | the-drowned-city | 256 of 259 | 36 of 36 |
| [ ] | `core_2026` | shared by every campaign | 88 of 89 | 70 of 72 |
| [ ] | `cob` | children-of-blood | 105 of 111 | 8 of 8 |

The campaign boxes by scenario. A row is done when the scenario is complete: its cards work, its token effects are real on all four difficulties, and it has a scenario script.


**`eoec` — edge-of-the-earth**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `ice-and-death-part-1` | 32 of 33 | not yet | no |
| [ ] | scenario `ice-and-death-part-2` | 46 of 49 | not yet | no |
| [ ] | scenario `ice-and-death-part-3` | 50 of 54 | not yet | no |
| [ ] | scenario `to-the-forbidden-peaks` | 36 of 36 | not yet | no |
| [ ] | scenario `city-of-the-elder-things` | 39 of 40 | not yet | no |
| [ ] | scenario `the-heart-of-madness-part-1` | 32 of 34 | not yet | no |
| [ ] | scenario `the-heart-of-madness-part-2` | 42 of 49 | not yet | no |
| [ ] | scenario `fatal-mirage-2` | 87 of 89 | not yet | no |
| [ ] | scenario `fatal-mirage-3` | 87 of 89 | not yet | no |
| [ ] | scenario `fatal-mirage` | 87 of 89 | not yet | no |

**`tskc` — the-scarlet-keys**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `riddles-and-rain` | 32 of 54 | not yet | no |
| [ ] | scenario `marrakesh` | 33 of 39 | not yet | no |
| [ ] | scenario `buenos-aires` | 31 of 34 | not yet | no |
| [ ] | scenario `istanbul` | 34 of 56 | not yet | no |
| [ ] | scenario `havana` | 35 of 36 | not yet | no |
| [ ] | scenario `anchorage` | 42 of 47 | not yet | no |
| [ ] | scenario `alexandria` | 37 of 40 | not yet | no |
| [ ] | scenario `kuala-lampur` | 52 of 56 | not yet | no |
| [ ] | scenario `bermuda-triangle` | 33 of 33 | not yet | no |
| [ ] | scenario `tunguska` | 55 of 62 | not yet | no |

**`fhvc` — the-feast-of-hemlock-vale**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `written-in-rock` | 54 of 59 | not yet | no |
| [ ] | scenario `hemlock-house` | 65 of 68 | not yet | no |
| [ ] | scenario `the-silent-heath` | 56 of 59 | not yet | no |
| [ ] | scenario `the-lost-sister` | 57 of 57 | not yet | no |
| [ ] | scenario `the-thing-in-the-depths` | 53 of 54 | not yet | no |
| [ ] | scenario `the-twisted-hollow` | 55 of 55 | not yet | no |
| [ ] | scenario `the-longest-night` | 59 of 81 | not yet | no |
| [ ] | scenario `dawn-of-the-final-day` | 50 of 50 | not yet | no |
| [ ] | scenario `the-final-evening` | 48 of 48 | not yet | no |
| [ ] | scenario `fate-of-the-vale` | 93 of 93 | not yet | no |

**`tdcc` — the-drowned-city**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `one-last-job` | 20 of 45 | not yet | no |
| [ ] | scenario `the-western-wall` | 40 of 42 | not yet | no |
| [ ] | scenario `the-drowned-quarter` | 38 of 38 | not yet | no |
| [ ] | scenario `the-apiary` | 42 of 49 | not yet | no |
| [ ] | scenario `the-grand-vault` | 40 of 40 | not yet | no |
| [ ] | scenario `court-of-the-ancients` | 42 of 43 | not yet | no |
| [ ] | scenario `obsidian-canyons` | 48 of 56 | not yet | no |
| [ ] | scenario `the-doom-of-arkham-part-1` | 20 of 39 | not yet | no |
| [ ] | scenario `the-doom-of-arkham-part-2` | 49 of 68 | not yet | no |

**`cob` — children-of-blood**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `river-of-blood` | 47 of 49 | not yet | no |
| [ ] | scenario `new-horizons` | 47 of 51 | not yet | no |
| [ ] | scenario `blood-money` | 43 of 43 | not yet | no |

**`fof` — fortune-and-folly**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `fortune-and-folly-part-1` | 72 of 72 | not yet | no |
| [ ] | scenario `fortune-and-folly-part-2` | 72 of 72 | not yet | no |

**`guardians` — guardians-of-the-abyss**

| Done | Scenario | Cards left | Tokens | Script |
| --- | --- | --- | --- | --- |
| [ ] | scenario `the-eternal-slumber` | 47 of 47 | not yet | no |
| [ ] | scenario `the-nights-usurper` | 51 of 53 | not yet | no |

### The side scenarios

| Done | Pack | Campaign | Encounter cards left | Player cards left |
| --- | --- | --- | --- | --- |
| [ ] | `lol` | side-in-the-labyrinths-of-lunacy | 55 of 58 | 9 of 9 |
| [ ] | `tmg` | side-the-midwinter-gala | 51 of 51 | 23 of 23 |
| [ ] | `film_fatale` | side-film-fatale | 56 of 59 | 5 of 5 |
| [ ] | `cotr` | — | 28 of 31 | 5 of 5 |
| [ ] | `coh` | side-carnevale-of-horrors | 31 of 33 | 7 of 7 |
| [ ] | `guardians` | guardians-of-the-abyss | 64 of 66 | 4 of 4 |
| [ ] | `hotel` | side-murder-at-the-excelsior-hotel | 44 of 44 | 8 of 8 |
| [ ] | `blob` | side-blob-that-ate-everything-else, side-blob-that-ate-everything | 46 of 46 | 7 of 7 |
| [ ] | `wog` | side-war-of-the-outer-gods | 53 of 53 | 5 of 5 |
| [ ] | `mtt` | side-machinations-through-time | 58 of 58 | 11 of 11 |
| [ ] | `fof` | fortune-and-folly | 84 of 84 | 5 of 5 |
| [ ] | `blbe` | side-blob-that-ate-everything-else | 19 of 19 | 11 of 11 |
| [ ] | `rod` | side-read-or-die | 4 of 4 | 2 of 2 |
| [ ] | `aon` | side-all-or-nothing | 6 of 6 | 2 of 2 |
| [ ] | `bad` | side-bad-blood | 5 of 5 | 2 of 2 |
| [ ] | `btb` | side-by-the-book | 6 of 6 | 7 of 7 |
| [ ] | `rtr` | side-red-tide-rising | 4 of 4 | 5 of 5 |
| [ ] | `ltr` | side-laid-to-rest | 6 of 6 | 5 of 5 |
| [ ] | `rop` | side-relics-of-the-past | 10 of 10 | 6 of 6 |
| [ ] | `enc` | side-enthralling-encore | 4 of 4 | 6 of 6 |

### The investigator starter decks, promos and parallel investigators

| Done | Pack | Campaign | Encounter cards left | Player cards left |
| --- | --- | --- | --- | --- |
| [x] | `nat` | — | 0 of 0 | 0 of 28 |
| [ ] | `tom` | — | 0 of 0 | 28 of 28 |
| [ ] | `har` | — | 0 of 0 | 29 of 29 |
| [ ] | `car` | — | 0 of 0 | 27 of 27 |
| [ ] | `win` | — | 0 of 0 | 24 of 25 |
| [ ] | `and` | — | 0 of 0 | 27 of 27 |
| [ ] | `jac` | — | 0 of 0 | 26 of 26 |
| [ ] | `mar` | — | 0 of 0 | 28 of 28 |
| [ ] | `ste` | — | 0 of 0 | 24 of 24 |
| [ ] | `mig` | — | 0 of 0 | 28 of 30 |
| [ ] | `otr` | — | 0 of 0 | 2 of 2 |
| [ ] | `ptr` | — | 0 of 0 | 2 of 2 |
| [ ] | `hfa` | — | 0 of 0 | 2 of 2 |
| [ ] | `aof` | — | 0 of 0 | 2 of 2 |
| [ ] | `pap` | — | 0 of 0 | 2 of 2 |
| [ ] | `hoth` | — | 0 of 0 | 2 of 2 |
| [ ] | `tdor` | — | 0 of 0 | 2 of 2 |
| [ ] | `iotv` | — | 0 of 0 | 2 of 2 |
| [ ] | `tftbw` | — | 0 of 0 | 2 of 2 |
| [ ] | `tdg` | — | 0 of 0 | 2 of 2 |
| [ ] | `bob` | — | 0 of 0 | 2 of 2 |
| [ ] | `dre` | — | 0 of 0 | 2 of 2 |
| [ ] | `promo` | — | 0 of 0 | 2 of 2 |
