## Why

Return to The Dunwich Legacy replays the 8 Dunwich scenarios with the box's setup cards, 6 replacement encounter sets and new acts, agendas, locations and enemies: 285 cards used, 8 working, no real tokens, no script (report `dwl.md`, sections 1 and 4.9). Its generated files are wrong where the Return-to rules differ from the base: Return to Essex still lists the base agenda 02160 and no 51026/51027, Return to Lost in Time and Space holds only the two replacement cards as its whole act and agenda decks, and no Return-to setup (random Warren Observatory, the Exhibit changes, three copies per Dunwich location, the Brood variants, Realms Beyond) is modelled. Once `campaign-the-dunwich-legacy` lands, each Return scenario is its base scenario's script and token table plus the box's differences.

## What Changes

- **The campaign becomes hand-written**: `content/campaigns-generated/return-to-the-dunwich-legacy/` moves to `content/campaigns/return-to-the-dunwich-legacy/` (`generated: false`), with `scripts/return-to-<scenario>.ts` per scenario that extend the base scenario's script.
- **Every Return scenario plays as its setup card says** (51012, 51015, 51020, 51025, 51032, 51041, 51047, 51053): the base setup, then the Return-to steps (Orne Library or Warren Observatory at random; the Enthralled Security Guard at Administration if Return to The House Always Wins was completed; Clover Club Stage set aside and one Lounge at random, Erratic Fear set aside in place of Striking Fear; two extra Exhibit Halls with the Restricted Hall set aside and two removed; 10 train cars and 4 engines in the random pools with the Engineer set aside; three copies per Dunwich location with two removals and no Naomi's Crew beneath; the four Brood variants replacing the base Brood; Warped Base and Ascending Path with the new paths; Realms Beyond in play with Yog-Sothoth spawned there) and the full act and agenda decks with their Return-to versions (Return to Essex: 51026 agenda 0, 51027 agenda 1 v.II then 02161–02164; Return to Lost in Time and Space: 02312, 02313, 51054, 02315 and 02316, then 02317 or 51055 by `ritual_completed`, 02318, 02319).
- **Each Return scenario's token table is its base scenario's**, the reference card being the base scenario card; the setup card is listed in `setupCards` and is real with no token lines, as `scenario-import-fixes` defines (ADR-0038).
- **Every rtdwl encounter card works**: the 60 cards of the Return-to sets (14 in the 6 replacement sets Beyond the Threshold, Resurgent Evils, Secret Doors, Erratic Fear, Creeping Cold, Yog-Sothoth's Emissaries; 46 in the 8 scenario sets), in `content/packs/return/cards.json` or `content/packs/return/scripts/<code>.ts`, including the story assets 51031 Engineer and 51052 Naomi O'Bannion.
- **Flow**: the base campaign's hand-fixed `flow.json` with the Return-to log keys in camelCase as `scenario-import-fixes` writes them, and Return to Where Doom Awaits' Naomi offered in place of the intro clue if `naomi_has_back`.
- **The base campaign can use the replacement sets.** Starting The Dunwich Legacy offers an option to use the box's 6 replacement encounter sets. With it on, every base scenario gathers each replacement set in place of the set it replaces, as the Return-to bookmark lists them. The mechanism (`CampaignDef.options` with `replaceSets` and `addSets`, the state, the toggles, the swap at setup) is `scenario-import-fixes`'; this change only declares the option on the base campaign.
- Coverage: `return-to-the-dunwich-legacy` and its 8 scenarios complete; `docs/campaign-program.md` rtdwl row at 0 encounter cards left.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: Return to The Dunwich Legacy playable to every resolution, each scenario the base plus the box's setup. The base campaign offers the replacement-sets option at creation.
- `card-content`: every rtdwl encounter card declared; the vocabulary it adds (an attachment that follows an enemy in and out of play, a double test or defeat, an act that ignores a location's objectives, a Return-to "next agenda's Forced is active while resolving the back").
- `content-coverage`: the campaign complete, its setup cards counted through `setupCards`.

## Impact

- `content/campaigns/return-to-the-dunwich-legacy/` (moved: `campaign.json`, `flow.json`, 8 scenario files, 8 scripts), the generated folder removed, `scripts/import-campaigns.ts` skips it.
- `content/packs/return/cards.json` (60 cards), `content/packs/return/scripts/<code>.ts` (about 30), `content/i18n/{en,ru}/ui.json` labels; `content/campaigns/the-dunwich-legacy/scripts/*.ts` export their hooks for composition.
- `content/coverage.json`, `docs/campaign-program.md`.
- Depends on `campaign-the-dunwich-legacy` (scripts, token tables, vocabulary), `engine-scenario-structure`, `scenario-import-fixes` (`setupCards`, `compose()`, `CampaignDef.options`, the camelCase log keys), `engine-script-registry`.

## Decided (assumed)

- A Return scenario's script imports the base script and composes its hooks (setup after the base's, objectives before); it never copies the base. Its scenario file names the base card as `card` and the setup card in `setupCards`.
- The replacement sets are always in Return to The Dunwich Legacy. The base campaign gets them as an option instead (see "Decided (user)").
- Three copies of each Dunwich location in Return to Blood on the Altar: the Return-to copies 51034–51039 join the base pairs in the random pools.

## Decided (user)

- **51020's agenda rule, confirmed.** While agenda 1b or 2b resolves, the Forced ability of the next agenda in the deck counts as active. Without the rule, the Hunting Horror and Shadow-spawned miss their escalation when the agenda advances. The Return scenario script sets a scenario flag while an agenda back resolves, and the agenda scripts 02119–02121 read it.

- **The base campaign offers the replacement sets as an option.** The bookmark (`inspired/AHC_CYOA-main/Return To Bookmarks/Return To Bookmarks - For Reading.pdf`) lists the swaps:

  | Replacement set | Replaces |
  | --- | --- |
  | Beyond the Threshold | The Beyond |
  | Resurgent Evils | Ancient Evils |
  | Erratic Fear | Striking Fear |
  | Creeping Cold | Chilling Cold |
  | Secret Doors | Locked Doors |
  | Yog-Sothoth's Emissaries | Agents of Yog-Sothoth |

  The option is chosen at campaign creation, defaults to off, and can't be changed during the campaign. Return to The Dunwich Legacy always uses the replacement sets.
