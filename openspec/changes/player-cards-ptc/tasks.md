## 1. Vocabulary and the investigators (ptc, 37 player cards and 03001–03006)

- [x] 1.1 Engine, failing test first (`src/engine/rules/__tests__/`, `effects/__tests__/`): `Amount.damageOnYouHalf` (03008); `commitFromAfar` and the `committed` window with "exactly one" (03010); `toVictory` for a defeated enemy (03016); flag `cardsCannotLeaveDiscard` and prey `{ only }` (03017); `nextTestBonus` after a move to a location with clues (03024); `investigate { at: anyRevealed }` (03027); evade `{ noExhaust, cannotEngageYouThisTurn }` (03028); `wouldSucceed` window (03030); `keepUseUnlessSucceededBy` (03031); `gainResources { amount: succeededBy, max }` with a symbol-token backlash (03032); `moveTo anyRevealed` with a token penalty (03034); condition `testOnSpell` (03035); location attachment `enemiesGainAloof` (03038); `takeFromDiscard { faction: survivor }` on success (03039); schema, `EFFECT_OPS`, one test each.
- [x] 1.2 Investigators in `content/packs/ptc/cards.json`, test each: Mark 03001 (`startsInPlay: ["03009"]` in `campaign/decks.ts`; draw after damage on a controlled card, once per phase; elder sign +1 per damage), Minh 03002 (wild icon on a committed card, once per investigator per round; elder sign +1 and a skill returned), Akachi 03004 (`usesBonus` charges +1; elder sign +1 and a charge), Yorick 03005 (`searchAndPlay { from: discard, type: asset }` after a defeat, once per round; elder sign +2 and a card back on success); scripts `03003.ts` Sefina (13-card opening hand, up to 5 events beneath, draw action, elder sign) and `03006.ts` Lola (role prompt after the opening hand, `allowedForRole` filter in `canPlay`, commit and `UseAbility`, fast switch once per round, elder sign).
- [x] 1.3 Data cards, test each: 03008, 03010, 03016, 03017, 03020, 03021, 03024, 03026, 03027, 03028, 03030, 03031, 03032, 03034, 03035, 03036, 03037, 03038, 03039.
- [x] 1.4 Scripts, test each: 03007 The Home Front, 03009/03009b Sophie (flip at 5 damage, back at 4), 03011 The King in Yellow, 03012 The Painted World and 03013 Stars of Hyades (Sefina's beneath pile), 03014 Spirit-Speaker, 03015 Angered Spirits (end-of-game trauma), 03018 Improvisation and 03019 Crisis of Identity (`setRole`), 03022 "Let me handle this!", 03023 Ever Vigilant, 03025 Archaic Glyphs (third secret records "researched"), 03029 Sleight of Hand, 03033 Uncage the Soul, 03042 The Thing That Follows.
- [x] 1.5 Labels `ability.<code>.<n>` en/ru; `pnpm coverage`: ptc player 47 of 47 (03059, 03076a, 03077–03080 and their story sides from the campaign change), `investigators["03001"…"03006"]` true; program row ptc player column 0.

## 2. Echoes of the Past (eotp, 17)

- [x] 2.1 Vocabulary: `composure` horror priority and `limitInPlay { trait: Composure, n: 1 }` (03107, 03109, 03111, 03113, 03115); commit condition `remainingSanity { max: 3 }` (03116–03119, 03143); hand cost modifier on the other cards (03142); enemy gains Retaliate while attacked (03110); `Amount.doomOnSelf` (03112); play condition `sanity { min: 5 }` with an enemy modifier until end of turn (03108).
- [x] 2.2 Data: 03107, 03108, 03109, 03110, 03111, 03112, 03113, 03115, 03116, 03117, 03118, 03119, 03142, 03143; scripts 03106 Heroic Rescue (redirect an attack to you), 03141 Mr. Peabody (location −1 shroud and Passageway until he readies).
- [x] 2.3 `pnpm coverage`: eotp 17 of 17; program row.

## 3. The Unspeakable Oath (tuo, 12)

- [x] 3.1 Vocabulary: `Amount.enemiesEngaged` and engage without attacks of opportunity (03147); location attachment with an `enemySpawns` trigger (03148); target `enemyNotEngagedWithYou` (03152); `damageEachEnemyAt` with a token backlash (03153); Exile from `engine-generic-keywords` on 03156 A Test of Will and 03157 Devil's Luck.
- [x] 3.2 Data: 03147, 03148, 03150, 03151, 03152, 03153, 03154, 03155, 03156, 03157; scripts 03149 Charles Ross, Esq., 03158 Calling in Favors.
- [x] 3.3 `pnpm coverage`: tuo 13 of 13 (03182a from the campaign change); program row.

## 4. A Phantom of Truth (apot, 11)

- [x] 4.1 Vocabulary: `defeatEngagedNonElite` + defeat self + trauma (03189); `ignoreRetaliate` (03190); discard a Terror from the threat area (03191); Researched from `engine-generic-keywords` on 03192 and 03193 with `discoverClues { per: 2 of succeededBy }` and auto-evade on success; auto-evade on margin (03194); `shuffleDiscardIntoDeck` (03196); `addUses` with a symbol-token discard (03197).
- [x] 4.2 Data: 03189, 03190, 03191, 03192, 03193, 03194, 03195, 03196, 03197, 03198; script 03199 Snare Trap.
- [x] 4.3 `pnpm coverage`: apot 12 of 12 (03227 from the campaign change); program row.

## 5. The Pallid Mask (tpm, 12)

- [x] 5.1 Vocabulary: ready and heal an Ally on success (03228); `firstAction` reused (03229); location attachment granting a move anyone may use (03232); `Cost.resourcesX` commit with a payout (03233); `extraActionOncePerTurn` (03234); charges as a commit cost for wild icons (03235); test against an enemy's evade that defeats it (03237); `distributeUses` (03239).
- [x] 5.2 Data: 03228, 03229, 03231, 03232, 03233, 03234, 03235, 03236, 03237, 03239; script 03238 A Chance Encounter.
- [x] 5.3 `pnpm coverage`: tpm 12 of 12; program row.

## 6. Black Stars Rise (bsr, 11)

- [x] 6.1 Vocabulary: `giveAction` to another investigator (03265); location shroud modifier until end of turn (03266); condition `attackOfOpportunity` (03267); `wouldBeDefeatedByHorror` heal (03269); doom or horror on entering play with a search (03271); Suggestion (4) (03268).
- [x] 6.2 Data: 03265, 03266, 03267, 03268, 03269, 03270, 03271, 03273; scripts 03263 On the Hunt, 03264 Stick to the Plan (Permanent; attach before the opening hand, `extraPlayable` from beneath), 03272 "Not without a fight!" (`icons` hook).
- [x] 6.3 `pnpm coverage`: bsr 11 of 11; program row.

## 7. Dim Carcosa (dca, 12)

- [x] 7.1 Vocabulary: `cancelAssignedDamage` (03305); no attack of opportunity on play with a first-turn bonus (03309); `noChaosTokens` + forced elder sign + remove from game (03312); Newspaper (03313); Time Warp's rewind (design decision 5): `actionStart` (a key, not a choice count: see the design) in the engine, `state.rewind` set by 03311, resolved in `src/engine/index.ts replay`, and the store rebuilding through `replay` as `runUndo` does. Tests, failing first: Time Warp after an investigate restores the clue, the action and the horror, and Time Warp is in the discard; the chaos token drawn again differs from the undone one under the same seed; a saved game with a Time Warp choice replays to the same state; the Undo button's floor is unchanged.
- [x] 7.2 Data: 03305, 03307, 03309, 03312, 03313, 03314; scripts 03304 "Eat lead!" (2), 03306 Eidetic Memory, 03308 Charon's Obol (Permanent; `campaign/upgrade.ts` +2 XP if not defeated; `campaign/campaign.ts` killed if defeated, even under a saving resolution), 03310 Cheat Death, 03311 Time Warp, 03315 Key of Ys.
- [x] 7.3 `pnpm coverage`: dca 13 of 13 (03321b from the campaign change); program row.

## 8. Return to The Path to Carcosa (rtptc, 13)

- [x] 8.1 Data in `content/packs/return/cards.json`: 52001 .32 Colt (2) (the fast return to hand for 1 resource), 52005 Stealth (3) (a fast evade during your turn), 52006 Suggestion (1) (`discardWhenEmpty`; 03268 got it too, its printed "no charges, discard it" had been missed), 52007 Alchemical Transmutation (2), 52008 Storm of Spirits (3), 52009 Lantern (2) and 52010 Gravedigger's Shovel (2) (discarded, with a choice to remove it from the game for 2). Scripts in `content/packs/return/scripts/`, the card being more than the data says: 52002 "Eat lead!" (03304 with X fixed at 1, only while the Firearm has an ammo to spend), 52003 Logical Reasoning (4) (03191's choice once per clue, up to 3), 52004 Archaic Glyphs (Prophecy Foretold) (data: Researched by `translatedTheGlyphs` and the investigate; script: an asset of printed cost ≤ the margin from hand into play, or none), 52011/52012/52013 Unspeakable Oath (shared `oath` hook in 52011: 2 fewer experience in hand at the game's end or elimination; Bloodthirst on `excessDamage`, Curiosity on `successfulInvestigate` with no clues left on the location, Cowardice an evade test against an exhausted unengaged enemy). `isHidden` now holds a player's own Hidden weakness in hand (not discardable but by its text, abilities live). Tests: `src/engine/__tests__/rtptcPlayerCards.test.ts`, one per card at least.
- [x] 8.2 `pnpm coverage`: rtptc player 13 of 15 here; 52025 and 52026 are story assets done by `campaign-return-to-the-path-to-carcosa`; program row rtptc player column 2 of 15.

## 9. Verification

- [x] 9.1 `ENGINE_VERSION` 16 → 17 (the restart test reads `ENGINE_VERSION - 1`); replays re-recorded, only the version stamp changed; labels en/ru complete (`src/content/ptcAbilityLabels.test.ts` covers 52001–52013 too), `check:content` passes.
- [x] 9.2 Browser: Lola Hayes in The Gathering on `pnpm dev --port 5182`: the role prompt after the opening hand, a non-role card greyed, the switch; Mark with Sophie; in English and Russian, 0 console errors; screenshots under `.playwright-mcp/`.
- [x] 9.3 `pnpm exec oxfmt` on this change's files (not repo-wide: the working tree holds unrelated work), `pnpm lint`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate player-cards-ptc --strict`.
