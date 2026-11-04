## 1. The move and the shared pieces

- [ ] 1.1 Confirm `scenario-import-fixes` has landed (`ScenarioDef.setupCards`, `compose()` in `src/engine/api.ts`, `CampaignDef.options`, the camelCase log keys); `git mv content/campaigns-generated/return-to-the-dunwich-legacy content/campaigns/return-to-the-dunwich-legacy`; `generated: false`; the importer skips it; `check:content` passes unchanged.
- [ ] 1.2 Each Return scenario file: `card` = the base card, `setupCards` = the box's card, `tokens` copied from the base file; test: Return to Extracurricular Activity with 02041 + 51012 reports tokens real once 02041's table is real.
- [ ] 1.3 The 8 base scripts export their hooks object; `scripts/return-to-<id>.ts` composed through `compose()`; a test asserts each Return script's hooks are a superset of its base's.
- [ ] 1.4 Replacement sets in `content/packs/return/cards.json`, test per card: data 51064, 51068, 51069, 51071; new vocabulary with a test each: attach where most investigators + `cannotLeave` (51065), per-point choice discard-or-damage (51066), difficulty from clues with horror or a dropped clue per point (51070); scripts 51061, 51062, 51063, 51067, 51072.

## 2. Return to Extracurricular Activity (51012)

- [ ] 2.1 Setup: the base setup, then Orne Library or Warren Observatory 51013 at random; Enthralled Security Guard 51014 at Administration if Return to The House Always Wins was completed; token table = 02041's; connections = the base's with the Observatory in the Orne slot.
- [ ] 2.2 Cards: 51013 (data + `discardDeckTop 3` per clue), 51014 (attacks → discard 2; evaded → defeated: script).
- [ ] 2.3 `scripts/return-to-extracurricular-activity.ts` composed; test to R1 and R4; `pnpm coverage` reports the scenario complete.

## 3. Return to The House Always Wins (51015)

- [ ] 3.1 Setup: one of the two Lounges (02071 / 51016) at random; Clover Club Stage 51017 set aside; Erratic Fear set aside in place of Striking Fear; token table = 02062's.
- [ ] 3.2 Cards: 51016 (script), 51017 (resource pot: script), 51018 (data with the `cheated` condition), 51019 (script).
- [ ] 3.3 Script composed; test to R1 and `none`; coverage complete.

## 4. Return to The Miskatonic Museum (51020)

- [ ] 4.1 Setup: two extra Exhibit Halls, Restricted Hall set aside, two removed at random; the "next agenda's Forced active while resolving the back" flag; token table = 02118's.
- [ ] 4.2 Cards: 51021 (data), 51022 The Archives (script), 51023 Dark Bidding (attached through the void: script + test), 51024 Night Beyond Void (script).
- [ ] 4.3 Script composed; test to R1/R2; coverage complete.

## 5. Return to The Essex County Express (51025)

