## 1. The Untamed Wilds (04043) and the campaign's move

- [ ] 1.1 `git mv content/campaigns-generated/the-forgotten-age content/campaigns/the-forgotten-age`; `generated: false`; `scripts/import-campaigns.ts` skips it; `scripts/` folder created; `pnpm check:content` passes on the moved files unchanged.
- [ ] 1.2 Vocabulary, test first (`src/engine/effects/__tests__/`): `eachInvestigator { each: Effect[] }` with a per-investigator `chooseOne` (04082, 04087), stat modifier per `vengeanceInVictory` (04083), keyword gain under a condition (04084), test difficulty per vengeance and trait gain in the threat area (04085), `enemyAttack` each investigator at connecting locations (04086), `cannotMove`/`cannotExplore` flags with an end-of-turn discard (04081), the Explore-attached location block (04076); schema, `EFFECT_OPS`, one test each.
- [ ] 1.3 Symbols from the scans into `content/packs/tfa/cards.json` for the Rainforest locations 04069–04075 and Expedition Camp 04050 (`symbol`, `connectsTo`); test: every exploration location reaches the camp.
- [ ] 1.4 Setup in `scenarios/wilds.json`, test first: Expedition Camp in play and the start; `buildExploration` with 04069–04073 and one each of 04081, 04076, 04080, 04082, 04087; 04053, 04074, 04075 set aside; the Agents of Yig set set aside; Poisoned ×4 set aside; acts 04046, 04047, 04048/04049 by the act 2 outcome; agendas 04044, 04045.
- [ ] 1.5 Token table from 04043: Easy/Standard skull −X (vengeance), cultist −X (locations in play, max 5), tablet −X (exploration deck, max 5), elder thing −2 and auto-fail if poisoned; Hard/Expert skull −(X+1), cultist −X, tablet −X (min 3), elder thing −3 auto-fail if poisoned else a Poisoned on a failure; test per difficulty.
- [ ] 1.6 Shared sets in `cards.json`, test per card: data 04079, 04080, 04082, 04087, 04088, 04092, 04098, 04100, 04101, 04069–04075, 04076, 04077, 04081; scripts `content/packs/tfa/scripts/` 04078, 04083, 04084, 04085, 04086, 04089, 04093, 04094, 04096, 04097, 04099, 04090, 04091, 04095.
- [ ] 1.7 Scenario cards, test per card: data 04050 (resign; map look-at-3), 04051 Alejandro Vela, 04052 Ichtaca (parley), 04053; scripts 04044, 04045 (backs: shuffle the discard and Agents of Yig in; the Poisoned to each non-poisoned deck), 04046, 04047, 04048, 04049.
- [ ] 1.8 `scripts/wilds.ts`: Ruins into play by act, act 3 version by Ichtaca's outcome, R1/R2 and no-resolution, `ended` writes the vengeance record; a test plays R1 and R2 with `src/engine/kits/testkit.ts`, and a bot explores to the Ruins.
- [ ] 1.9 `pnpm coverage`: `scenarios["wilds"]` complete.

## 2. The Doom of Eztli (04054)

- [ ] 2.1 Vocabulary: test whose difficulty drops per failure, `cannotMove`/`cannotDisengage` (04089), `retaliate while exhausted` and vanish keeping damage (04062, a script over the set-aside zone), `consideredInVictory` while an enemy is here (04066), the Relic attached with doom (04068), token `instead` with doom on your location and `x: locationsWithDoom | doomOnLocations`.
- [ ] 2.2 Symbols for 04060, 04063–04068 from the scans; setup in `scenarios/eztli.json`: Entryway in play and the start; `buildExploration` 04063–04067, 04092, 04094, 04088, 04089, 01167; Relic 04061, Harbinger 04062, Chamber of Time 04068 set aside; Poisoned set aside; doom on the Entryway per `eztli_replays`; test.
- [ ] 2.3 Token table from 04054: Easy/Standard skull −1 (−3 with doom on your location), cultist and tablet −X (locations with doom), elder thing reveal another and a doom on your location on a failure; Hard/Expert skull −2 (−4), cultist and tablet −X (doom on locations), elder thing a doom always; tests.
- [ ] 2.4 Cards: data 04063, 04064 (flip clue to doom), 04065, 04067 (rope), 04068; scripts 04055, 04056 (defeat the unresigned), 04057, 04058 (Chamber of Time; the group spend), 04059, 04060, 04062 Harbinger of Valusia, 04066.
- [ ] 2.5 `scripts/eztli.ts`: defeat check before the resolutions, no-resolution before act 3 to R3, R1, R3, R4 as a replay with the counter, `ended` writes `count:tfa:harbinger_damage` and the vengeance; tests per resolution.
- [ ] 2.6 `pnpm coverage`: `eztli` complete.

