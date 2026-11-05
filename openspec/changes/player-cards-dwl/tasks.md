## 1. Vocabulary and the investigators (dwl, 40 player cards and 02001–02005)

- [x] 1.1 Engine, test first (`src/engine/rules/__tests__/`, `effects/__tests__/`): `fight`/`investigate` `baseSkill` and `moveFirst: connecting` (Duke 02014); `noDamageToOthersOnFail` (Blackjack 02016); `Cost.actions` (Kukri 02036), `Cost.resourcesX` (Twin .45s 02010); `healAt`/`discoverClues at: connecting` (02012, 02023); `moveTo investigator` (Shortcut 02022); the healed investigator's test (Liquid Courage 02024); `enemyWouldSpawn` window (Think on Your Feet 02025); `moveEnemy` (Bait and Switch 02034); `startingResources` modifier (Indebted 02037); `cannotReady` (Wracked by Nightmares 02015); schema, `EFFECT_OPS`, one test each.
- [x] 1.2 Investigators in `content/packs/dwl/cards.json`, test each: Zoey 02001 (resource on engage; elder sign +1, +1 damage), Rex 02002 (extra clue on success by 2; elder sign), Jenny 02003 (upkeep +1 resource; elder sign X = resources); scripts `02004.ts` Jim Culver (skull 0; elder sign as skull), `02005.ts` "Ashcan" Pete (Duke in play at start via `campaign/decks.ts`; discard a card to ready an asset).
- [x] 1.3 Data cards, test each: 02006, 02008, 02010, 02012, 02014, 02015, 02016, 02017, 02019, 02022, 02023, 02024, 02025, 02027, 02028 (`loseActions`), 02029, 02032, 02033, 02034, 02035, 02036, 02037, 02038, 02039.
- [x] 1.4 Scripts, test each: 02007 Smite the Wicked, 02009 Rex's Curse, 02011 Searching for Izzie, 02013 Final Rhapsody, 02018 Teamwork, 02021 Strange Solution (`log:` note "identified the solution"), 02026 Double or Nothing (difficulty doubled; success effects resolved twice, reactions and token effects once; test a doubled clue and a doubled Deduction), 02031 Bind Monster.
- [x] 1.5 Labels `ability.<code>.<n>` en/ru; `pnpm coverage`: dwl player 40 of 40 (02040, 02059, 02060, 02061, 02079, 02080 from the campaign change), `investigators["02001"…"02005"]` true; program row dwl player column 0.

## 2. The Miskatonic Museum (tmm, 16)