- [ ] 5.1 Setup: agendas 51026, 51027, 02161, 02162, 02163, 02164; 6 cars from the 10 (02167–02171, 02174, 02175, 02177, 51029, 51030) and 1 engine from 4 (02165, 02166, 51028 + base); Engineer 51031 set aside; token table = 02159's.
- [ ] 5.2 Cards: 51026/51026b The Conductor (spawn leftmost, attach to the agenda when defeated, moves right when its car leaves: script), 51027 (script), 51028 Engine Car (can't investigate; Engineer: script), 51029 Freight Car (script), 51030 Baggage Car (data), 51031 Engineer (script).
- [ ] 5.3 Script composed, the base's train line reused; test: the Conductor moves right when the leftmost car is removed; R1 and R2; coverage complete.

## 6. Return to Blood on the Altar (51032)

- [ ] 6.1 Setup: three copies per village location (base pairs + 51034–51039), one of each at random, then one removed; no Naomi's Crew beneath locations; Hired Gun 51040 if `bone_to_pick`; token table = 02195's; connections = the base's by location name.
- [ ] 6.2 Cards: 51033 Commons (flag: no draw or resource actions), 51034–51039 (data with small vocabulary), 51040 Hired Gun (Criminals gain Hunter and prey "most resources"; Hunted Down gains Peril and Surge: script).
- [ ] 6.3 Script composed; test to R1–R3 and the sacrificed note; coverage complete.

## 7. Return to Undimensioned and Unseen (51041)

- [ ] 7.1 Setup: the base Brood 02255 replaced by 51042–51045 in the set-aside pool; a Brood put into play is random among the set-aside versions; token table = 02236's.
- [ ] 7.2 Cards: 51043 (data over the Brood mechanic), 51042, 51044, 51045 (extra forced or keyword data), 51046 Imperceptible Creature (gains Elite: script).
- [ ] 7.3 Script composed; test: each Brood spawn is one of the four and `brood_escaped` counts them; coverage complete.

## 8. Return to Where Doom Awaits (51047)

- [ ] 8.1 Setup: Warped Base 51048 and Ascending Path 51049 in place of 02282/02283; 51050 and 51051 join the Diverging/Altered pools, one random of each removed; Naomi O'Bannion 51052 set aside, offered in place of the intro clue if `naomi_has_back`; token table = 02274's.
- [ ] 8.2 Cards: 51048, 51049 (clue spends → random paths: script), 51050, 51051 (reveal effects: script), 51052 (story ally: script).
- [ ] 8.3 Script composed; test to R1 and R2; coverage complete.

## 9. Return to Lost in Time and Space (51053)

- [ ] 9.1 Setup: agendas 02312, 02313, 51054, 02315; acts 02316, 02317 or 51055 (`when: logHas ritual_completed`), 02318, 02319; Realms Beyond 51057 in play with Yog-Sothoth spawned there; the single-sided locations 51058–51060 in the encounter deck with the base ones; token table = 02311's.
- [ ] 9.2 Cards: 51054 (script), 51055 (spawn Seth; ignore the location's objectives: script), 51056 Seth (Thrall: data), 51057 Realms Beyond (Yog immune; a test to leave; the redirect from Another Dimension: script), 51058, 51059, 51060 (scripts).
- [ ] 9.3 Script composed; test: a location leaving play redirects to Realms Beyond; R1–R4; coverage complete.

## 10. Replacement sets option on the base campaign

- [ ] 10.1 Failing test first: a Dunwich campaign created with `rtdwl-replacement-sets` starts Extracurricular Activity with Beyond the Threshold, Resurgent Evils, Secret Doors and Yog-Sothoth's Emissaries in place of the base sets; with the option off, no replacement card is in the deck.
- [ ] 10.2 `content/campaigns/the-dunwich-legacy/campaign.json` declares the option with the bookmark's six pairs in the `CampaignDef.options` shape of `scenario-import-fixes` (set ids verified against the snapshot); strings `campaign.option.rtdwl-replacement-sets` in `content/i18n/{en,ru}/ui.json`; `check:content` validates the set ids; the new-game toggle reaches `createCampaign`.

## 11. Flow and translations

- [ ] 11.1 `flow.json`: the base flow's hand fixes carried over, the Return-to log keys as `scenario-import-fixes` names them; a test walks the 8 scenarios and the interludes.
- [ ] 11.2 Ability labels and prompt keys in `content/i18n/{en,ru}/ui.json`; ru card text of every rtdwl code already in `content/i18n/ru/packs/return.generated.json`; `check:content` passes.

## 12. Coverage and verification

- [ ] 12.1 `pnpm coverage`: `campaigns["return-to-the-dunwich-legacy"].complete` true; `docs/campaign-program.md` rtdwl row at 0 encounter cards left (player count unchanged).
- [ ] 12.2 Bot playthrough of each Return scenario to a resolution, 0 errors.
- [ ] 12.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate campaign-return-to-the-dunwich-legacy --type change --strict`.
