## 1. The move and the shared pieces

- [ ] 1.1 `git mv content/campaigns-generated/return-to-the-path-to-carcosa content/campaigns/return-to-the-path-to-carcosa`; `generated` dropped; the importer skips it; `check:content` passes unchanged.
- [ ] 1.2 Each Return scenario file: `card` = the base card, `setupCards` = the box's card, `tokens` copied from the base file; a content check (`src/content/`, test first) that a Return scenario's table equals its base's; `pnpm coverage` reports tokens real for all 8 once the base tables are real.
- [ ] 1.3 The 8 base scripts export their hooks object; `scripts/return-to-<id>.ts` composed through `compose()`; a test asserts each Return script's hooks are a superset of its base's.
- [ ] 1.4 Replacement sets in `content/packs/return/cards.json`, failing test per card first: data 52066 Bleeding Walls (X = shroud), 52067 Fragile Thoughts, 52068 Maggot Swarm, 52069 Preying Byakhee (prey lowest remaining sanity only; fight/evade swap), 52071–52074 Visions in Your Mind (Hidden + the per-turn action-kind record), 52075 Maddening Delusions (`hiddenCardsInHand`), 52077 Melancholy; scripts 52065 Delusory Evils (Hidden or doom; forced on success by 3+), 52070 The Sign of Hastur, 52076 Voice of Tru'nembra, 52078 Painful Reflection.

## 2. Return to Curtain Call (52014)

- [ ] 2.1 Setup: the base setup, then act 2 one of 03047a/b/c, 52015, 52016, 52017 at random with 03046 and 03048 kept; 52014 attached to Royal Emissary (cannot be detached; a warning when he is added to the victory display; +1 per-investigator health per warning); Theatre Lounge 52018 and Prop Shop 52019 in the doorway pools; token table = 03043's; connections = the base's with the new doorways on their halls.
- [ ] 2.2 Cards: 52014 (script), 52015/52016/52017 act backs (script, recording the version for the six-way `cca_add_chaos_token`), 52018 (search the deck for the two topmost hidden cards: script), 52019 (data: shroud −1 per horror, forced on a failed investigate), 52020 La Comtesse (defeated → hidden in hand as 4 cards: script).
- [ ] 2.3 `scripts/return-to-curtain-call.ts` composed; test to R1, R2 and `none`; `pnpm coverage` reports the scenario complete.

## 3. Return to The Last King (52021)

- [ ] 3.1 Setup: agendas 52022, 03063; Dianne 52025 set aside in place of 03081; 52023 Dianne and 52024 Crazed Guest ×2 beneath the reference card with the five base Sickening Reality cards (none in the encounter deck); Shocking Display 52027 set aside; token table = 03061's.
- [ ] 3.2 Cards: 52021 (script), 52022 Better Never Than Late (back: Dianne at the fewest-clue Bystander, Shocking Display shuffled in: script), 52023 (data with prey most clues, hunter, per-investigator health and the "after any investigator parleys" trigger) and 52023b, 52024 (parley auto-evade: data) and 52024b (story sides: scripts), 52025 Dianne asset (script), 52026 Party Guest (script), 52027 (script).
- [ ] 3.3 Script composed; test: a Sickening Reality drawn from the eight resolves and swaps; R1–R3 and `none`; coverage complete.

## 4. Return to Echoes of the Past (52028)

- [ ] 4.1 Setup: four floor pools (Basement 52030–52032 added), one removed per floor at random, the other two in play; Entry Hall, 03131, 03135 and 52029 in play; Hidden Library, Oathspeaker, Peabody, Cloak, Clasp and both 52033 set aside; token table = 03120's; connections = the base's plus 52029 to Entry Hall and its Basement locations by the floor rule; layout with the Basement row below Ground.
- [ ] 4.2 Cards: 52028 (Keeper spawn on act advance: script), 52029 (data: floor connections, the clue-placing action), 52030 (data: `hiddenCardsInHand`, reveal on spawn), 52031 (script), 52032 (data: `cluesDiscovered` draw), 52033 Keeper of the Oath (script).
- [ ] 4.3 Script composed; test: act 2 spawns a Keeper at an empty Historical Society; R1–R4 and `none`; coverage complete.

## 5. Return to The Unspeakable Oath (52034)

