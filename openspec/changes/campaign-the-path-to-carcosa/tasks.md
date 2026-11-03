## 1. The campaign becomes hand-kept; engine vocabulary

- [ ] 1.1 After `campaign-flow-compiler-fixes` and `scenario-import-fixes` have regenerated it, move `content/campaigns-generated/the-path-to-carcosa/` to `content/campaigns/the-path-to-carcosa/`, drop `generated`, add `scripts/`; `pnpm check:content` passes; `import:campaigns` leaves the folder alone (test in `scripts/campaignGuide.test.ts`).
- [ ] 1.2 Token vocabulary, failing unit tests first in `src/engine/effects/__tests__/tokens.test.ts`: X sources `horrorOnYou` (min 1), `shroudOfYourLocation`, `baseShroudOfYourLocation`, `highestDoomOnEnemy`, `doomOnEnemies`, `highestDoomOnAgenda`, `doomOnAgendas`, `distanceFromStart`; `xMax`; results `cancelCommittedSkills`, `moveEnemies { trait, unengaged, toward: nearestInvestigator }`, `loseResources { amount: failedBy }`, `enemyAttacksYou { traits, ready }`, `placeDoom on: eachAgenda`, `autoFailInstead`, `clueFromBank`, `loseActions`; schema, `EFFECT_OPS`, `implemented.ts` line patterns.
- [ ] 1.3 Parley costs and window (`rules/round.ts`), test in `src/engine/__tests__/parley.test.ts`: gates `resources { min }`, `cardsInHand { min }`, cost `actions: 2`, `discardFromHand`, `noTest`; `win("parleyed")` after it; `extraActionCost` with designator `parley` (Tough Crowd).
- [ ] 1.4 Clues on enemies and assets (`queries.ts:cluesOn`, `effects/placement.ts`), test in `src/engine/__tests__/cluesOnCards.test.ts`: `placeClues`/`moveClues` with an entity target, `takeControlOfClues`, clues → doom, clues to the defeater.
- [ ] 1.5 Location-keyed costs (`rules/investigators.ts`), test in `src/engine/__tests__/locationCosts.test.ts`: hand cost modifier while at a location, `enterCost { flat }` from the entering investigator, `cannotEnterUnrevealed` lifted by an act flag.
- [ ] 1.6 Enemies (`rules/enemies.ts`), test in `src/engine/__tests__/ptcEnemies.test.ts`: `damageOnlyFrom { traits, encounter }`, enemy at no location that attacks everyone, `spawn` from the victory display, `spawn` at one of two named locations, "farthest from all investigators".
- [ ] 1.7 Scenario facts (`rules/scenario.ts`), test in `src/engine/__tests__/scenarioFacts.test.ts`: `remember` op and `rememberedCount` condition, `actAdvancedBy` passed to `onActAdvance`, `resetAgendaDeck`, `horrorOnYou` condition and amount; verbs in `api.ts` for each.
- [ ] 1.8 Flow (`campaign/flow.ts`), tests in `src/engine/campaign/__tests__/flow.test.ts`: `logCompare`, `removeAllChaosTokens`, `xp { split: "evenly" }`; schema and `check:content` validation.
- [ ] 1.9 `ENGINE_VERSION` +1; test that a prior-version save restarts its scenario with the campaign kept.

## 2. Curtain Call

