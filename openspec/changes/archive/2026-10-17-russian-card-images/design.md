## Context

- **Inputs:**
  - `inspired/CARDS_ru`: about 1,600 JPEGs at 756×1063, about 1.8 GB. Root files are player cards; subfolders hold locations by cycle (`Локации/База`, …), weaknesses, enemies, treacheries, backs (`Рубашки`) and promos. File names are community Russian names, with optional suffixes: ` 2`, ` 3`, ` (1)`, ` - <subtitle>`, `(база)`, `(измен)`.
  - `inspired/PDF_ru`: 11 print PDFs. `pdfimages -list` shows one embedded image per card: 756×1063 portrait, 1063×756 landscape (acts/agendas), 484×744 investigator portraits.
- **Current content:** 183 card definitions (core + Night of the Zealot), about 230 images counting double-sided backs. A naive name match finds 89 of 183 in `CARDS_ru`. The misses are acts, agendas, scenario cards, investigators and translation differences ("Лупа" vs "Увеличительное стекло").
- **Images:** `cardImage(card, side)` returns `<base>cards/<code>.webp` (the dev proxy or Pages files). `CardFace` and `useCardTexture` call it; the texture cache is keyed by URL. Translations load from `i18n/<locale>/{cards,ui,campaigns}(.generated)?.json`, generated first, then hand-written merged field by field.
- **Tools on this machine:** `tesseract` 5 (only `eng`, `osd`, `snum`), `pdfimages`/`pdftoppm`, ImageMagick 7, `cwebp`.

## Goals / Non-Goals

**Goals:**

- A reproducible import that turns `inspired/` into committed outputs: a manifest, WebP files and print texts.
- Human review only where the machine is unsure.
- One code path for images in every locale.

**Non-Goals:**

- Importing cards that aren't in the content yet. Their matches stay in the manifest for later campaigns, with no WebP output.
- Russian card backs: the generic backs stay; the `Рубашки` art could replace them later.
- OCR at runtime.
- English text changes.

## Decisions

### 1. Import script, staged and cached

`scripts/import-ru-cards.ts` (run with `npm run import:ru-cards`, `tsx`) works in a cache dir, `.cache/ru-import/`, in stages that each skip work already done:

1. **Extract:** `pdfimages -j` (or `-png`) for each PDF into `.cache/ru-import/pdf/<pdf>/…`. Images smaller than 600 px on the long side are portraits and are skipped.
2. **OCR:** for each image (`CARDS_ru` and PDF), run Tesseract `rus+eng` on:
   - a title crop (the top 12% of a portrait, the top-left band of a landscape card);
   - a body crop (the bottom 45%).

   Both are cached as JSON per file hash. The `rus.traineddata` (tessdata_best) is downloaded once into `.cache/tessdata`, and `TESSDATA_PREFIX` points there.

3. **Match:** score each image against every content card, using:
   - a name similarity: normalized trigram similarity of the OCR title against the official and English names, plus the file-name stem for `CARDS_ru`;
   - a body similarity: trigram similarity of the OCR body against the official Russian text, and the back text for the other side;
   - constraints from the English data, as penalties: portrait vs landscape matches the card type (act/agenda are landscape); locations get two sides, the side being the one whose text matches `text` or `backText`; a level printed as pips is checked with a simple pip count when `xp > 0`.

   The best score above a threshold, with a margin over the second best, is accepted. Otherwise the image is "uncertain".

4. **Choose:** for each code and side, take the best accepted `CARDS_ru` image, else the best accepted PDF image.
5. **Review:** `content/i18n/ru/images.overrides.json` holds `{ "<code>[b]": "<relative source path>" | null }`, which pins or rejects a match and is applied after step 4. The script writes `.cache/ru-import/review.html`, a contact sheet of each uncertain or low-margin pick next to the English scan (from `.cache/cards`), with the candidate list.
6. **Output:**
   - `content/i18n/ru/images.json`: `{ code: { front?: {src, score}, back?: {src, score} } }` for every matched card, including ones outside the content;
   - for content cards, `public/cards-ru/<code>.webp` and `<code>b.webp`, made with `magick -resize 50% -strip` then `cwebp -q 82`. Landscape cards stay landscape, as the English scans are.

_Alternative:_ match by file name plus a hand-made table. Rejected: ~1,600 files, a different translation and ambiguous suffixes; OCR plus review is less work and repeatable.

### 2. Print texts

For each content card with a Russian image, the OCR'd title gives `name`, and `subname` when one is printed. The OCR'd traits line and rules text are cleaned:

- icons that Tesseract reads as junk are mapped back to markup (`[action]`, `[reaction]`, `[fast]`, `[willpower]`, `[intellect]`, `[combat]`, `[agility]`, `[wild]`, `[skull]`, `[cultist]`, `[tablet]`, `[elder_thing]`, `[elder_sign]`, `[auto_fail]`, `[per_investigator]`);
- the icon positions come from the official text's markup: the same number and order of icons is expected, so the cleaned text reuses the official icon tokens in order.

The draft goes to `.cache/ru-import/print-drafts.json`. Reviewed entries are copied to `content/i18n/ru/cards.print.json`, one card at a time, with any fixes, while viewing the image. That review is part of the apply. Only reviewed cards are in the file.

`loader.ts` merges `cards.generated.json` → `cards.print.json` → `cards.json`, extending the existing regexp with an optional `.print`. A content check verifies that every `cards.print.json` code exists and that its markup tokens are valid.

### 3. Locale-aware `cardImage`

`cardImage(card, side, locale = "en")`: for `ru`, when the card's side is in a generated `RU_IMAGES` set, it returns `asset("cards-ru/<code>[b].webp")`; otherwise it returns the current URL. The set is built from `content/i18n/ru/images.json`, filtered to files that exist: the import writes `src/ui/ruImages.generated.json`, a list of codes and sides with output files.

Callers pass the locale:

- `CardFace` already has it;
- `useCardTexture` gets it from the store, and its cache key is the URL, so switching locale re-textures naturally;
- `Screens` passes it;
- the fetch script keeps English.

`VITE_CARD_IMAGE_BASE` affects only the English scans.

### 4. Deploy

`public/cards-ru/` is copied into `dist/` by Vite, so the Pages workflow needs no change. The guard test for root paths already covers the new paths, because they use `asset()`.

## Risks / Trade-offs

- [OCR quality on stylized fonts] → The title and body are cropped separately, with the best tessdata. Several signals are matched, not the title alone. Uncertain images go to review, never in silently.
- [Wrong icon mapping in texts] → Icon tokens are taken from the official markup in order. Every printed text is reviewed against the image before it goes into `cards.print.json`. A content check rejects unknown tokens.
- [Repo size] → Only content cards are converted: about 230 × ~40 KB ≈ 10 MB. Later campaigns add their own.
- [PDF scans are official Hobby World art, publicly hosted on Pages] → The user chose this. The README notes the sources. Removing them means pinning those codes to `null` in the overrides and rerunning.
- [Community names differ from rulebooks and FAQs] → This is accepted (the user chose that text follows the cards). Hand-written `cards.json` still wins for any fix.
- [`inspired/` changes later] → The manifest records source paths. Rerunning the import with the same overrides reproduces the outputs; new files only add candidates.
