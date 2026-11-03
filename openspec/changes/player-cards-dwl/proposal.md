## Why

The Dunwich Legacy cycle's player cards are in the deck builder but not in the game: of the 136 player cards of the dwl, tmm, tece, bota, uau, wda, litas and rtdwl packs, 6 work (Laboratory Assistant, Clarity of Mind 0 and 3, Smoking Pipe, Painkillers, one Strange Solution 4), and the five Dunwich investigators (Zoey Samaras, Rex Murphy, Jenny Barnes, Jim Culver, "Ashcan" Pete) have no behaviour, so a Dunwich campaign is played with core-set decks only. Coverage reports dwl 2 of 40, tmm 2 of 16, tece 0 of 14, bota 0 of 15, uau 0 of 12, wda 1 of 14, litas 0 of 12, rtdwl 1 of 13 (report `dwl.md`, section 5).

## What Changes

- **Every player card of the cycle works**: 118 cards (the 136 minus the 18 neutral story assets and set-aside weaknesses `campaign-the-dunwich-legacy` and `campaign-return-to-the-dunwich-legacy` write: 02040, 02059, 02060, 02061, 02079, 02080, 02138, 02139, 02140, 02178, 02179, 02215, 02217, 02218, 02219, 02254, 51031, 51052), in data in `content/packs/dwl/cards.json` and `content/packs/return/cards.json` where the vocabulary fits (about 47), with a script in the pack's `scripts/<code>.ts` otherwise (about 29), the 6 that work kept.
- **The five investigators work**: Zoey's reaction and elder sign, Rex's clue on success by 2 and his elder sign, Jenny's upkeep resource and elder sign (data with small vocabulary); Jim Culver (skull treated as 0; elder sign may count as a skull) and "Ashcan" Pete (starts with Duke in play; discard a card to ready an asset) by script. Coverage's `investigators["02001"…"02005"]` true.
- **Vocabulary** needed by two or more cards or by a card no script should carry: uses paid with X resources (02010); heal and discover at a connecting location (02012, 02023); a fight or investigate with a base skill value and a move after it (Duke 02014; Acidic Ichor 02263, Freezing Variant 02264 by the Researched gate); assets that cannot ready (02015); no damage to others on a failed attack (Blackjack 02016, 51002); `moveTo` an investigator's location (02022); a test taken by the healed investigator (02024); an `enemyWouldSpawn` trigger (02025); `loseActions` from one's own card (Rite of Seeking 02028, 02233, 51007); moving an enemy (02034); an `actions` cost (02036); a starting-resources modifier (02037); a damage bonus as an amount (02107); doubled uses (02109); redirecting an attack's damage (02113); an extra clue by margin (02150); the condition "a resign ability in play" (02151); hand size and alone-at-location conditions (02187, 02188); a doom-on-self cost (02191); commit restrictions (02192, 02227, 51010); heal equal to an enemy's horror (02225); a target not engaged with you (02226); return to hand by margin (02231); skip upkeep income (02234); icons when committed by another investigator (02260); prevent X and gain X (02261); remove doom (02267); heal on a skill's success (02268); a parley difficulty modifier (02272); defeat an enemy outright (02300); return a committed skill (02309).
- **Exile** (02114, 02115, 02271) and **Researched** (02262, 02263, 02264, 51004) come from `engine-generic-keywords`; `discardDeckTop` and `loseActions` from `campaign-the-dunwich-legacy`; this change only uses them.
- **Adaptable** (02110): between scenarios, up to 2 level-0 cards swapped for free (`src/engine/campaign/upgrade.ts`). **Brother Xavier** (02106): damage to other investigators at his location may be assigned to him.
- Coverage: the eight packs' player columns at 0 left in `docs/campaign-program.md`; `ENGINE_VERSION` bump.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-content`: the vocabulary above; every player card of the eight packs declared; the packs reported complete on the player side.
- `investigator-decks`: the five Dunwich investigators' abilities and elder signs; their coverage entries true.

## Impact

- `content/packs/dwl/cards.json`, `content/packs/dwl/scripts/<code>.ts`, `content/packs/return/cards.json`, `content/packs/return/scripts/<code>.ts`, `content/investigators-generated/0200{1..5}.json` (unchanged; behaviour lives in `cards.json` by investigator code), `content/i18n/{en,ru}/ui.json` ability labels.
- `src/content/schema.ts`, `src/engine/effects/*` (new ops, targets, amounts), `src/engine/rules/skillTest.ts` (`baseSkill` in the op schema, "no damage to others on fail"), `rules/cards.ts` (costs `actions`, `doomOnSelf`, commit restrictions), `rules/round.ts` (upkeep income skip, starting resources), `rules/tokens.ts` (Jim's skull), `campaign/upgrade.ts` (Adaptable), `campaign/decks.ts` (Pete starts with Duke).
- `content/coverage.json`, `docs/campaign-program.md`; `ENGINE_VERSION`.
- Depends on `engine-generic-keywords` (Exile, Researched) and on `campaign-the-dunwich-legacy` group 1–2 (`discardDeckTop`, `loseActions`); independent of the rest of that change.

## Decided (assumed)

- Story assets and the set-aside weaknesses (18 codes above) are the campaign changes' and are listed here only as done elsewhere; no card is written twice.
- Investigator abilities are declared in `cards.json` under the investigator's code, as the core investigators are.
- Per-pack task groups in cycle order, so a pack can land on its own and tick its program row.

## Decided (user)

- **Adaptable (02110) is Permanent.** It never enters the deck draw, the hand or the discard pile. It starts the game face up in the investigator's play area and stays there all scenario; `src/engine/index.ts` already puts a Permanent card into play at setup. Its text works only between scenarios: on the upgrade screen, a deck with Adaptable may swap up to 2 level-0 cards for 2 other level-0 cards at 0 XP, under the investigator's deckbuilding rules.
- **The parallel investigators from aon and rod are not in this change.** These are 90001–90003 and 90008–90010: parallel "Skids" O'Toole and parallel Daisy Walker, with their signature cards. They are parallel investigators with their own deckbuilding rules, not side or promo cards. `player-cards-investigator-decks` owns them as a parallel-investigator group, beside the challenge scenarios `campaign-side-all-or-nothing` and `campaign-side-read-or-die`.

- **Double or Nothing (02026) is a script, not a general "double" op.** Committing it doubles the test's difficulty before the result is computed. On success, the script resolves the test's success effects once more: the action's outcome (clue, damage, evade) and every "if this test is successful" effect of the cards used or committed. Reactions to a success (`after you successfully…`) and chaos token effects still resolve once, since they belong to their own windows and not to the success effects.