- [ ] 2.1 Failing test `src/engine/__tests__/ptc-curtain-call.test.ts`: setup with Theatre, Lobby, Balcony, Backstage in play, Doorways 03053–03058 plus 03059 and 03060 set aside, Lola 03006 at Backstage; then write `scenarios/curtain-call.json` setup and `scripts/curtain-call.ts` setup hook.
- [ ] 2.2 Token table from 03043 for all four difficulties (`horrorOnYou` skull on Hard; −3 instead with 3+ horror on Easy; horror on or at your location); `tokensReal` true.
- [ ] 2.3 Scenario script: act 1b random act 2 version (03047a/b/c) with persistent tokens and `cca_add_chaos_token` recorded; the flames/ooze/flood location abilities; act 3 horror spread at end of round and Lobby resign while 03059 is absent; agenda 1b Royal Emissary from set-aside or victory; the Encore loop (03045); act 3b R1/R2 choice; the box-office flag; no-resolution tally 1, R1/R2 tally 2.
- [ ] 2.4 Cards: 03044, 03045, 03046, 03047a–c, 03048, 03050, 03052, 03053, 03055, 03058, 03059, 03060 (scripts); 03049, 03051, 03054, 03056, 03057 (data); Curtain Call treacheries and shared sets 03084a–d (Hidden, from `engine-generic-keywords`), 03085, 03090, 03091, 03092, 03093, 03094, 03098, 03099, 03100 and the rest of Delusions, Hauntings, Cult of the Yellow Sign, Evil Portents; tests per card in `ptcCards.test.ts`.
- [ ] 2.5 Connections from the guide's placement map (`03 The Path to Carcosa.pdf` p.16, all two-way): Theatre–Lobby, Theatre–Balcony, Theatre–Backstage, Balcony–Lobby; each Doorway to its hall when it enters play (from the card scans); layout with doorway cells; `oneWay` empty.
- [ ] 2.6 Resolutions: R1, R2, none through the flow; `maybe_ask_mid_game_tokens` dropped (recorded by 2.3); bot playthrough to a resolution; coverage reports the scenario complete.

## 3. The Last King

- [ ] 3.1 Failing test `ptc-the-last-king.test.ts`: five Bystanders 03076a–03080 at random non-Foyer locations with 1 + 1 per investigator clues, 03065–03069 beneath the reference card, Dianne set aside; then setup data and script.
- [ ] 3.2 Token table from 03061 (skull reveal-another with doom on a Possessed, `shroudOfYourLocation` elder thing).
- [ ] 3.3 Scenario script: Bystander parleys (Jordan ≥10 resources, Haruko ≥6 cards, Ashleigh 2 actions no test) taking their clues; flip to the story side when the last clue leaves and `interviewed` recorded; agenda 2 (03063) resolving a random Sickening Reality from beneath, flip to enemy and swap with the Bystander (`engine-scenario-structure` verbs); agenda 1b Dianne at the fewest-clue Bystander; Dianne's lockout and enemy-phase move; eliminated investigators' clues onto the act and the count recorded; the game ends when all resigned or defeated; VIPs slain recorded from the victory display.
- [ ] 3.4 Cards: 03062, 03063, 03064, 03065–03069 and b sides, 03076a, 03077–03080 and b sides, 03081, 03082, 03083, 03095, 03096, 03097, 03102, 03103, 03104, 03105 (scripts); 03070, 03071, 03072, 03073, 03074, 03075 (data); Hastur's Gift, Decay, The Stranger sets; tests.
- [ ] 3.5 Connections from the guide's map (p.27, nine two-way links): Courtyard to each of Foyer, Ballroom, Living Room, Dining Room and Gallery; Foyer–Ballroom; Foyer–Living Room; Ballroom–Dining Room; Living Room–Gallery (the map's symbols matched to cards by the icon on each scan); layout as the map.
- [ ] 3.6 Resolutions: `none` route (R1 if anyone resigned, else R2), R3 crossing off interviewed VIPs, `earn_clue_xp` from the recorded count with `xp split`, the VIP prompts dropped; Interlude I reached from R1 and skipped from R2/R3; bot playthrough; coverage complete.

## 4. Echoes of the Past

- [ ] 4.1 Failing test `ptc-echoes-of-the-past.test.ts`: two Historical Societies per floor by `putRandomIntoPlay`, Entry Hall and both Quiet Halls, Seekers by player count, set-asides 03139–03143 and 03068b unless slain, Entry Hall clues if Sebastien interviewed, +1 action on the first turn if the party was fled; the Midnight Masks subset and Dark Cult gathered.
- [ ] 4.2 Token table from 03120 (`highestDoomOnEnemy`, `doomOnEnemies`, doom on the nearest enemy, random discard, horror with an enemy present).
- [ ] 4.3 Scenario script: agendas skip the mythos doom and flip clues on enemies to doom with the threshold on enemy doom; 2b spawns 03140 and Sebastien; 3b → R4; acts place per-investigator clues on revealed Historical Societies; 03125 gives Peabody and puts Hidden Library into play; floor connections (Entry Hall to Ground, Quiet Halls to their floors) and Passageway connections, Peabody's trait grant and the library's while an enemy moves; act 3 clue spend only in Hidden Library; Oathspeaker immune during acts 1–2 with its enemy-phase choice; Seeker's mythos step.
- [ ] 4.4 Cards: 03121–03126, 03127, 03131, 03135, 03128–03138 backs and texts, 03139, 03140, 03141, 03144, 03145, 03146 (scripts or data as listed in `ptc.md` §4.III); 03142 and 03143 in `player-cards-ptc` (their earn here); tests.
- [ ] 4.5 Connections from the guide's map (p.47): Entry Hall–Quiet Halls (2nd floor), Quiet Halls (2nd)–Quiet Halls (3rd); each hall to the two Historical Societies of its floor by script (the floor trait), Passageways by script; layout three rows.
- [ ] 4.6 Resolutions: `none` → R4; R1–R4 with Sebastien-in-victory recorded by the script; bot playthrough; coverage complete.

