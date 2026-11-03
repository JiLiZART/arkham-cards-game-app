## Why

Return to The Path to Carcosa replays the 8 Carcosa scenarios with the box's setup cards, 5 replacement encounter sets and new acts, agendas, locations, enemies and Hidden treacheries: 359 cards used, 31 working (core cards), no real tokens, no script, and the 8 setup cards (52014, 52021, 52028, 52034, 52040, 52048, 52054, 52059) can never count as working today (report `ptc.md`, sections 1 and 4 "Return to"). Its generated files are wrong where the Return-to rules differ from the base: Return to Curtain Call's act deck is `["52015"]`, Return to The Last King's agendas `["52022"]` and both Crazed Guests in the encounter deck, Return to Echoes with all twelve Historical Societies set aside and none in play, Return to The Unspeakable Oath's acts `["52035"]`, Return to The Pallid Mask starting at Secret Passage. Once `campaign-the-path-to-carcosa` lands, each Return scenario is its base scenario's script and token table plus the box's differences.

## What Changes

- **The campaign becomes hand-kept**: `content/campaigns-generated/return-to-the-path-to-carcosa/` moves to `content/campaigns/return-to-the-path-to-carcosa/` (`generated` dropped), with `scripts/return-to-<scenario>.ts` per scenario composing the base scenario's script.
- **Every Return scenario plays as its setup card says**: Curtain Call with six act 2 versions and 52014 attached to Royal Emissary counting its warnings, Theatre Lounge and Prop Shop in the doorway pools; The Last King with Better Never Than Late (52022) as agenda 1, Dianne Devine 52025 in place of the base Dianne, eight Sickening Reality cards beneath the reference card, Shocking Display set aside; Echoes with a Basement floor (52029 Quiet Halls, 52030–52032) and Keeper of the Oath spawning on act advance; The Unspeakable Oath with act 2 as 52035 (v. III) if Conviction ≥ Doubt else 52036 (v. IV), Host of Insanity and Radical Treatment set aside; A Phantom of Truth with each of six locations the base or the new version at random and Figure in the Shadows shuffled in after The Organist enters play; The Pallid Mask with four new Catacombs in the pool, four removed unseen, MitPM not a Humanoid for Corpse Dweller and held in the Tomb during act 2; Black Stars Rise with the original or the new Cloister and Knight's Hall pile; Dim Carcosa with Hastur's Domain (52060) in place of the Palace, three set-aside locations entering by Hastur's version, and Hastur's health floor of 2 per investigator until the secret is known.
- **Each Return scenario's token table is its base scenario's**, the reference card being the base scenario card; the setup card is listed in `setupCards` and counts as real with no token lines (as `campaign-return-to-the-dunwich-legacy` defines).
- **Every rtptc encounter card works**: the 69 cards of the 5 replacement sets (Delusory Evils 52065, Decaying Reality 52066–52068, Hastur's Envoys 52069–52070, Maddening Delusions 52071–52075, Neurotic Fear 52076–52078) and the 8 Return scenario sets (52014–52064 with their b sides), in `content/packs/return/cards.json` or `content/packs/return/scripts/<code>.ts`; the story assets Dianne Devine 52025 and Party Guest 52026 included.
- **Flow**: the base campaign's hand-kept `flow.json` with the Return-to ids and the six-way mid-game token record; the Return-to achievements are not modelled.
- **The base campaign can use the replacement sets.** Starting The Path to Carcosa offers the option to use the box's five replacement sets, through `CampaignDef.options` with `replaceSets` as `campaign-return-to-the-dunwich-legacy` defines it (its design decision 6, spec requirement "Replacement encounter sets as a base-campaign option", task group 10); this change only declares the option on the base campaign.
- Coverage: `return-to-the-path-to-carcosa` and its 8 scenarios complete; `docs/campaign-program.md` rtptc row at 0 encounter cards left.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: Return to The Path to Carcosa playable to every resolution, each scenario the base plus the box's setup; The Path to Carcosa offers the replacement-sets option at creation.
- `card-content`: every rtptc encounter card declared; the vocabulary it adds (a per-turn record of action kinds, a "hidden cards in hand" condition, parley that evades without a test, a trigger after any parley, an enemy whose prey is the lowest remaining sanity only, a clue-discovery trigger with its count).
- `content-coverage`: the campaign and its scenarios complete with the setup cards counted through `setupCards`.

## Impact

- `content/campaigns/return-to-the-path-to-carcosa/` (moved: `campaign.json`, `flow.json`, 8 scenario files, 8 scripts), the generated folder removed, `scripts/import-campaigns.ts` skips it; `content/campaigns/the-path-to-carcosa/campaign.json` (the option) and its `scripts/*.ts` export their hooks for composition.
- `content/packs/return/cards.json` (69 cards), `content/packs/return/scripts/<code>.ts` (about 40), `content/i18n/{en,ru}/ui.json` labels; `content/coverage.json`, `docs/campaign-program.md`.
- Depends on `campaign-the-path-to-carcosa` (scripts, token tables, vocabulary), `campaign-return-to-the-dunwich-legacy` (`setupCards`, `compose()`, `CampaignDef.options`), `engine-generic-keywords` (Hidden), `engine-scenario-structure` (two agenda decks, flips, cards beneath), `engine-location-instances-grid` (the catacombs), `scenario-import-fixes` (Return-to log keys).

## Decided (assumed)

- A Return scenario's script imports the base script and composes its hooks (setup after the base's, objectives before); it never copies the base. Its scenario file names the base card as `card` and the setup card in `setupCards`; the token table is copied from the base file so the file is complete on its own (ADR-0013).
- The replacement sets are always in Return to The Path to Carcosa; the base campaign gets them as an option, off by default, fixed at creation.
- Return to The Unspeakable Oath's act 2 replaces the base choice entirely: 52035 or 52036 by `logCompare` Conviction ≥ Doubt, the base 03164/03165 removed (setup card 52034).
- The 16 Return-to achievements of the bookmark are text the players track; no engine concept.

## Decided (user)

- **The base campaign offers the replacement sets as an option.** The bookmark (`inspired/AHC_CYOA-main/Return To Bookmarks/Return To Bookmarks - For Reading.pdf`, p.3) lists the swaps:

  | Replacement set | Replaces |
  | --- | --- |
  | Delusory Evils | Ancient Evils |
  | Neurotic Fear | Striking Fear |
  | Hastur's Envoys | Agents of Hastur |
  | Decaying Reality | Decay and Filth |
  | Maddening Delusions | Delusions |

  The option is chosen at campaign creation, defaults to off, and can't be changed during the campaign. Return to The Path to Carcosa always uses the replacement sets.
