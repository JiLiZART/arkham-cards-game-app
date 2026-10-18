## Why

The card data and Russian text of every cycle are in the game, but only Night of the Zealot can be played: every other campaign has no scenario definitions. ArkhamCards' campaign guides, already vendored in `inspired/ArkhamCards`, describe every official campaign in a structured form (encounter sets, location layouts, chaos bags per difficulty, resolutions, campaign log entries) in English and Russian, so the campaigns can be generated rather than written by hand.

## What Changes

- A new import command builds a campaign and its scenarios for every official campaign in ArkhamCards' guides whose cards are in the snapshot: The Dunwich Legacy, The Path to Carcosa, The Forgotten Age, The Circle Undone, The Dream-Eaters (both halves), The Innsmouth Conspiracy, Edge of the Earth, The Scarlet Keys, The Feast of Hemlock Vale, The Drowned City, the Return-to boxes, Children of Blood, the standalone scenarios and the side scenarios whose encounter sets exist. Fan-made campaigns are left out. Night of the Zealot stays hand-written.
- Generated campaigns are marked as such and the new-game screen says that their cards' rules are only partly implemented: a card without written behaviour shows its text but has no effect.
- A campaign names the card packs it needs; starting or restoring one loads them first.
- The engine ends a scenario when its last act or last agenda advances and no script did: the resolution its back names ("→R1"), else the first resolution for an act and no resolution for an agenda.
- Russian campaign text (names, intros, resolutions, log labels) for the new campaigns comes from ArkhamCards' Russian guides through the existing text import.
- A keyword glossary in the card details explains the keywords a card shows (Hunter, Retaliate, Alert, Patrol, Concealed…) in English and Russian, worded after the rules reference (`inspired/rulebook-web`, `inspired/Arkham_Horror_LCG/документы/Rules_Reference.pdf`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: every official campaign can be chosen and played, generated ones marked as partly implemented; their packs load on start and restore.
- `card-content`: scenario and campaign definitions imported from the campaign guides.
- `game-engine`: a scenario ends when its last act or agenda advances unscripted.
- `game-table-ui`: keyword glossary in the card details.

## Impact

- New `scripts/import-campaigns.ts` and `content/campaigns/<id>/` folders (generated JSON); `src/content/schema.ts` (`CampaignDef.packs`, `CampaignDef.generated`); `src/content/loader.ts` (references of campaigns whose packs are not loaded are checked by `check:content`, not in the browser); `src/ui/store.ts` (packs loaded before a campaign starts or restores); `src/engine/rules/scenario.ts` (final act/agenda); the new-game screen; the details column.
- `ENGINE_VERSION` bump: saved scenarios restart, campaign logs are kept.