## 5. The Unspeakable Oath

- [ ] 5.1 Failing test `ptc-the-unspeakable-oath.test.ts`: one random Western and Eastern Asylum Halls, investigators choosing a start hall, the Monster pile (03088×1, 03089×2, 03183×2, 01175×2) and Possessed/Lunatic pile (03095×2, 03096×2, 03184×3) set aside, 03182a/b and the four Patient Confinements set aside, Constance 03065b unless slain, the difficulty token for the rest of the campaign, act 2 version by the Clasp, Courage assets if Constance was interviewed.
- [ ] 5.2 Token table from 03159 (`horrorOnYou`, `baseShroudOfYourLocation`, the Monster-beneath results, the elder thing choice).
- [ ] 5.3 Scenario script: act 1 repeated key tests and "took the keys by force"; act 2 v.I Daniel asset or v.II Daniel enemy at Patient Confinement 03178; the beneath-act Monster pile (`engine-scenario-structure`) fed by tokens, 03186/03187, 03188, agenda backs and act shuffles; six remembered flags and the 4-of-6 objective; Basement Hall revealing the Confinements; locked unrevealed locations lifted from act 2; flat clue entry cost; Garden resign; agenda 3b defeating the unresigned; R2/R3 split; Daniel's state recorded for Interlude II.
- [ ] 5.4 Cards: 03160–03167, 03168–03171, 03172–03181, 03182a/b, 03183, 03184, 03185, 03186, 03187, 03188, 03088, 03089 (scripts or data per `ptc.md` §4.IV); Inhabitants of Carcosa, Agents of Hastur; tests.
- [ ] 5.5 Connections from the guide's map (p.70): Garden–Yard, Yard–Western Halls, Kitchen–Mess Hall, Mess Hall–Western Halls, Western Halls–Eastern Halls, Eastern Halls–Infirmary, Eastern Halls–Basement Hall, listed for both copies of each wing; Basement Hall to each Patient Confinement from the cards; layout.
- [ ] 5.6 Resolutions: defeated investigators driven insane, campaign lost if all, survivors to R1; R1–R3; `daniel_choice` dropped; Interlude II reached; bot playthrough; coverage complete.

## 6. A Phantom of Truth

