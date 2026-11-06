## Why

Children of Blood (pack `cob`: 111 encounter cards, 8 player cards, three scenarios with a prologue, an interlude and an epilogue) is in the content and on the new-game screen, but nothing in it works: `content/packs/cob/cards.json` is `{}`, no scenario has a script, the token tables are `{}` on every difficulty, and the `blood` chaos token the whole box turns on is not a `ChaosToken`, so the campaign import dropped every "add/remove a blood token" to text. Coverage reports 6 of 119 campaign cards working (the shared `core_2026` sets) and `docs/campaign-program.md` lists its three scenario rows undone. Of the three campaign boxes in this program slice it is the lowest-risk once the generic mechanics exist: classic act/agenda scenarios, shared sets that already work, and one new token.

## What Changes

- **The `blood` chaos token.** `CHAOS_TOKENS` gains `blood`; the campaign flow and scenario setups add and remove it (`addChaosToken`/`removeChaosToken` instead of text), the bag shows it with `inspired/svg-icons/blood.svg` through the icon sprite, and its revealed effect is a per-scenario `tokens.<difficulty>.blood` entry like the other symbols. Its printed default effect comes from the CoB rules insert (Open questions).
- **Vocabulary the box needs and no other change owns:** `attachToEnemy` (Unnatural Strength 13098, Sanguine Rebirth 13092; Fortune and Folly reuses it), a constant modifier that makes an action cost 1 more (Frenzied Hunger 13094; FoF's House Dealer reuses it), `prey: "mostSealed"` on the seal model `engine-bless-curse` delivers (13091, 13097, 13103, 13109, 13117), a constant that gives every card of a trait victory 0 (Blood Money agendas 13069–13071), token X sources `agendaStage` and `sealedOnYou` (River of Blood and Blood Money skulls).
- **Three scenario scripts** in `content/campaigns/children-of-blood/scripts/`: `river-of-blood.ts`, `new-horizons.ts`, `blood-money.ts`, with the campaign moved from `content/campaigns-generated/` to `content/campaigns/` (program step 7; this change finishes the box).
- **Setups corrected** against the guide: Dawn or Dusk location copies and Julia Stern's copy by difficulty, Garrison Street in play, the Waterfront Civilian and set-aside Infected cards; New Horizons' Day (v.I) or Night (v.II) version chosen by the players; Blood Money's agenda 13070 or 13071 by the log, the guest spawns by player count, Howard Wilkes and Julia Stern by difficulty, the Balcony by difficulty, the Master Bedroom set aside; the permanent cultist token added in New Horizons and Blood Money.
- **Token tables real on all four difficulties** for 13001, 13031 and 13068, from the reference cards.
- **Location connections** for all three scenarios transcribed from card scans (no guide PDF exists), including the conditional Unvisited Isle–River Docks link.
- **Campaign flow:** a per-investigator counter input with a group total (the "spend 2 XP per investigator to remove a blood token" prompts, 6 steps), a chaos-bag count condition (_Friends in Low Places_' "exactly 12 blood tokens"), the "how many sealed blood tokens did you end with" questions computed from the scenario's end state, the repeatable "Adjust blood tokens" branch, and blood-token effects as bag operations.
- **The 8 player cards:** Detective Reynolds 13029, Fang of Zburamoarte 13030, Sanguine Song 13066, Forged Permit 13067, Chosen of Zburamoarte 13093a/b, Charlie Kane 13105, The Blood Blight 13118, plus the story-asset lines the resolutions earn.
- **Locales:** English, and Spanish when `i18n-all-locales` ships `es` (the only locale with translated CoB cards and guide). No Russian: the ArkhamCards guide and the card snapshot have no Russian CoB text, and machine translation is out (user decision).
- `ENGINE_VERSION` bump: saved scenarios restart, campaign logs kept.

Depends on: `engine-generic-keywords` (Patrol, Predator), `engine-bless-curse` (seal/release and tokens sealed on cards), `engine-scenario-structure` (several cards beneath a location, cards beneath the reference card, "would be defeated" replacements, double-sided assets, trait spawn, conditional token modifiers), `scenario-import-fixes` (`blood` as a token in the importer; difficulty- and variant-dependent encounter sets), `campaign-flow-compiler-fixes`, `i18n-all-locales` (`es`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: River of Blood, New Horizons and Blood Money set up as the guide says on every difficulty, resolve their reference cards' token lines, and end in their printed resolutions; the New Horizons version is the players' choice.
- `game-engine`: the `blood` chaos token; prey by most sealed tokens; victory 0 by trait; a treachery attached to an enemy; an action-cost tax; the `agendaStage` and `sealedOnYou` X sources.
- `card-content`: the `cob` pack's cards declared in `cards.json` or scripted; the vocabulary above in the schema.
- `campaign-flow`: a per-investigator counter input with a group total; a chaos-bag count condition; blood tokens as bag effects; sealed-token questions answered from the game.

## Impact

- `src/content/schema.ts` (`CHAOS_TOKENS`, `TokenEffect.x`, `attachToEnemy`, `actionTax`, `victoryByTrait`, `prey`, flow input and condition), `src/engine/rules/tokens.ts` (X sources), `src/engine/rules/enemies.ts` (prey), `src/engine/effects/placement.ts` (attach), `src/engine/rules/round.ts` (action cost), `src/engine/campaign/campaign.ts` (victory by trait), `src/engine/campaign/flow.ts` (counter input, bag count), `scripts/campaignFlow.ts` (compiling `investigator_counter` and the chaos-bag `math`), `src/content/implemented.ts` (Patrol/Predator lines once the keyword change lands).
- `content/campaigns/children-of-blood/` (campaign, three scenarios, flow, three scripts), `content/packs/cob/cards.json` (111 + 8 cards), `content/i18n/{en,es}/` (ability labels, prompts, campaign texts), `public/icons/sprite-campaigns.svg` (blood token glyph).
- `content/coverage.json` regenerated; `docs/campaign-program.md`: the `cob` row and its three scenario rows ticked.
- Saves: `ENGINE_VERSION` bump.

## Decided (assumed)

The user was not available; these were settled against the report and the code and can be reopened.

- **Day or Night in New Horizons** is a flow `input` before the scenario (recorded in the log as `new_horizons_version`); the scenario setup reads it through `when` conditions, as log-dependent setups already do. A prompt inside the scenario would need a second setup pass over encounter sets.
- **The blood token's effect lives in the scenario files** (`tokens.<difficulty>.blood`), not in the engine: the engine knows the token, the scenario says what it does, Chosen of Zburamoarte's script replaces it. The insert's wording decides the entry (Open questions).
- **Sealed-count questions** (`ask_3_blood_tokens`, `ask_2_blood_tokens`) are not asked: the scenario's end state knows each investigator's sealed blood tokens and the resolution records them.
- **The XP-spend prompts** become one input kind (`investigatorCounter` with `total`) rather than six hand-written branches; the solo branch the compiler already emits stays.
- **No Russian.** English and Spanish only, Spanish gated on `i18n-all-locales`.
- **Connections** are transcribed from scans as tasks, one per pair (user decision), the conditional Unvisited Isle–River Docks link scripted.

## Open questions

- The CoB rules insert (the blood token's printed effect when revealed, the exact Predator text) is not under `inspired/`; the `$blood_tokens_rule` and `$predator_rule` steps in the ArkhamCards guide are references whose text the local dump lacks. The token entry and the Predator keyword (in `engine-generic-keywords`) need it before they are final.
- Whether `engine-scenario-structure`'s "cards beneath cards" allows several facedown cards beneath one location (River of Blood's Lairs) or one; if one, this change widens `beneath` to a pile per location.
- Whether `i18n-all-locales` adds `es`; if not, CoB ships in English alone.
