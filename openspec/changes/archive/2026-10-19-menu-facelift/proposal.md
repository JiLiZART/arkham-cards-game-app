## Why

The title screen and menus are plain dark panels, Settings hides behind a gear in the corner, and the new-game campaign list shows each campaign as a small card scan over the first scenario's intro, which for most campaigns is a scenario quote rather than what the campaign is about. The core rulebook (`inspired/ahc100_rulebook-web.pdf`) holds the game's cover painting and its parchment page art, and ArkhamCards' guides hold a prologue for every official campaign in English and Russian.

## What Changes

- An import extracts backgrounds from the rulebook: the cover painting without the logo for the title screen, the parchment page with the vine border for the other menu screens, and the five class parchments for later per-class screens. Outputs are committed WebP files in `public/art/` with a provenance manifest.
- The title screen shows the cover painting, dimmed behind the menu; the wizard, settings, how-to and campaign log screens sit on the parchment.
- Settings becomes a menu item on the title screen, after How to play; the gear goes.
- Campaign tiles show the first scenario's reference card art large as a preview, the campaign name, a description (the campaign prologue in the game's language, an epigraph for most campaigns, then the names of its scenarios, with "More" for a long prologue), the number of scenarios, and the "partly implemented" note for generated campaigns. Side scenarios use their scenario intro.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: menu backgrounds; Settings as a menu item.
- `campaign-play`: campaign tiles with art, description and scenario count.

## Impact

- New `scripts/import-art.ts` and `public/art/` (about 1 MB), `content/art/art.json`; `src/ui/menu/Title.tsx`, `NewGame.tsx`, menu styles.
- `scripts/import-campaigns.ts` and `scripts/import-i18n.ts` gain the campaign prologue (`CampaignDef.prologue`, campaign text `prologue` per locale).
- No engine change.