- [ ] 6.1 Failing test `ptc-a-phantom-of-truth.test.ts`: random pick of 03209/03210, 03212/03213, 03217/03218; start at Gare d'Orsay, or Montparnasse with 3 resources if Jordan was interviewed; Doubt ≥ Conviction removes 03223×2 and 01135×3 and uses 03204 → 03206, else removes 03090×2 and 01136×2 and uses 03205 → 03207; Jordan 03066b set aside unless slain; the dreams: Lost Soul earned per investigator, trauma, weakness, the Conviction/Doubt mark.
- [ ] 6.2 Token table from 03200 (`totalDoomInPlay` capped at 5 on Easy/Standard, `moveEnemies` Byakhee, `cancelCommittedSkills`, `loseResources failedBy`).
- [ ] 6.3 Scenario script: agenda threshold minus doom on other cards while Conviction > Doubt; 1b/2b disengage, move and The Organist away; 3b → R3 if Doubt ≥ Conviction else act 2b; act 1 back by `actAdvancedBy` (clues vs ≥3 doom at end of round), The Organist's side and place; 03206 clues on The Organist and R1/R2 by "intruded"; 03207 group fast ability and "survive three nights"; The Organist's pathing away from the nearest investigator.
- [ ] 6.4 Cards: 03201–03207, 03208–03220, 03221/03221b, 03222, 03223–03227, 03086, 03087 (scripts or data per `ptc.md` §4.V; 03226 reuses 01164's data); Byakhee set; tests.
- [ ] 6.5 Connections from the guide's map (p.133: ten locations, fifteen two-way links, matched to cards by the icon on each scan), both versions of each pair sharing a slot; layout as the map (four rows, Montparnasse alone at the bottom).
- [ ] 6.6 Resolutions: none/R1/R2/R3 through the flow, the scenario file's duplicate token adds removed; bot playthrough; coverage complete.

## 7. The Pallid Mask

- [ ] 7.1 Failing test `ptc-the-pallid-mask.test.ts`: start at The Gate to Hell, or a random Catacombs other than 03256/03257 when the gaze was not escaped or Nigel not found; the Catacombs deck with 03256, 03257 and three random others as its bottom five; Haruko 03067b set aside unless slain and a revealed neighbour if interviewed; MitPM set aside by his bearer; acts 03243, 03244, 03245/03246.
- [ ] 7.2 Token table from 03240 (`distanceFromStart` capped at 5, attack damage reduced on success, `enemyAttacksYou` Ghoul/Geist, `searchEncounterDraw` Ghoul/Geist).
- [ ] 7.3 Scenario script on the grid of `engine-location-instances-grid`: each Catacombs' reveal placement in its named directions with the player's choice among free spots and a failed placement when none; the group clue cost to enter unrevealed Catacombs; 03257 advancing act 1 and 03243's back spawning MitPM in the Tomb and Haruko at the start; 03244's two objectives recorded as `tpm_conviction_or_doubt`; 03245 discarding the farthest location each round; 03246 ignoring Blocked Passage; agenda 2b defeat with physical trauma; 03241b Specter of Death.
- [ ] 7.4 Cards: 03241, 03241b, 03242, 03243–03246, 03247–03257, 03258, 03259, 03260, 03261, 03262, 03093, 03094 (scripts or data per `ptc.md` §4.VI); Ghouls, Chilling Cold already work; tests.
- [ ] 7.5 No static connections: adjacency from the grid; the generated triangle removed; the test asserts a placed Catacombs is connected to its neighbours.
- [ ] 7.6 Resolutions: none (with the per-investigator Act II choice), R1, R2 with the recorded Conviction/Doubt; `maybe_ask_conviction_or_doubt` dropped; bot playthrough; coverage complete.

## 8. Black Stars Rise

- [ ] 8.1 Failing test `ptc-black-stars-rise.test.ts`: Flood Below or Vortex Above removed at random with its cards; agendas 03275 → 03276a|b → 03277 and 03278 → 03279a|b → 03280 as two decks (`engine-scenario-structure`); 03281/03282 set aside; random 03285/03286, 03287/03288, 03289/03290, 03292/03293 (Chœur Gothique set aside); Chapel of St. Aubert, 03088, 03300, 03301, 03294, 03295 and the chosen tower set aside; a random basic weakness per investigator; the difficulty token; Ashleigh 03069b set aside unless slain and her group reaction if interviewed.
- [ ] 8.2 Token table from 03274 (`highestDoomOnAgenda`, `doomOnAgendas`, auto-fail against an enemy with doom, doom on each agenda, Byakhee search).
- [ ] 8.3 Scenario script: doom choice between decks; the group doom ability on 03275/03278; agenda 1 backs shuffling 03300/03301 in and marking Conviction or Doubt by the other deck's doom; 2a/2c backs replacing the deck with 03281/03282 or spawning 03088 and Ashleigh; 03277/03280 → R3; "found a guide" and "found the tower key" gates; Abbey Church reveal of the five set-aside locations and its Broken Steps clue cost; stage-keyed severity of 03302/03303.
- [ ] 8.4 Cards: 03275–03280 all sides, 03281, 03282, 03283–03299, 03300, 03301, 03302, 03303, 03088, 03089 (scripts or data per `ptc.md` §4.VII); tests.
- [ ] 8.5 Connections from the guide's map (p.164): Porte de l'Avancée–Grand Rue; Grand Rue to Outer Wall, North Tower and Broken Steps; Outer Wall–North Tower; Outer Wall–Broken Steps; North Tower–Broken Steps (the map's centre four-way arrow read as the two crossing links); Broken Steps–Abbey Church; the set-aside locations (Chœur Gothique, Cloister, Knight's Hall, Chapel, Tower) from their card icons when they enter play; Chœur Gothique added to the layout, the set-aside row no longer fully connected.
- [ ] 8.6 Resolutions: `none` → R3, R1, R2; R3 drives each investigator insane: mental trauma equal to their sanity recorded, then the campaign is lost (test: the lost campaign's log shows each investigator insane with the trauma); bot playthrough; coverage complete.

## 9. Dim Carcosa

- [ ] 9.1 Failing test `ptc-dim-carcosa.test.ts`: one random copy each of 03326a/c, 03327a/c/e, 03328a/c/e, 03329a/c in play with the others set aside; start at Shores of Hali or Dark Spires by the path opened; act 2 by `logCompare` (≤5 → 03321a; Doubt > Conviction → 03322a; Conviction > Doubt → 03323a; tied → choice); doom on 1a by Chasing the Stranger tallies; half-sanity horror that cannot defeat; Hastur ×3 and 03088 set aside; every location revealed with clues.
- [ ] 9.2 Token table from 03316 (`horrorOnYou` on Hard, −4 instead with no sanity, `clueFromBank`, `loseActions` against a Monster or Ancient One).
- [ ] 9.3 Scenario script: the sanity rule through `engine-scenario-structure`'s would-be-defeated replacement (horror ≥ sanity does not defeat; Possession kills at > 2× sanity; Hastur's excess horror → 1 damage); act 3's flip action and each story back (lock, or replace with a set-aside copy keeping clues and connections); 03331 gated on Hastur's damage; the three Hastur versions, The King in Yellow at no location; agendas on Hastur damage, 1b choice with retries, 2b Beast at the Palace, 3b → R4/R5 by `logCompare`; acts 03320–03324 with R1/R2/R3 by version; possessed investigators recorded per investigator.
- [ ] 9.4 Cards: 03317–03319, 03320–03324, 03321b (here, as a story asset), 03325–03331 all faces, 03332–03336, 03337–03342, 03084a–d, 03085, 03098, 03099, 03100, 03088, 03089 (scripts or data per `ptc.md` §4.VIII); tests.
- [ ] 9.5 Connections from the guide's map (p.180, two-way): Dark Spires–Depths of Demhe; Depths of Demhe to Dim Streets and Ruins of Carcosa; Dim Streets–Palace of the King–Ruins of Carcosa; Dim Streets and Ruins of Carcosa each to Bleak Plains; Bleak Plains–Shores of Hali (no link from the Palace to Depths or Bleak Plains); every copy of a slot sharing them; layout as the map.
- [ ] 9.6 Resolutions: `none` → R4 or R5 by `logCompare`; R4 and R5 drive each investigator insane, with mental trauma equal to their sanity recorded before the campaign is lost (test as in 8.6); R1–R3 with `record_possessed_investigators` per investigator; the epilogue reads it; bot playthrough; coverage complete.

## 10. Flow and interludes

- [ ] 10.1 The moved `flow.json`: order with the prologue, both interludes, the epilogue; `none` routes of task groups 3, 4, 5, 8, 9; `removeAllChaosTokens` where the guide says "all"; the prompts of ADR-0050 dropped; `campaign_data version` conditions replaced (ask the mid-game token question never; reprint interlude by the existing `skipScenario`); test in `src/engine/campaign/__tests__/ptcFlow.test.ts` walking the campaign from Curtain Call to the epilogue on a fixed log.
- [ ] 10.2 Interlude I (both versions), Interlude II and the epilogue play with their texts and choices; the Russian campaign text still attaches by `i18nId`.

## 11. Strings

- [ ] 11.1 `content/i18n/{en,ru}/ui.json`: prompt keys for the parleys, the token choices, the catacombs directions, Hastur's agenda choice, the act 2 choice, ability labels `ability.<code>.<n>` for every data card; `check:content` passes in both locales.

## 12. Coverage and verification

- [ ] 12.1 `pnpm coverage`: the eight scenarios complete, `ptc`, `eotp`, `tuo`, `apot`, `tpm`, `bsr`, `dca` encounter sides complete; `docs/campaign-program.md` rows ticked with their counts.
- [ ] 12.2 Browser: start The Path to Carcosa in Russian, play Curtain Call to a resolution, see Interlude I, reload and see it restored; 0 console errors; screenshots under `.playwright-mcp/`.
- [ ] 12.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm check:content`; `openspec validate campaign-the-path-to-carcosa --strict`.
