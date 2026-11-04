## 1. The move and the shared pieces

- [ ] 1.1 After `scenario-import-fixes` has generated `return-to-the-depths-of-yoth.json`, `git mv content/campaigns-generated/return-to-the-forgotten-age content/campaigns/return-to-the-forgotten-age`; `generated: false`; `order` includes `return-to-the-depths-of-yoth` after Return to The City of Archives; the importer skips it; `pnpm check:content` passes unchanged.
- [ ] 1.2 Each scenario file: `card` = the base card, `setupCards` = the Return-to card, `afterExplore` = shuffle the top encounter card into the exploration deck; the base token table copied; test: every Return scenario reports tokens real once its base does, and a successful exploration grows the deck by one.
- [ ] 1.3 The 10 base scripts export their hooks; `scripts/return-to-<id>.ts` composed with `compose()`; a test asserts each Return script's hooks are a superset of its base's.
- [ ] 1.4 Replacement sets and Return to the Rainforest in `content/packs/return/cards.json`, test per card: data 53067 (chalk), 53068 (rope), 53069 (binoculars), 53070 (torches) with symbols from the scans, 53079, 53080 (vengeance difficulty, poison), 53074 (attached, vengeance 1: new vocabulary); scripts 53071, 53072, 53073 (doom divided evenly), 53075 (shuffle into the exploration deck), 53076, 53077 (as 04091), 53078 (copies from the victory display).

## 2. Return to The Untamed Wilds (53016)

- [ ] 2.1 Setup: the base setup, then `buildExploration { bySymbol }` over 04069–04073 and 53067–53070 for Purple Moon, Blue Triangle, Red Square and Orange Heart, no treacheries, the rest removed; the camp's check usable anywhere (a flag the composed script sets); tests.
- [ ] 2.2 Script composed; test to R1 and R2 exploring to every symbol; coverage complete.

## 3. Return to The Doom of Eztli (53017)