- [ ] 5.1 Setup: the base setup with act 2 = 52035 if `logCompare` Conviction ≥ Doubt else 52036, the base 03164/03165 removed; 52037 Host of Insanity and 52038 Radical Treatment set aside; token table = 03159's.
- [ ] 5.2 Cards: 52034 (script), 52035/52036 act backs (Host at Daniel's cell / Daniel under control: scripts), 52037 (data: Massive, Hunter, per-investigator health; parley auto-evade gated on controlling the Clasp), 52038 (script), 52039 Clouded Memory (`forget` op: data).
- [ ] 5.3 Script composed; test: the version by the log, Clouded Memory lowering the 4-of-6 count; R1–R3 and `none`; coverage complete.

## 6. Return to A Phantom of Truth (52040)

- [ ] 6.1 Setup: for each of 03208/52041, 03211/52042, 03215/52043, 03216/52044, 03219/52045, 03220/52046 one at random in play, the other removed (sharing the base slot and connections); both 52047 set aside; after The Organist enters play, both Figure in the Shadows and the encounter discard shuffled into the deck; token table = 03200's.
- [ ] 6.2 Cards: 52040 (script), 52041 (data: willpower icons discard or horror), 52042 (script: 5 resources add or remove agenda doom, group limit), 52043 (data: entering enemy +1 horror until end of round), 52044 (data: combat/agility swap), 52045 (data: location-scoped enemy modifier; extra action on evade by 3+), 52046 (data: token reveal readies Byakhee), 52047 Figure in the Shadows (script: Doubt vs Conviction, The Organist moved or resolved).
- [ ] 6.3 Script composed; test to R1–R3 and `none`; coverage complete.

## 7. Return to The Pallid Mask (52048)

- [ ] 7.1 Setup: the base start rule, then 52049–52052 added to the Catacombs pool, four random Catacombs removed unseen, the deck built; The Man in the Pallid Mask not a Humanoid for Corpse Dweller's spawn and held in the Tomb of Shadows during act 2; token table = 03240's; no static connections (the grid).
- [ ] 7.2 Cards: 52048 (script), 52049 Secret Passage (Clasp action reveals the Catacombs to its right: script), 52050 Mound of Bones (places four Catacombs around it, fetches 52053: script), 52051 Research Site (script), 52052 Sea of Skulls (placement and end-of-turn choice: script), 52053 Malformed Skeleton (replaces hunter movement: script).
- [ ] 7.3 Script composed; test: four fewer Catacombs in the deck, a Mound placement; R1, R2 and `none`; coverage complete.

## 8. Return to Black Stars Rise (52054)

- [ ] 8.1 Setup: the original pile (03294, 03295) or the new pile (52055, 52056) kept at random, the other removed, then the base setup; token table = 03274's; connections = the base's with the kept pair in the Cloister and Knight's Hall slots.
- [ ] 8.2 Cards: 52054 (script), 52055 Cloister and 52056 Knight's Hall (remember "found the tower key" / "found a guide": scripts), 52057 Hastur's Gaze and 52058 Hastur's Grasp (Hidden; forced after doom on the c / a deck: scripts over the two-deck `doomPlaced` trigger).
- [ ] 8.3 Script composed; test: never a mixed pile; R1–R3 and `none`; coverage complete.

## 9. Return to Dim Carcosa (52059)

- [ ] 9.1 Setup: Hastur's Domain 52060 in place of 03331 with the Palace's connections; 52061, 52062, 52063 set aside; Hastur's health floor of 2 per investigator until an investigator knows the secret; token table = 03316's.
- [ ] 9.2 Cards: 52059 (script), 52060/52060b (cannot flip while Hastur is above the floor; the flip puts the version-matching location into play: script), 52061/52061b Recesses of Your Own Mind (willpower 0, one investigator per copy, "know the secret" flip: script), 52062/52062b The Throne Room (Hastur cannot leave, exhaust or make attacks of opportunity: script), 52063/52063b Stage of the Ward Theatre (temporary connection while Hastur moves: script), 52064 High Priest of Hastur (prey most cards in hand; eliminates a Possession holder when attacked: script).
- [ ] 9.3 Script composed; test: Hastur stops at the floor without the secret and not with it; R1–R5 and `none`; coverage complete.

## 10. Replacement sets option on the base campaign

- [ ] 10.1 Failing test first: a The Path to Carcosa campaign created with `rtptc-replacement-sets` starts Curtain Call with Maddening Delusions and Neurotic Fear in place of Delusions and Striking Fear; with the option off no replacement card is in the deck.
- [ ] 10.2 `content/campaigns/the-path-to-carcosa/campaign.json` declares the option with the bookmark's five pairs in the `CampaignDef.options` shape of `campaign-return-to-the-dunwich-legacy`; strings `campaign.option.rtptc-replacement-sets` in `content/i18n/{en,ru}/ui.json`; the content check of the Dunwich change validates the set codes.

## 11. Flow and translations

- [ ] 11.1 `flow.json`: the base flow's hand fixes carried over with the `return-to-` ids, the six-way `ask_which_mid_game_token` read from the recorded version, the Return-to log keys as `scenario-import-fixes` names them; a test walks the 8 scenarios, both interludes and the epilogue.
- [ ] 11.2 Ability labels and prompt keys in `content/i18n/{en,ru}/ui.json`; ru card text of every rtptc code already in `content/i18n/ru/packs/return.generated.json`; `check:content` passes.

## 12. Coverage and verification

- [ ] 12.1 `pnpm coverage`: `campaigns["return-to-the-path-to-carcosa"].complete` true; `docs/campaign-program.md` rtptc row at 0 encounter cards left (player count unchanged).
- [ ] 12.2 Bot playthrough of each Return scenario to a resolution, 0 errors.
- [ ] 12.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate campaign-return-to-the-path-to-carcosa --strict`.