## 3. Threads of Fate (04113)

- [ ] 3.1 Failing test first: three act decks (`engine-scenario-structure`), deck 1 from 04117a–04124, deck 2 from 04125a–04132, deck 3 from 04133a–04140, each the version chosen by `when` (relic custody; the police choice as a flow input; Ichtaca's tale); agendas 04114–04116; the Midnight Masks subset only (2× False Lead, 3× Hunting Shadow, the five Arkham locations); in play 01134, 01130, 01132, 01129, 01125, 04142, 04141; Town Hall 04143, Ichtaca 04147, Expedition Journal 04148 set aside; Alejandro Vela and the Relic pulled from the decks; start at Rivertown.
- [ ] 3.2 Token table from 04113: Easy/Standard skull −X (highest doom on a Cultist), cultist −2 and 1 damage unless succeeded by 1, tablet −2 and doom on the nearest Cultist unless by 1, elder thing −2 and a clue lost on a failure; Hard/Expert skull −X (total doom), cultist −2 direct damage unless by 2, tablet −2 doom on each Cultist unless by 2, elder thing −3; tests.
- [ ] 3.3 Connections from the guide's map (p.93) and the cards: Curiositie Shoppe–Northside, Northside–Downtown, Downtown–Easttown, Easttown–Velma's Diner, Northside–Miskatonic, Easttown–Rivertown, and Miskatonic–Rivertown only if the scans of 01129 and 01125 print it; Town Hall–Downtown, Arkham Police Station–Easttown, Train Tracks–Northside when they enter play; `oneWay` empty; test.
- [ ] 3.4 Cards: data 04141, 04142, 04143, 04147 Ichtaca, 04148, 04145; scripts 04114, 04115, 04116, the 24 acts 04117a–04140 (objectives on clues, attachments and the flipped b-sides), 04144, 04146, the Pnakotic Brotherhood cards not done in group 1.
- [ ] 3.5 `scripts/threads-of-fate.ts`: each deck's final back records its outcome, the resign action, the resolution by decks completed; tests.
- [ ] 3.6 `pnpm coverage`: `threads-of-fate` complete.

## 4. The Boundary Beyond (04161)

- [ ] 4.1 Symbols for 04168–04185 from the scans; setup in `scenarios/the-boundary-beyond.json`, test first: the six Present-Day locations in play, the start chosen between the Zócalo and Coyoacán (a flow input), `buildExploration` 04174–04185, 04189, 04190, 04090, 04091; act 3a and agenda 3a set aside outside the decks; Padma 04186 set aside; sets by the campaign bag (`when: bagHas` cultist ≥2 → Pnakotic Brotherhood and Dark Cult; tablet ≥2 → Yig's Venom and Guardians of Time; else Pnakotic Brotherhood and Guardians of Time).
- [ ] 4.2 Token table from 04161: Easy/Standard skull −1 (−3 at an Ancient location), cultist reveal another and doom on a Cultist on a failure, tablet reveal another and a Serpent here attacks on a failure, elder thing −4 and a clue to the nearest Ancient on a failure; Hard/Expert skull −2 (−4), cultist doom on each Cultist, tablet each Serpent here attacks, elder thing −4 and a clue always; tests.
- [ ] 4.3 Connections from the guide's map (p.120): yellow circle–purple star, yellow circle–green diamond, blue triangle–purple star, purple star–green diamond, green diamond–red square, orange heart–purple star, orange heart–green diamond, matched to 04168–04173 by the icon on each scan; `oneWay` empty; a Tenochtitlán location stacks on the Present-Day location with its symbol (`engine-scenario-structure`); test that the stacked location keeps the tokens and investigators and that leaving play restores the one beneath.
- [ ] 4.4 Cards: data 04168–04173 (explore costs: resources, discards by cost, damage or horror, hand size, a willpower test), 04174–04185 (enter effects and shroud modifiers), 04191 Relic; scripts 04162, 04163 (victory display and search), 04164, 04165, 04166, 04167, 04186 Padma Amrita, 04187, 04188, 04189, 04190.
- [ ] 4.5 `scripts/the-boundary-beyond.ts`: the Harbinger check on agenda backs, R1/R2 and no-resolution; tests.
- [ ] 4.6 `pnpm coverage`: `the-boundary-beyond` complete.

## 5. Heart of the Elders, Part 1 (04205)

- [ ] 5.1 Vocabulary: pillar tokens as resources on Mouth of K'n-yan (04210, 04209b, 04220), "cannot be defeated" and exhaust on a pillar (04209b), chaos token on enter and a lost action (04218), per-point discard (04221), prey nearest the Mouth (04220).
- [ ] 5.2 Symbols for 04206, 04217, 04218 from the scans; setup: Mouth of K'n-yan (Cavern's Maw) in play and the start with one pillar per path known; act 1a flipped if replaying after act 2; `buildExploration` 04069–04073, 04217, 04215, 04221, 04081, 04082 plus `pick` one of 04074, 04075, 04218 (or into play if "mapped out the way forward"), the other two removed; the pre-scenario branch "six paths known → Part 2"; tests.
- [ ] 5.3 Token table from 04205: Easy/Standard skull −1 (−3 in a Cave), cultist −2 and doom on your location on a failure, tablet −2 auto-fail if poisoned, elder thing −3 and 1 horror on a failure; Hard/Expert skull −2 (−4), cultist −3, tablet −3 auto-fail if poisoned else a Poisoned on a failure, elder thing −4; tests.
- [ ] 5.4 Cards: data 04206 (compass look-at-3), 04215, 04216, 04219 (pocketknife), 04221; scripts 04207, 04208 (each surviving investigator resigns), 04209, 04209b The Winged Serpent, 04210, 04217 (return a vengeance card), 04218, 04220 Basilisk.
- [ ] 5.5 `scripts/heart-of-the-elders-part-1.ts`: R1 and the replay, `ended` writes `cards:tfa:jungle_watches` from the vengeance cards in the victory display and the paths known; tests.
- [ ] 5.6 `pnpm coverage`: `heart-of-the-elders-part-1` complete.

## 6. Heart of the Elders, Part 2 (04205)

- [ ] 6.1 Symbols for 04206b and the K'n-yan locations 04222–04226 from the scans; setup: one Mouth of K'n-yan, Depths Beneath side up, in play and the start; the jungle watches cards into the victory display; Descent to Yoth 04227 set aside; `buildExploration` the five K'n-yan locations, 04215, 04228, 04094, 04088; the Harbinger with its recorded damage; tests.
- [ ] 6.2 Token table = Part 1's (card 04205); test that the file carries it.
- [ ] 6.3 Cards: data 04206b (map look-at-2), 04222 (binoculars), 04223 (Yig's Fury ≥ 5), 04224 (map), 04225 (rope), 04226, 04227; scripts 04211, 04212, 04213 (scout checks supplies), 04214, 04228 No Turning Back.
- [ ] 6.4 `scripts/heart-of-the-elders-part-2.ts`: resolutions by "rescued Alejandro", the Harbinger's damage recorded; tests.
- [ ] 6.5 `pnpm coverage`: `heart-of-the-elders-part-2` complete.

## 7. The City of Archives (04237)

- [ ] 7.1 Vocabulary: hand-size modifiers (04239, 04240, 04243, 04252), the Body of a Yithian swap (`rules/investigators.ts`), keyword loss and gain by remembered flags (04257, 04258), prey most cards in hand (04259), blocks on investigate and encounter actions, cannot draw, deck cards removed as "driven insane" under 10 cards, discard down to a skill value (04260–04264); tests.
- [ ] 7.2 Setup (the guide's image pages: cooperated p. 176, resisted p. 180, which match ArkhamCards): every unique Item asset and Alejandro Vela set aside; each investigator swapped for Body of a Yithian; the start Interview Room by "cooperated" (04245 Arrival Chamber) or "resisted" (Restraining Chamber), the other two at random in play; the Yithian Observer at the lead's location (cooperated, each investigator gains 1 clue) or in the victory display (resisted); the three Halls in play; the Custodian set aside; tests.
- [ ] 7.3 Token table from 04237: Easy/Standard skull −1 (−3 with 5+ cards in hand), cultist and elder thing −2 and a clue of yours to your location on a failure, tablet −3 and a random discard on a failure; Hard/Expert skull −2 auto-fail with 5+ cards, cultist and elder thing a clue always, tablet −3 a random discard per point; tests.
- [ ] 7.4 Connections from the guide's placement map (pp. 177/181), all two-way: the centre Hall ↔ each of the three Interview Rooms and ↔ the other two Halls; those two Halls ↔ each other. Which Hall (04248–04250) carries the centre symbol is read from the scans. Test the six links.
- [ ] 7.5 Cards: data 04245–04255 (remembered flags, the fast move between Halls, hand size, difficulty per clue), 04256 The Custodian (parley), 04259; scripts 04238, 04239, 04240, 04241, 04242, 04243, 04244 Body of a Yithian, 04257, 04258, 04260, 04261, 04262, 04263, 04264.
- [ ] 7.6 `scripts/the-city-of-archives.ts`: the six remembered tasks, "three of six" objective, `ended` writes `count:tfa:tasks_completed` and the Custodian's fate, the swap undone; tests.
- [ ] 7.7 `pnpm coverage`: `the-city-of-archives` complete.

## 8. The Depths of Yoth (04277)

- [ ] 8.1 Vocabulary: the `pursuit` flag over the set-aside zone (spawn the highest-evade pursuit enemy at the depth's start; Pit Warden to Yig or the pursuit; damage kept), clue values from the counter `depth`, difficulty plus depth (04299–04302), spawn at a random set-aside location (04298), Yig's immunity while a ready Serpent is here and health per investigator (04296), Crumbling Precipice's chain of tests (04289); tests.
- [ ] 8.2 Symbols for 04286–04295 from the scans; setup: agenda start by Yig's Fury (0 → Yig and Pit Wardens removed; 6–10 → 2a; 11–15 → 3a; 16–20 → 4a; 21+ → 6a, as the guide's table), all ten locations set aside then one random non-Steps location in play as the start, `buildExploration` Steps of Yoth plus `pick` 4 of the rest, counter `depth` 1, the Harbinger (with damage) set aside or in pursuit from 5a, Yig set aside or in pursuit at 6a, Relic 04303 set aside; tests.
- [ ] 8.3 Token table from 04277: Easy/Standard skull −X (depth), cultist reveal another and each Serpent at your or a connecting location heals 2 on a failure, tablet reveal another and a clue on your location on a failure, elder thing −2 auto-fail at vengeance ≥ 3; Hard/Expert skull −X and 1 horror on a failure, elder thing −4 auto-fail at vengeance ≥ 3; tests.
- [ ] 8.4 Cards: data 04286 (crosses off a rope), 04287, 04288 (considered in the victory display), 04290, 04291 (map; keep drawing to two connecting), 04293 (pickaxe), 04294, 04295 (binoculars), 04303 Relic; scripts 04278–04284 (04284's extra encounter cards per doom), 04285 (depth advance: new start, new exploration deck), 04289, 04292, 04296 Yig, 04297, 04298, 04299, 04300, 04301, 04302.
- [ ] 8.5 `scripts/the-depths-of-yoth.ts`: the pursuit at each depth, R1 by depth, `ended` writes `count:tfa:depth`, the killed list, the Harbinger's damage, the Relic loss branch; `flow.json`: `check_all_killed` from `ScenarioFacts.defeated`, the depth branches from the count; tests reaching depth 2 and 5.
- [ ] 8.6 `pnpm coverage`: `the-depths-of-yoth` complete.

## 9. Shattered Aeons (04314)

- [ ] 9.1 Vocabulary: a location attached face down under the Relic (04321–04323), horror or damage per clue on moving (04324, 04330), reveal another at Mu and auto-fail with doom on Atlantis (04331–04336), stats per doom in the Nexus (04337), "tokens in the bag or sealed" (04334, 04335 with `engine-bless-curse`), a treachery that becomes a location (04340); tests.
- [ ] 9.2 Symbols for 04324, 04327–04336 from the scans; setup: Nexus of N'kai in play and the start; Ichtaca 04325, Alejandro 04326, Formless Spawn 04337, Relic 04343, Pocket in Time 04330, acts 04322 and 04323, the six Shattered locations set aside; `buildExploration` 04327–04329, 04339, 04340, 01166; one encounter card face down in the victory display per 10 Yig's Fury, each counting vengeance 1; sets by the bag (cultist > tablet → Dark Cult; tablet > cultist → Agents of Yig; equal → both); tests.
- [ ] 9.3 Token table from 04314: Easy/Standard skull −2 (−4 with the Relic at your location), cultist −2 and doom on the nearest Cultist unless by 1, tablet −2 auto-fail if poisoned, elder thing −2 and the topmost Hex from the discard into the exploration deck on a failure; Hard/Expert skull −3 (−5), cultist −3 doom on each Cultist, tablet −3 auto-fail if poisoned else a Poisoned, elder thing −3 the Hex always; tests.
- [ ] 9.4 Cards: data 04324, 04330, 04327–04329, 04331–04336, 04337, 04341 (each investigator), 04342 (check supplies), 04343 Relic (shuffles back); scripts 04315, 04316, 04317 (3b if the Relic's holder is eliminated), 04318 (spawn fallback from the exploration deck), 04319, 04320, 04321, 04322, 04323, 04325/04325b Ichtaca and Yig's Mercy, 04326/04326b Alejandro and Another Way, 04338, 04339, 04340.
- [ ] 9.5 `scripts/shattered-aeons.ts`: the act 4 version by the story choice, R1–R5, R4 to the epilogue; tests.
- [ ] 9.6 `pnpm coverage`: `shattered-aeons` complete.

## 10. Turn Back Time (04344)

- [ ] 10.1 Setup: Eztli's agendas 04055, 04056 and acts 04345–04347; Relic 04061 removed from the game and the owner's 04303 set aside from their deck; one elder thing token added for the scenario; the exploration deck as Eztli's; the log entries after Scenario I crossed off (a bulk `crossOut` by scenario, `src/engine/campaign/log.ts`); `turn_back_time` listed once in the sets; tests.
- [ ] 10.2 Token table from 04344: Easy/Standard skull −X (locations with doom), elder thing −4 and doom on your location on a failure; Hard/Expert skull −X (doom on locations), elder thing −6 doom always; no cultist or tablet line (they resolve as 0); tests.
- [ ] 10.3 Cards: scripts 04345, 04346, 04347 (Moment of Doom: the Relic flips clues to doom).
- [ ] 10.4 `scripts/turn-back-time.ts` reusing Eztli's hooks for the Harbinger and the defeat check; R1 and the campaign's end; `flow.json`: reached from `tfa-epilogue:proceed_secret_scenario`; tests.
- [ ] 10.5 `pnpm coverage`: `turn-back-time` complete and listed under the campaign.

## 11. Flow, interludes and the campaign bag

- [ ] 11.1 `flow.json` hand-fixed: the expedition leader choice (lead for Scenarios I and II), Supply Point 1 and the Resupply Point as `buySupplies` with St. Mary's XP options, Interludes I–V's `checkSupply`/`crossOffSupply` steps and the `multi` conditions as `all`/`any`, Yig's Fury as `count { value: "vengeance" }`, the Harbinger's damage and the depth from the counts, `check_paths_known_jungle_watches` as a `logCompare`, `check_all_killed` from the facts, `eztli_replays`, the epilogue into Turn Back Time; test in `src/engine/campaign/__tests__/tfaFlow.test.ts` walking the campaign on a fixed log.
- [ ] 11.2 Interlude IV's mishap step `revealTokens { count, pick: "lower", outcomes }` in `src/engine/campaign/flow.ts` and the schema, drawing from the campaign bag and returning the tokens; test.
- [ ] 11.3 Setup condition `bagHas { token, min }` and the comparison form for Shattered Aeons; `check:content` validates them; test.
- [ ] 11.4 `ENGINE_VERSION` bump; test that an older save restarts its scenario with the campaign kept.

## 12. Translations

- [ ] 12.1 Ability labels `ability.<code>.<n>`, the prompt keys (explore choices, the police choice, the start choice, the story choices, the remembered tasks) in `content/i18n/{en,ru}/ui.json`; `check:content` passes; the ru card text of every tfa code is already in `content/i18n/ru/packs/tfa.generated.json` (100%).
- [ ] 12.2 Russian campaign texts for the hand-fixed flow steps in `content/i18n/ru/campaign-texts/the-forgotten-age.json`, from ArkhamCards' `all_campaigns_ru.txt`, checked against the printed RU guide scans (`inspired/PDF_ru/04_*.pdf`) for the supply names.

## 13. Coverage and verification

- [ ] 13.1 `pnpm coverage`: `campaigns["the-forgotten-age"].complete` true; `docs/campaign-program.md` rows tfa, tof, tbb, hote, tcoa, tdoy, sha at 0 encounter cards left.
- [ ] 13.2 Bot playthrough of each of the 10 scenarios to a resolution, 0 errors; a browser run of The Untamed Wilds on `pnpm dev --port 5174` in English and Russian with an exploration and a supplies screen, 0 console errors, screenshots under `.playwright-mcp/`.
- [ ] 13.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate campaign-the-forgotten-age --strict`.