- [ ] 3.1 Setup: 04065, 04066, 04067 removed; 53019 Entryway in play and the start, 04060 removed; 53021, 53022, 53025 and 53018 Harbinger in place of 04063, 04064, 04068, 04062; `buildExploration` 53020–53026; three Pit Vipers 04078 set aside; symbols for 53019–53026 from the scans; tests (one Entryway, one Harbinger, one Chamber of Time).
- [ ] 3.2 Cards: data 53020 Key of Eztli check, 53021 (canteen), 53022 (rope), 53025 (reverse flip), 53026 (map, vengeance 1); scripts 53018 Harbinger of Valusia (composing 04062's), 53023 Throne Room (vengeance with doom), 53024 Snake Pit (set-aside Vipers), 53027.
- [ ] 3.3 Script composed; test to R1, R3 and the R4 replay; coverage complete.

## 4. Return to Threads of Fate (53028)

- [ ] 4.1 Setup: the base's three decks plus deck 4 (g/h) from 53029–53036, the version by a flow choice before the scenario; Veda Whitsley 53037 set aside; Cult of Pnakotus in place of Dark Cult; tests.
- [ ] 4.2 Cards: scripts 53029–53036 and the b-sides (53029b crosses off medicine; 53030b, 53032b, 53034b story assets; 53036 "if the Harbinger leaves play"), 53037 Veda Whitsley (story ally; the deck inclusion through the flow), the Loading Docks with resources.
- [ ] 4.3 Script composed; `flow.json`: the act-card experience restricted to supplies and healing, "recruited the help of another expedition" and Veda's inclusion; test to the four decks' outcomes; coverage complete.

## 5. Return to The Boundary Beyond (53038)

- [ ] 5.1 Setup: one of each Present-Day pair (04168/53039 … 04173/53044) at random in play, the other removed; `buildExploration` 04174–04185 only; the Return-to Harbinger set aside; symbols for 53039–53044 from the scans (the base pairs share them); tests.
- [ ] 5.2 Cards: data 53044 Coyoacán (no healing); scripts 53039 (explore after a successful investigate), 53040, 53041, 53042 (explore for 10+ resources or 4 icons), 53043 (explore after fight or evade).
- [ ] 5.3 Script composed; test to R1 and R2; coverage complete.

## 6. Return to Heart of the Elders, Part 1 (53045)

- [ ] 6.1 Setup: act 1a 53046 in place of 04209; `buildExploration { bySymbol }` six Jungle locations over 04069–04073, 04217 and 53067–53070; the Mouth's check anywhere; Doomed Expedition and Return to the Rainforest gathered; tests.
- [ ] 6.2 Cards: scripts 53046 A Familiar Pattern / 53046b The Winged Serpent (flips at 5+ damage), 53047 Feathered Serpent (evade with a supply, vengeance 1).
- [ ] 6.3 Script composed; test to R1 and the replay; coverage complete.

## 7. Return to Heart of the Elders, Part 2 (53048)

- [ ] 7.1 Setup: `buildExploration { bySymbol }` over the K'n-yan locations 04222–04226 and 53049–53052 for Purple Moon, Blue Triangle, Red Square and Green Diamond; the Return-to Harbinger; the Mouth's check anywhere and discarding enemies; Venomous Hate gathered; symbols for 53049–53052 from the scans; tests.
- [ ] 7.2 Cards: data 53049 (compass), 53050 (sticky goop record; canteen), 53051 (torches), 53052 (pickaxe).
- [ ] 7.3 Script composed; `ended` writes `log:rttfa:sticky_goop`; test to the resolutions; coverage complete.

## 8. Return to The City of Archives (53053)

- [ ] 8.1 Setup: the Halls of the Southern Corridors 53055 in play; Cyclopean Vaults and Alien Conservatory set aside until act 1b; acts 04241, 53054, 04243; tests.
- [ ] 8.2 Cards: data 53055, 53056, 53057 (hand size −2), 53058 (the new remembered flags: read about Earth, saw a familiar specimen); script 53054 (the eight tasks), the Captive Subjects.
- [ ] 8.3 Script composed; test with the two new tasks counted; coverage complete.

## 9. Return to The Depths of Yoth (53059)

- [ ] 9.1 Setup from the generated file: the base setup with the Return-to Harbinger; Perils of Yoth 53060 shuffled into the first exploration deck and each new one (the base script's `onDepthAdvance` hook); tests.
- [ ] 9.2 Cards: script 53060 Perils of Yoth.
- [ ] 9.3 Script composed; `flow.json`: the Key of Eztli recorded in one investigator's supplies when sticky goop and "collected a strange liquid" hold; test to depth 3; coverage complete.

## 10. Return to Shattered Aeons (53061)

- [ ] 10.1 Setup: `buildExploration` the four Otherworld locations (04327–04329 and the Return-to one); the new Shattered locations 53062–53065 set aside with the originals; Temporal Hunters gathered; symbols from the scans; tests.
- [ ] 10.2 Cards: scripts 53062, 53063, 53064 Ultima Thule (seals an elder sign; `engine-bless-curse`), 53065 (reveal 4 tokens).
- [ ] 10.3 Script composed; test to R1–R5; coverage complete.

## 11. Return to Turn Back Time (53066)

- [ ] 11.1 Setup as Return to The Doom of Eztli's plus the base Turn Back Time's; script composed from both; test to R1; coverage complete.

## 12. Replacement sets option on the base campaign

- [ ] 12.1 Failing test first: a Forgotten Age campaign created with `rttfa-replacement-sets` starts The Untamed Wilds with Doomed Expedition in place of Expedition and, in Eztli, Venomous Hate and Temporal Hunters in place of Yig's Venom and Temporal Flux; with the option off no rttfa card is in any deck.
- [ ] 12.2 `content/campaigns/the-forgotten-age/campaign.json` declares the option with the bookmark's four pairs under `replaceSets` and `return_to_the_rainforest` under `addSets` (the `CampaignDef.options` shape of `scenario-import-fixes`); label `campaign.option.rttfa-replacement-sets` en/ru; `check:content` validates the set ids; test that the four Rainforest cards join the Rainforest set with the option on and are absent with it off.

## 13. Flow and translations

- [ ] 13.1 `flow.json`: the base flow's hand fixes carried over, the Return-to log keys as `scenario-import-fixes` names them, the Resupply Point with unlimited trauma healing and `buySupplies { xpRate: 2, xpMax: 10 }`, Return to The Depths of Yoth in `order`; a test walks the 10 scenarios and the interludes.
- [ ] 13.2 Ability labels and prompt keys in `content/i18n/{en,ru}/ui.json`; the ru card text of every rttfa code is already in `content/i18n/ru/packs/return.generated.json` (85 of 85); `check:content` passes.

## 14. Coverage and verification

- [ ] 14.1 `pnpm coverage`: `campaigns["return-to-the-forgotten-age"].complete` true with 10 scenarios; `docs/campaign-program.md` rttfa row at 0 encounter cards left (player count unchanged).
- [ ] 14.2 Bot playthrough of each Return scenario to a resolution, 0 errors.
- [ ] 14.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate campaign-return-to-the-forgotten-age --strict`.
