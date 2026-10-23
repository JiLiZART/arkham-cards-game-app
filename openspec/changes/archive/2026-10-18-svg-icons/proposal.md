## Why

The game draws its icons from five IcoMoon fonts plus fifteen PNG tokens. Fonts flash blank until they load, can't be layered in more than one colour without stacking glyphs, and cover only what was packed into them years ago; the PNGs are raster and come in fixed stacks (×3, ×5). `inspired/svg-icons` holds the vector sources of those same fonts and far more: every encounter set and scenario icon, actions, card types, numbers, XP and trauma. One sprite built from it replaces the fonts and most of the PNGs with sharp, recolourable art and gives the Journal, the ribbon and card text icons they lack.

## What Changes

- **An icon sprite instead of fonts.** `scripts/import-icons.ts` reads `inspired/svg-icons`, strips each file to its path, and writes one `public/icons/sprite.svg` with a `<symbol>` per icon. The sprite holds every glyph the five fonts had (the union of ArkhamCards' IcoMoon configs, which is also every encounter-set and scenario icon known to the fonts, for the campaigns to come) plus the icons this change adds. `Icon` and `ChaosToken` draw stacked `<use>` layers coloured per layer; the five icon TTFs, their `@font-face` rules and `glyphs.ts` go.
- **PNGs replaced where the set has the symbol.** `resource`, `clue`, the chaos bag, health and sanity become sprite symbols; the stacked `resource-3`, `resource-5`, `clue-3`, `doom-3`, `damage-3`, `horror-3` go, stacks become the single icon with a count badge. `damage`, `horror`, `doom`, `lead` and the two connector plaques stay PNG: the set has no cardboard-token art for them.
- **New icons on screen**: `[unique]`, `[weakness]`, `[per_investigator]`, `[action]`, `[reaction]`, `[free]` in card text from the sprite instead of text badges; action, reaction and free symbols on ability buttons in the strip and the card modal; the encounter set's icon on Journal entries that draw an encounter card and as the encounter deck pile's badge; the scenario's icon in the ribbon next to its name.
- **Provenance.** `content/icons/icons.json` lists every symbol the sprite ships with its source (ArkhamCards' icon set) and the README credits it. Not CC0 and not claimed to be: fan-drawn FFG symbols, the same ones the fonts already shipped.
- `check:content` fails when a loaded encounter set or scenario has no icon in the sprite.

Out of scope: placing icons in the campaign log and the menu (the new-game-flow and player-bar changes redesign those screens), new art for the five cardboard tokens, any change to the table background.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `game-iconography`: icons come from a generated SVG sprite instead of the icon fonts; fewer PNGs; rules-text markup and new placements (encounter sets, scenarios, ability symbols); provenance.

## Impact

- New `scripts/import-icons.ts`, `content/icons/icons.json`, `public/icons/sprite.svg`; `src/ui/Icon.tsx` and `src/ui/ChaosToken.tsx` draw from the sprite; `src/ui/icons.ts` (sources become sprite layers), `src/ui/glyphs.ts` and `glyphs.generated.json` removed; `src/ui/hud/Hud.tsx` `formatText` markup; `styles.css` (`@font-face` rules out, `.glyph-icon` becomes `.svg-icon`); `src/ui/TokenPile.tsx` (count badge instead of ×3/×5 art); `Feed.tsx`/`feed.ts` (encounter-set icon part), `Ribbon.tsx` (scenario icon), `Panels.tsx` (pile badge, ability buttons), `Modals.tsx` (ability buttons); `scripts/check-content.ts` (icon presence for sets and scenarios); `public/fonts/` loses five TTFs; `scripts/extract-assets.sh` keeps only the five PNGs.
- Tests: `icons.test.ts` (sources resolve to symbols that exist in the sprite), a sprite-generation test for the import script's path extraction and layer naming, `formatText.test.ts` markup cases.
- Browser scripts unaffected except where they count `.glyph-icon`.
