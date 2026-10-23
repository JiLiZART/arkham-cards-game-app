## Why

With the Russian interface, every card still shows its English scan, so the text printed on the cards doesn't match the language of the game. Two Russian sources are now available in `inspired/`:

- **`inspired/CARDS_ru`**: about 1,600 community-made Russian card images, free to use. They are 756×1063 JPEGs named by Russian card name, with locations, weaknesses, enemies and treacheries in subfolders.
- **`inspired/PDF_ru`**: print sheets of the Russian edition (core set, The Dunwich Legacy, The Path to Carcosa, promos). Every card is embedded as its own 756×1063 image (acts and agendas 1063×756), so cards can be pulled out without cropping.

## What Changes

- **Russian card images in the Russian locale.** With the Russian interface, a card shows its Russian image:
  - from `CARDS_ru` first;
  - from the PDF scans when `CARDS_ru` lacks the card (acts, agendas, scenario reference cards, investigators and some player cards);
  - otherwise the English scan as now.

  The English interface is unchanged.

- **Identification by OCR.** File names alone can't say which card an image is:
  - a number suffix sometimes means another level ("Физическая тренировка 2" is the level-2 card), sometimes the other side ("Кабинет 2" is the revealed Study), sometimes a duplicate;
  - `CARDS_ru` uses a community translation, so about half the names differ from the game's.

  An import script OCRs every candidate image (Russian Tesseract) and matches it to a card code by its name, text, type and stats. The result is written to a reviewed manifest. Uncertain matches are listed for review on a generated contact sheet that shows each Russian image next to the English scan.

- **Russian text follows the printed cards.** For every card that gets a Russian image, its Russian name, subtitle, traits and rules text are taken from the OCR of that image, kept in the game's markup (icons such as `[action]`, `[willpower]`, bold keywords), and reviewed card by card. These go in a new translation layer between the imported and the hand-written Russian files. The feed, details column and prompts then use the same words as the card on screen.
- **Converted for the web.** Each chosen image is resized to 50% (378×531, or 531×378 landscape), converted to WebP, and committed under `public/cards-ru/` (about 230 files, roughly 10 MB). Only cards in the current content are included. The rest of the matched manifest is kept for later campaigns.
- **Pages deploy:** the Russian images are part of the build, including the PDF-derived ones, and are publicly hosted like the English scans (chosen deliberately).

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `card-content`: Card images (locale-specific images with a fallback chain); Localization (a reviewed print-text layer for Russian); new requirement Russian card import.

## Impact

- **New:**
  - `scripts/import-ru-cards.ts` (extract, OCR, match, convert), with its manifest `content/i18n/ru/images.json` and a review overrides file;
  - `content/i18n/ru/cards.print.json` (the print-matched texts);
  - `public/cards-ru/*.webp`.
- **Changed:**
  - `src/ui/images.ts` (`cardImage` takes the locale), its callers (`CardFace`, `textures.ts`, `Screens`, the fetch script), and the texture cache key;
  - `src/content/loader.ts` (the new i18n layer);
  - `README`.
- **Tooling** (only to run the import, not at build time): Tesseract with `rus` language data, `pdfimages` (poppler), ImageMagick and `cwebp`, all available on this machine except `rus.traineddata`.
- `inspired/` stays uncommitted. The import runs locally and only its outputs are committed.
