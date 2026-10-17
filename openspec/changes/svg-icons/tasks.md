## 1. The sprite and its manifest

- [x] 1.1 Add `scripts/import-icons.ts` with `import-icons.test.ts`: collects the symbol set (the union of the five IcoMoon configs' glyph names from `inspired/ArkhamCards/assets`, the names referenced by `src/ui/icons.ts`, `MARKUP_ICONS`, `ChaosToken`'s layer tables, every encounter set and scenario id in content, and the manifest's `extra` aliases), strips each SVG to its path data on the 1024 box, writes `public/icons/sprite.svg` (`<symbol id viewBox>` per icon) and `content/icons/icons.json` (symbol → source file, set, with a top-level source credit), and fails naming any referenced icon with no file. Tests cover the path extraction, a layered name set, and the failure on a missing name.
- [x] 1.2 Run the import; commit the sprite and the manifest. Extend `scripts/check-content.ts`: every encounter set and scenario in content has a symbol; the manifest and the sprite list the same ids. Verify `npm run check:content` passes, and fails when a scenario names `made_up_set`.

## 2. Drawing from the sprite

- [x] 2.1 Load the sprite once in `main.tsx` (fetch, inject as a hidden `<svg>` before the first screen renders; a cached load on later visits) and replace the font renderer in `Icon.tsx` with stacked `<use href="#id">` layers coloured per layer (class `.svg-icon`, the text badge fallback kept for unknown names); `ChaosToken.tsx` draws its fill/overlay/highlight layers the same way. Update `icons.test.ts` so every `ICON_SOURCES` layer and every `ChaosToken` layer names a symbol in the sprite. Verify in the browser: the stat bar's skill icons, the ribbon's pips, a revealed skull and a −3 token all draw from the sprite with no font request in the network log, and nothing is blank on the first frame of a cold load.
- [x] 2.2 Replace the PNGs the sprite covers: `resource`, `clue`, `chaosBag`, `health`/`sanity` already glyphs; delete the ×3/×5 PNGs and their `IconName`s; `TokenPile` draws the single icon with its count badge for every count. Trim `scripts/extract-assets.sh` to the five kept PNGs and re-run it. Verify in the browser: 5 resources show one resource icon with a "5" badge; damage, horror and doom on cards keep their PNG art.
- [ ] 2.3 Remove the fonts: `glyphs.ts`, `glyphs.generated.json`, the five TTFs in `public/fonts`, their `@font-face` rules and `.gl-i`/`.glyph-icon` styles. Verify `npm run build` has no reference to them and the card modal's markup icons still render.

## 3. New icons on screen

- [ ] 3.1 Rules text: `[unique]`, `[weakness]`, `[per_investigator]`, `[action]`, `[reaction]`, `[free]`/`[fast]`, `[bless]`, `[curse]`, `[frost]` map to sprite symbols in `MARKUP_ICONS`; the text badge only for names the sprite lacks. Add cases to `formatText.test.ts`. Verify in the browser on Roland's card modal and a card with `[per_investigator]`.
- [ ] 3.2 Ability buttons: `stripAction` and the card modal's option buttons show the action, reaction or free symbol before the label, from the ability's cost kind. Verify in the browser on the .45 Automatic's fight button and a reaction ability.
- [ ] 3.3 Encounter set and scenario icons: a `set` part in `feed.ts` for entries that draw or reveal an encounter card (the card's `encounterSet`), rendered by `Sentence`; the encounter deck pile's badge (top card's set, else the scenario); the scenario's icon in `Ribbon.tsx` before its name. Add `feed.test.ts` cases. Verify in the browser: the Journal shows the Striking Fear icon before Rotting Remains, the pile and the ribbon show their icons, and a Russian Journal shows the same icons.

## 4. Verification and docs

- [ ] 4.1 Run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with 0 errors (update any `.glyph-icon` selector); `perf-devourer.js` shows no frame-time regression from the injected sprite.
- [ ] 4.2 README: the icon sprite, the import script, the provenance manifest and a credits line for the ArkhamCards icon set; remove the icon-font notes. Run `openspec validate svg-icons --type change --strict`.
