## Why

The Forgotten Age cycle's player cards are in the deck builder but not in the game: coverage reports tfa 39 of 40 not working, tof 13 of 15, tbb 13 of 13, hote 13 of 13, tcoa 10 of 10, tdoy 13 of 13, sha 11 of 11, rttfa 18 of 18 (only Scene of the Crime 04103 and Lucky Cigarette Case 04107 work), and the five investigators (Leo Anderson, Ursula Downs, Finn Edwards, Father Mateo, Calvin Wright) have no behaviour, so a Forgotten Age campaign is played with core-set decks only (report `tfa.md`, section 5).

## What Changes

- **Every player card of the cycle works**: the 130 cards coverage counts minus the 9 story assets and relics `campaign-the-forgotten-age` writes (04051 Alejandro Vela, 04061, 04191, 04303, 04343 Relic of Ages, 04147 Ichtaca, 04148 Expedition Journal, 04244 Body of a Yithian, 04256 The Custodian) and Veda Whitsley 53037 (`campaign-return-to-the-forgotten-age`), in data in `content/packs/tfa/cards.json` and `content/packs/return/cards.json` where the vocabulary fits (about 55), with a script in the pack's `scripts/<code>.ts` otherwise (about 45), the 2 that work kept.
- **The five investigators work**: Ursula's free investigate after a move (data), Finn's extra evade-only action (data, the restricted-action shape of Galvanize), Calvin's skills per damage and horror (data with a stat-per-token amount); Leo Anderson's turn-start Ally for 1 less and Father Mateo's auto-fail turned elder sign (scripts); their elder signs. Coverage's `investigators["04001"…"04005"]` true.
- **Seal** (04013 Codex of Ages, 04014 Serpents of Yig, 04030 and 53008 The Chthonian Stone, 04031 Protective Incantation, 04199 Premonition, 04235 Crystalline Elder Sign, 04310 Shards of the Void, 04311 Seal of the Seventh Sign) uses `engine-bless-curse`'s seal and release; this change writes the nine cards over it.
- **Vocabulary** needed by two or more cards or by a card no script should carry: play from the discard pile (04033, 04272, 04312); an event that attaches to an asset (04019 Trusted, 04020 Reliable); an extra action restricted to one designator (Finn, 04148's shape); a test difficulty equal to an enemy's evade (04027); an enemy returned to the top of the encounter deck (04034); a commit restriction with wild icons per hand size (04036); extra Ally slots (04006); direct damage assignable to assets (04015); an evade with willpower followed by a move (04029, 04271, 53007); a cancel of a symbol token (04110); an attack at a connecting location ignoring Aloof and Retaliate (04104); a parley that shuffles the enemy into the encounter deck (04105); a prevent of up to N from defeat (04111); auto-evade on a successful attack (04112); a "drew a treachery this round" condition (04149); wild icons per actions taken this phase (04150); a bonus equal to matching icons on an asset (04151); secrets placed among assets (04152, 53003); a test taken from a scenario card (04153); a committed skill returned (04159); shroud minus revealed connections (04194); a lowered enemy fight (04195); an attachment to an enemy (04265); connections counted (04275); a customised X from spent ammo (04229); X equal to the shroud (04196); doubled clues on a token (04158's name-a-token as a script).
- **Campaign-log chains**: Ancient Stone 04022 records "identified the stone (N)" and Researched 04230, 04231, 53004 read it (`engine-generic-keywords` for Researched); Dark Pact 04038 → The Price of Failure 04039; Doomed 04040 → Accursed Fate 04041 → The Bell Tolls 04042 (the investigator killed); Offer You Cannot Refuse 53013 → Fine Print 53014 → Sell Your Soul 53015 (experience on the bearer, deck replacement, driven insane); the upgrade rules of Shrewd Analysis 04106 and Arcane Research 04109 in `src/engine/campaign/upgrade.ts`; On Your Own 53010 Permanent with its deckbuilding restriction; in-scenario trauma for Voice of the Messenger 04016.
- Coverage: the eight packs' player columns at 0 left in `docs/campaign-program.md`; `ENGINE_VERSION` bump.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-content`: the vocabulary above; every player card of the eight packs declared; the packs reported complete on the player side.
- `investigator-decks`: the five Forgotten Age investigators' abilities and elder signs; their coverage entries true; On Your Own's and Arcane Research's deckbuilding rules.

## Impact

- `content/packs/tfa/cards.json`, `content/packs/tfa/scripts/<code>.ts`, `content/packs/return/cards.json`, `content/packs/return/scripts/<code>.ts`, `content/i18n/{en,ru}/ui.json` ability labels; `content/investigators-generated/0400{1..5}.json` unchanged (behaviour under the investigator's code in `cards.json`).
- `src/content/schema.ts`, `src/engine/effects/*` (new ops, targets, amounts), `src/engine/rules/skillTest.ts` (difficulty from an enemy, willpower evade, retry), `rules/cards.ts` (play from discard, event attachments, commit restrictions, extra slots), `rules/round.ts` (restricted actions by designator, Leo's window), `rules/tokens.ts` (Mateo's auto-fail, token cancel, name a token), `campaign/upgrade.ts` (Shrewd Analysis, Arcane Research, On Your Own), `campaign/decks.ts` (the weakness chains).
- `content/coverage.json`, `docs/campaign-program.md`; `ENGINE_VERSION`.
- Depends on `engine-bless-curse` (seal), `engine-generic-keywords` (Researched), `engine-tfa-supplies-vengeance-exploration` (Ichtaca's vengeance condition is the campaign's; Expedition Journal's explore action likewise), and `campaign-the-forgotten-age` group 1 for the shared conditions; independent of the rest.

## Decided (assumed)

- Story assets and relics (10 codes above) are the campaign changes' and are listed here only as done elsewhere; no card is written twice.
- Investigator abilities are declared in `cards.json` under the investigator's code, as the core and Dunwich investigators are.
- Per-pack task groups in cycle order, so a pack can land on its own and tick its program row.
- A Permanent card (Shrewd Analysis, Arcane Research, On Your Own) starts in play as `src/engine/index.ts:230` already does; its text is an upgrade-screen rule.
- Live and Learn 04200 re-takes the failed test as a new test with the same parameters, not an undo: the first test's results stand, as the card says.

## Decided (user)

- **The parallel investigators and their cards are not in this change**: Agnes Baker 90017 with 90018, 90019 (bad) and Monterey Jack 90062 with 90063, 90064 and the rop cards belong to `player-cards-investigator-decks`, beside `campaign-side-bad-blood` and `campaign-side-relics-of-the-past`.

## Open questions

- None that need the user; the two weakness chains follow their printed text.
