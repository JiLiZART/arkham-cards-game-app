## 1. Vocabulary and the investigators (tfa, 40 player cards and 04001–04005)

- [ ] 1.1 Engine, test first (`src/engine/rules/__tests__/`, `effects/__tests__/`): `playFromDiscard` with removal after (04033); an event that attaches to an asset (04019, 04020); `gainActions { onlyFor: evade }` at turn start (Finn); `Amount { statPerToken }` (Calvin); difficulty from an enemy's evade (04027); `enemyToDeckTop` (04034); `commitOnly` with wild icons per hand size (04036); extra Ally slots (04006); direct damage assignable to assets (04015); willpower evade then move (04029); `extraDamageIf` not engaged (04011); search the discard or top 9 for a trait (04010); `addUses` (04018); in-scenario trauma (04016); schema, `EFFECT_OPS`, one test each.
- [ ] 1.2 Investigators in `content/packs/tfa/cards.json`, test each: Ursula 04002, Finn 04003, Calvin 04005 (data); scripts `04001.ts` Leo Anderson (turn-start Ally for 1 less), `04004.ts` Father Mateo (auto-fail → elder sign once per game; elder sign choice).
- [ ] 1.3 Data cards, test each: 04006, 04007, 04010, 04011, 04015, 04017, 04018, 04019, 04020, 04025, 04026, 04027, 04029, 04033, 04034, 04036, 04039.
- [ ] 1.4 Seal cards over `engine-bless-curse`, test each: 04013 The Codex of Ages, 04014 Serpents of Yig, 04030 The Chthonian Stone, 04031 Protective Incantation.
- [ ] 1.5 Scripts, test each: 04008 Jake Williams, 04009 Call of the Unknown, 04012 Caught Red-Handed, 04021 Dr. Elli Horowitz, 04022 Ancient Stone (`count:` note "identified the stone"), 04023 Tooth of Eztli, 04024 Unearth the Ancients, 04028 "You handle this one!", 04032 Dark Prophecy, 04035 Yaotl, 04037 Backpack; the chains in `src/engine/campaign/decks.ts`: 04038 Dark Pact → 04039, 04040 Doomed → 04041 → 04042 (killed), tests over two scenario ends.
- [ ] 1.6 Labels `ability.<code>.<n>` en/ru; `pnpm coverage`: tfa player 40 of 40 (04051, 04061 from the campaign change), `investigators["04001"…"04005"]` true; program row tfa player column 0.

## 2. Threads of Fate (tof, 15)

- [ ] 2.1 Vocabulary: attack at a connecting location ignoring Aloof and Retaliate (04104), parley shuffling the enemy into the deck (04105), cancel a symbol token (04110), prevent up to N from defeat (04111), auto-evade after a successful attack (04112).
- [ ] 2.2 Data: 04104, 04105, 04108, 04110, 04111, 04112; `src/engine/campaign/upgrade.ts`: 04106 Shrewd Analysis, 04109 Arcane Research (Permanent, in play from setup; upgrade-screen rules with tests on the upgrade state).
- [ ] 2.3 `pnpm coverage`: tof 15 of 15 (04147, 04148 from the campaign change); program row.

## 3. The Boundary Beyond (tbb, 13)

- [ ] 3.1 Vocabulary: "drew a treachery this round" condition (04149), wild icons per actions this phase (04150), bonus = matching icons on an asset (04151), secrets among assets (04152), a test from a scenario card (04153), return a committed skill (04159).
- [ ] 3.2 Data: 04149, 04150, 04151, 04152, 04153, 04154, 04155, 04156, 04157, 04159, 04160; script 04158 Recall the Future (name a token).
- [ ] 3.3 `pnpm coverage`: tbb 13 of 13 (04191 from the campaign change); program row.

## 4. Heart of the Elders (hote, 13)

- [ ] 4.1 Vocabulary: shroud −X per revealed connecting location (04194), lowered enemy fight (04195), Take Heart's draw and gain on a failed commit (04201).
- [ ] 4.2 Data: 04193, 04194, 04195, 04196, 04201, 04203; scripts 04192 Intrepid, 04197 Olive McBride, 04198 Defiance, 04199 Premonition (seal), 04200 Live and Learn (retry), 04202 Against All Odds, 04204 Ornate Bow.
- [ ] 4.3 `pnpm coverage`: hote 13 of 13; program row.

## 5. The City of Archives (tcoa, 10)

- [ ] 5.1 Vocabulary: X from the ammo spent (04229), Sacrifice's choice (04234).
- [ ] 5.2 Data: 04229, 04232, 04233, 04234, 04236 On Your Own (the deckbuilding check in `investigator-decks`); 04230, 04231 Ancient Stone (Researched from `engine-generic-keywords`, uses from the recorded number); seal 04235 Crystalline Elder Sign.
- [ ] 5.3 `pnpm coverage`: tcoa 10 of 10 (04244, 04256 from the campaign change); program row.

## 6. The Depths of Yoth (tdoy, 13)

- [ ] 6.1 Vocabulary: attachment to an enemy (04265 Handcuffs), connections counted (04275), play from discard on 04272.
- [ ] 6.2 Data: 04265, 04266, 04268, 04269, 04271, 04272, 04273, 04274, 04275, 04276; scripts 04267 Feed the Mind, 04270 The Skeleton Key.
- [ ] 6.3 `pnpm coverage`: tdoy 13 of 13 (04303 from the campaign change); program row.

## 7. Shattered Aeons (sha, 11)

- [ ] 7.1 Data: 04304, 04305, 04306, 04309, 04312 (play from discard), 04313; seal 04310 Shards of the Void, 04311 Seal of the Seventh Sign; scripts 04307 Pnakotic Manuscripts, 04308 Borrowed Time.
- [ ] 7.2 `pnpm coverage`: sha 11 of 11 (04343 from the campaign change); program row.

## 8. Return to The Forgotten Age (rttfa, 18)

- [ ] 8.1 Data in `content/packs/return/cards.json` sharing their originals' declarations: 53001 Blood Eclipse 3, 53002 Survival Knife 2, 53003 Truth from Fiction 2, 53005 Decorated Skull 3, 53006 Colt Vest Pocket 2, 53007 Mists of R'lyeh 4, 53009 Alter Fate 3, 53011 Backpack 2; 53004 Ancient Stone (Researched); 53008 The Chthonian Stone 3 (seal with charges); 53010 On Your Own 3 (Exceptional, Permanent).
- [ ] 8.2 Scripts `content/packs/return/scripts/`: 53012 Dendromorphosis; the chain 53013 Offer You Cannot Refuse → 53014 Fine Print → 53015 Sell Your Soul in `campaign/decks.ts` (experience on the bearer, deck replacement, driven insane), test over three scenario ends.
- [ ] 8.3 `pnpm coverage`: rttfa player 18 of 18 (53037 from the Return-to campaign change); program row.

## 9. Verification

- [ ] 9.1 `ENGINE_VERSION` bump with its restart test; labels en/ru complete, `check:content` passes.
- [ ] 9.2 Browser: Finn Edwards in The Gathering on `pnpm dev --port 5174`: the fourth action spendable only on an evade; Calvin's stats rise with damage; in English and Russian, 0 console errors.
- [ ] 9.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate player-cards-tfa --strict`.