- [x] 2.1 Vocabulary: damage bonus as an `Amount` (02107), doubled uses (02109), `redirectDamage` (02113), Exile from `engine-generic-keywords` on 02114 (evade all at the location) and 02115 (search any deck). (As printed, 02114 evades each other enemy engaged with you: `evade all: "engaged"`. Also: `extraDamageIf` checked as the damage is dealt (Song of the Dead's skull), `searchDeck intoPlay` with target `chooseAny`, `soaksForLocation: "damageAndHorror"`, conditions `testEnemyEngagedWithYou`, Amount `eventEnemyStat`.)
- [x] 2.2 Data: 02105, 02108, 02111, 02112, 02107, 02109, 02113, 02114, 02115; scripts 02106 Brother Xavier (soaks others' damage), 02110 Adaptable (`campaign/upgrade.ts`: 2 free level-0 swaps per scenario, test on the upgrade state). (Both in data, no script: Xavier through `soaksForLocation`, Adaptable's line read by the upgrade and accounted for in `implemented.ts`.)
- [x] 2.3 `pnpm coverage`: tmm 16 of 16 (02138, 02139, 02140 from the campaign change); program row.

## 3. The Essex County Express (tece, 14)

- [x] 3.1 Vocabulary: extra clue by margin (Deduction 2, 02150), condition "a resign ability in play" (02151). (Deduction 2 needs none: two `onPlay` `clueBonus` lines, by 0 and by 2. Added `resignInPlay`, `aloneAtYourLocation` (Stand Together), flag `luresEnemies` (Lure).)
- [x] 3.2 Data: 02147, 02148, 02149, 02150, 02151, 02152, 02154, 02155, 02157, 02158; scripts 02153 Hypnotic Gaze (`revealToken`), 02156 Lure (enemy movement redirect). (Both in data: Hypnotic Gaze with `revealToken` and `eventEnemyStat`, Lure with `luresEnemies` read by Hunter and Patrol movement.)
- [x] 3.3 `pnpm coverage`: tece 14 of 14 (02178, 02179 from the campaign change); program row.

## 4. Blood on the Altar (bota, 15)

- [x] 4.1 Vocabulary: hand-size condition (02187), alone-at-location condition (02188), `Cost.doomOnSelf` (02191), `commitOnly` restrictions (02192). (Condition `cardsInHand`; `aloneAtYourLocation` was group 3's; `Cost.doomOnSelf` through the PlaceDoom step; Rise as `commitOnlyOwnTest` + `commitDifficultyOverBase`. Also: "Limit 1 per investigator" enforced when an asset is played; a committed skill's forced ability fires in its test's windows (Defiance), with `ignoreSymbol` in the API.)
- [x] 4.2 Data: 02184, 02185, 02186, 02187, 02188, 02189, 02191, 02192, 02193, 02194; script 02190 Defiance.
- [x] 4.3 `pnpm coverage`: bota 15 of 15 (02215, 02217, 02218, 02219 from the campaign change); program row.

## 5. Undimensioned and Unseen (uau, 12)

- [x] 5.1 Vocabulary: heal equal to an enemy's horror (02225), a target not engaged with you (02226), commit restriction (02227), return to hand by margin (02231), `loseActions` on 02233, skip upkeep income (Dark Horse 02234). (`heal` takes Amounts, with `eventEnemyStat`; the enemyDefeated window carries the enemy as `defeated`, the context's enemy; fight `notEngagedWithYou` and condition `enemyNotEngagedWithYou`; `commitIf`; Opportunist needs none: `onPlay` `succeededBy` + `returnSelfToHand`; Dark Horse is flag `mayDeclineUpkeepResources`, a choice before the whole income, Jenny's `upkeepResources` included. For the scripts: `ignoreToken`, `afterTest`, `bonusAction` (a free `PerformAction`), `addTempMod(…, nextAttack)`.)
- [x] 5.2 Data: 02225, 02226, 02227, 02231, 02233, 02234; scripts 02228 Expose Weakness, 02229 Quick Thinking, 02230 Lucky Dice, 02232 Alyssa Graham, 02235 Survival Instinct 2. (Alyssa's +1 intellect and exhaust ability in data, the look in her script.)
- [x] 5.3 `pnpm coverage`: uau 12 of 12 (02254 from the campaign change); program row.

## 6. Where Doom Awaits (wda, 14)

- [x] 6.1 Vocabulary: icons when committed by another investigator (Leadership 02260), prevent X and gain X (02261), `removeDoom` (02267), heal on a committed skill's success (02268), parley difficulty modifier (02272); Researched from `engine-generic-keywords` on 02263 Acidic Ichor and 02264 Freezing Variant (base skill 6, 3 damage / evade). (Leadership: `CardDef.iconsOnOthersTest`; "I've had worse…": `preventDamage` kind `both` + `gain`; `removeDoom on: chooseYours`; Fearless 2 needs none: `heal` with an `{ base, plus, if }` Amount; Fine Clothes: ModStat `difficulty` + ModWhen `parleying`, the parley action's ctx marked `parley`; Researched on 02262–02264 and 51004.)
- [x] 6.2 Data: 02260, 02261, 02263, 02264, 02266, 02267, 02268, 02269, 02272, 02273; scripts 02265 Joey "The Rat" Vigil, 02270 A Chance Encounter, 02271 Stroke of Luck (Exile, auto-success). (Stroke of Luck in data: a forced `wouldFailSkillTest` choice on the committed skill, `exile` + `forceResult`. A Chance Encounter: flag `discardAtRoundEnd`, read at round cleanup.)
- [x] 6.3 `pnpm coverage`: wda 14 of 14; program row.

## 7. Lost in Time and Space (litas, 12)

- [x] 7.1 Vocabulary: `defeatEnemy` op (Monster Slayer 5, 02300), return a committed skill to hand (Try and Try Again 3, 02309). (`defeatEnemy { nonElite }`; `returnCommittedSkill` with condition `committedSkillYouOwn`. Also: trigger `encounterDrawn` (Ward of Protection 5, Maleson), flag `baseRaised` read by `baseSkill` (Red-Gloved Man), `skipPhase`/`repeatPhase` (Gold Pocket Watch); 02308 reuses the core Aquinnah's script.)
- [x] 7.2 Data: 02299, 02300, 02301, 02306, 02307, 02308, 02309; scripts 02302 Dr. William T. Maleson, 02303 Deciphered Reality, 02304 Chicago Typewriter, 02305 The Gold Pocket Watch, 02310 The Red-Gloved Man.
- [x] 7.3 `pnpm coverage`: litas 12 of 12; program row.

## 8. Return to The Dunwich Legacy (rtdwl, 13)

- [x] 8.1 Data in `content/packs/return/cards.json`: 51001 Bandolier 2, 51002 Blackjack 2, 51003, 51004 Strange Solution 4 (Researched), 51005, 51006, 51007 Rite of Seeking 2, 51009; scripts `content/packs/return/scripts/` 51010 Rise to the Occasion 3, 51011 Through the Gates. (Also: trigger `attackFailed`, before a failed attack's damage reaches the engaged investigator (Oops! 2); condition `testEnemyEngagedWithOther` (Blackjack 2); script `51001.ts` (Bandolier's two-Weapon-hands condition) and `51006.ts` (Think on Your Feet 2: the entering enemy is left unengaged).)
- [x] 8.2 `pnpm coverage`: rtdwl player 11 of 13 here; Engineer 51031 and Naomi O'Bannion 51052 are story assets done by `campaign-return-to-the-dunwich-legacy`; program row.

## 9. Verification

- [x] 9.1 `ENGINE_VERSION` bump with its restart test; labels en/ru complete, `check:content` passes.
- [x] 9.2 Browser: Pete with Duke in The Gathering on `pnpm dev --port 5174`: Duke investigates a connecting location; Jim's skull reads 0; in English and Russian, 0 console errors. (Run on port 5179; Pete's Duke moved to the Cellar and investigated it; Jim's skull read 0; English and Russian, console errors only the expected `/net/health` 502.)
- [x] 9.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate player-cards-dwl --type change --strict`.
