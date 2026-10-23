## Context

- Icons today: `src/ui/icons.ts` maps a name to a source (`{glyph, color, under?}` from a font, `{png}`, or `{token}`); `Icon.tsx` draws font glyph layers or an `<img>`; `ChaosToken.tsx` stacks three glyphs of the `tokens` font in the official colours; `glyphs.ts` resolves glyph names through `glyphs.generated.json`, built by `scripts/extract-assets.sh` from ArkhamCards' IcoMoon configs. Card text markup (`[willpower]`…) goes through `formatText` in `Hud.tsx` to `Icon` or a text fallback. `TokenPile` picks the ×3/×5 PNGs by count.
- `inspired/svg-icons` (2,063 files, gitignored) is the vector source: each file one `<path>` on a 1024 box. The 108 names of `arkhamicons-config.json` all exist there; the other four configs' names do too (checked for `arkhamicons`; the import script verifies the rest and fails on a miss).
- Content names encounter sets (`encounterSets` on scenarios, `encounterSet` on cards) and scenarios by ids that match icon names (`striking_fear`, `the_gathering`).
- In-force ADRs: 0001 (audio provenance), 0002 (presentation clock). Neither constrains this; 0001's habit (assets record their source) is followed.

## Goals / Non-Goals

**Goals:**

- One drawing path for every icon; names unchanged for callers (`IconName`, markup keys).
- No flash of blank icons; sharp at any size; recolourable per layer.
- Future packs get their set and scenario icons without code.

**Non-Goals:**

- Redrawing the cardboard tokens; icons in the campaign log and menu (later changes); animated icons.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container, the import script a build-time tool)

Assumptions: lightweight rigor; `inspired/` never ships.

```
BUILD TIME                                        RUN TIME (browser app)
+-----------------------+   icons.json            +--------------------------------------------+
| inspired/svg-icons    |   (manifest: id ->      | main.tsx: fetch sprite.svg once, inject as |
| 2,063 single-path svg |    file, set)           |   hidden <svg> before the first screen     |
+----------+------------+        |                +------------------+-------------------------+
           |                     v                                   | <use href="#id"> (same document)
           |   +------------------------------+                      v
           +-->| scripts/import-icons.ts      |   +---------------------------------------------+
               | union of font configs' names |   | Icon.tsx: stacked <use> per layer, colour   |
               | + manifest extras + content  |   |   per layer; <img> for the 5 PNGs; text     |
               | sets/scenarios -> strip to   |   |   badge fallback                            |
               | <path>, write sprite.svg,    |   | ChaosToken.tsx: fill/overlay/highlight uses |
               | write icons.json entries     |   | TokenPile: icon + count badge               |
               +---------------+--------------+   | formatText: markup -> Icon or fallback      |
                               |                  | Feed / Ribbon / Panels / Modals: set,       |
                               v                  |   scenario, action symbols by name          |
               public/icons/sprite.svg            +---------------------------------------------+
               public/icons/{damage,horror,doom,lead,connector-*}.png
                               ^
               check:content --+-- every set / scenario in content has a symbol; manifest == sprite
```

## Decisions

### 1. Sprite injected into the document, not referenced across documents

`<use href="other-file.svg#id">` is same-origin only and has had Safari quirks; fetching `sprite.svg` once (cached by the browser) and inserting it as a hidden `<svg>` makes every `<use href="#id">` same-document, works everywhere, and lets the app wait for it before showing the table (no flash). Alternative: generated React components; rejected because 450 path strings would live in the JS bundle and re-render. Alternative: `<img src=".svg">`; rejected because it can't be recoloured or layered.

### 2. What the sprite contains

The union of the five IcoMoon configs' glyph names (what the fonts shipped: ~465, including every encounter set and scenario they know), plus the names `icons.ts`, `MARKUP_ICONS`/`GLYPH_NAMES` and `ChaosToken` reference, plus every set and scenario id in content, plus manual extras in the manifest. The script fails when a referenced name has no file. Size: ~450 symbols, about 700 KB raw, ~150 KB over the wire; fetched once. Alternative: referenced-only (~150) — rejected by the user for future campaigns; whole folder — rejected, 1,300 of the files are unrelated UI icons.

### 3. Layers by naming convention

Layered icons keep the fonts' naming: `skill_willpower` under `skill_willpower_inverted`, `token_skull_fill` / `_overlay` / `_highlight`, `health` over `health_inverted`. `icons.ts` keeps its `{glyph, color, under}` shape; only the renderer changes (a `<use>` per layer with `fill` set). `ChaosToken` keeps its layer tables.

### 4. Stacks become badges

`TokenPile` draws the single icon with the existing count badge for every count; the ×3/×5 PNGs are deleted and their `IconName`s removed. The five remaining PNGs keep the `{png}` source and `<img>` path.

### 5. Placements by name, not by new data

The encounter-set icon for a Journal entry is `game.cards[card].encounterSet` (already on the card); the ribbon's scenario icon is `game.scenarioId`; ability symbols come from the ability's `cost` kind (action / reaction / free) that `stripAction` already reads to label the button. Missing symbol → no icon, never a broken box.

### 6. Fonts removed outright

`glyphs.ts`, `glyphs.generated.json`, the five TTFs and their `@font-face` rules go; `extract-assets.sh` keeps only the PNG part. The text badge (`icon-fallback`) remains the fallback for unknown markup.

### 7. Provenance

`content/icons/icons.json` is written by the script: every symbol with its source file name and the set it belongs to (`arkhamicons`, `tokens`, `blood`, `standalone`, `arkhamslim`, or `extra`), and a top-level `source` naming ArkhamCards' icon repository. `check:content` compares the manifest with the sprite's symbol ids and with content's sets and scenarios. README credits the set as fan-drawn FFG symbols from ArkhamCards.

## Risks / Trade-offs

- [Sprite size on a phone's first load] -> one 150 KB request, cached; if it ever matters, split into core + encounter sprites with the same injection.
- [A set name in a future pack that the icon set spells differently] -> `check:content` fails at import time with the name, and the manifest's `extra` map can alias it.
- [Fonts rendered glyphs with font hinting; SVG paths look slightly heavier at 12 px] -> compare the markup icons at text size in the card modal before removing the fonts; adjust `.svg-icon` inline size (0.95 em) if needed.
- [Injecting ~450 symbols into the DOM] -> hidden `<svg>` symbols are not laid out; measured cost is parsing once; verified in the perf script.
- [`drive-*` scripts counting `.glyph-icon`] -> class renamed to `.svg-icon`; scripts updated.

## Migration Plan

Additive assets plus removals in one change. Rollback: restore the fonts, `glyphs.ts` and the PNGs from git; `icons.ts` sources are unchanged in shape.

## Open Questions

- Whether the chaos bag in the top-right keeps the drawn PNG (it has depth the flat symbol lacks) or takes the sprite's `chaos_bag`. Default: the sprite, per "replace where possible"; revisit if it looks flat next to the photographic tokens.
