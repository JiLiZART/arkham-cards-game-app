## Context

- `scripts/import-cards.ts` fetches ArkhamDB's API (or arkham.build) for one `--pack`, maps raw records with `mapCard` (tested), and writes `content/packs/<pack>/cards.generated.json`; `cards.json` holds hand-written behaviour and is never touched.
- `scripts/import-i18n.ts` writes `content/i18n/<locale>/{cards,ui,campaigns}.generated.json` from ArkhamCards' assets; the loader layers `.generated` → `.print` → hand-written.
- `scripts/import-ru-cards.ts` runs pdfimages → Tesseract → `ruMatch` (name/text/stats) → review overrides → cwebp, over `inspired/CARDS_ru` and `inspired/PDF_ru`, writing `public/cards-ru/<code>[b].webp` and `content/i18n/ru/images.json`; `cardImage()` prefers a Russian image when the manifest has one.
- `src/content/index.ts` bundles every JSON under `content/` eagerly with `import.meta.glob`; `buildContent` validates and cross-references everything at once.
- The snapshot: `pack/<cycle>/<pack>.json` (6,047 cards, same field names as the API), `translations/<locale>/pack/<cycle>/<pack>.json` (name, subname, text, traits, flavor, back_text, back_flavor), `packs.json`, `cycles.json`, `encounters.json`. The PDFs: 61 files named by cycle and pack number.
- Tools present: `tesseract`, `pdfimages`, `cwebp`, `magick`.
- In-force ADRs: 0001–0005; 0003's "content names an icon the sprite lacks" check gains 17 cycles of encounter-set names (the icon set knows them). A durable decision is introduced below.

## Goals / Non-Goals

**Goals:**
- One source for card data and card text: the vendored snapshot; reproducible imports.
- Every cycle present without slowing the first screen.
- The Russian image pipeline unchanged in method, widened in input.

**Non-Goals:**
- Scenario definitions for other campaigns; shipping other locales (available by command); images for cycles without PDFs.

## Diagram (C4-inspired, component level, ASCII; build-time tools on the left, the browser app on the right)

```
BUILD TIME (inspired/ never ships)                   RUN TIME (browser app)
+------------------------------+                     +----------------------------------+
| arkhamdb-json-data           |  import:cards --all | content db                        |
|  pack/<cycle>/*.json ------->|-------------------->|  packs: core + scenario sets      |
|  translations/ru/pack/… ---->| import:i18n --locale|   eager; other cycles lazy        |
|  packs/cycles/encounters.json|   ru                |   (content/packs/<cycle>/)        |
+------------------------------+        |            |  i18n ru: cards.generated (all    |
                                        v            |   cycles) < print < hand-written  |
+------------------------------+  content/packs/<c>/ |  images.json: ru image per code   |
| ArkhamCards assets           |  content/i18n/ru/   +----------------+-----------------+
|  campaign text ------------->|  campaigns.generated                 |
+------------------------------+                                      | cardImage()
+------------------------------+  import:ru-cards                     v
| Arkham_Horror_LCG (61 PDFs)  |----------------->  public/cards-ru/<code>.webp (~6,000)
|  + CARDS_ru                  |  cycle-scoped OCR match, overrides, contact sheet
+------------------------------+
                      check:content: every pack validated, per-cycle coverage report
```

## Decisions

### 1. The vendored snapshot is the card source (ADR-0006)
`import:cards --source arkhamdb-json-data` reads the local files; `mapCard` is reused as is (the snapshot's records are the API's). The API path stays for one-off refreshes. Alternative: fetch every pack from the API; rejected, 114 requests, rate limits, and no reproducibility.

### 2. One pack per cycle
`content/packs/<cycle>/cards.generated.json` concatenates the cycle's pack files; `cards.json` per cycle for overrides (empty until needed). The loader's pack regex already accepts any pack name.

### 3. Lazy packs
`import.meta.glob` with `eager: false` for `content/packs/*/cards.generated.json` except `core`; `buildContent` builds the eager set first and exposes `loadPack(cycle)` that validates and merges a pack on demand; `db.cards` grows, with a `packLoaded` set and a `cardsOf(cycle)` helper. Scenario content references are validated against the eager set plus the packs they name (scenario files list their cycle). `check:content` (Node) loads everything eagerly. Alternative: eager everything; rejected, ~4 MB of JSON on the first screen for cards no scenario uses yet.

### 4. Translations per cycle, layered as today
`import:i18n --locale ru` writes `cards.generated.json` for every cycle from the snapshot (the ArkhamCards card translations are dropped in favour of the snapshot's, which are the same ArkhamDB community strings), and campaign text from ArkhamCards as before. The print layer and the hand layer are untouched.

### 5. PDFs tagged by cycle
A table in `import-ru-cards.ts` maps each PDF's leading number (`02_…` → dwl, `03_…` → ptc, …, `0xR_…` → return) to a cycle; `ruMatch` searches that cycle's cards only (plus core for the investigator-only PDF). Cache keyed per PDF. Everything else in the pipeline stays.

### 6. Images committed
~6,000 WebP at 50 % (about 300 MB) in `public/cards-ru/`; `fetch:cards` and Pages unchanged. Alternative: external storage; rejected by the user for now; a later move is a `BASE` change in `images.ts`.

## Risks / Trade-offs

- [Repository size: +300 MB once, and each regeneration rewrites files] -> the pipeline is reproducible, so regenerations produce identical bytes for unchanged inputs; a Git LFS move is possible later without changing the game.
- [OCR quality on later cycles (more text, more symbols)] -> cycle-scoped matching and the existing confidence gate; low-confidence images wait for review; the contact sheet per cycle.
- [Snapshot drift from ArkhamDB] -> the snapshot's commit is recorded in the README; refreshing is `git pull` in `inspired/` and a re-run.
- [`check:content` time with 6,000 cards] -> validation is linear; measured; the per-cycle report keeps output readable.
- [Encounter-set names from new cycles without an icon] -> `check:content` lists them (svg-icons' rule); the icon set covers the known cycles.

## Migration Plan

Additive content. Rollback: remove the pack folders and the images; the core pack is unchanged in shape.

## Open Questions

- Whether the Return-to PDFs' investigator-only sheets should feed the parallel/promo packs. Default: yes, matched against those cycles.
