## 1. Import tool

- [x] 1.1 `scripts/import-ru-cards.ts` stages 1–2 (`npm run import:ru-cards`): download `rus.traineddata` into `.cache/tessdata`, extract the PDF card images, and OCR title and body crops of every `CARDS_ru` and PDF image, cached per file hash. `.cache/` stays ignored. Verify by running it: the image counts per source are printed (about 1,600 and about 300 for the core PDF alone), and the OCR titles of Мачете, Кабинет and an act from the core PDF read correctly.
- [x] 1.2 Stages 3–6: matching with name, body and type/orientation/level constraints, the CARDS_ru-before-PDF choice, the overrides file, `review.html`, `content/i18n/ru/images.json`, 50% WebP output to `public/cards-ru/` for content cards, and `src/ui/ruImages.generated.json`. Unit-test the scoring on fixtures: the Study's two sides, Physical Training level 0 vs 2, an act from the PDF. Verify by a run: print the matched, uncertain and unmatched counts, the content coverage per type, and the output size. Rerunning gives an identical manifest.

## 2. Review

- [x] 2.1 Go through `review.html` for every uncertain or low-margin content card, viewing the images, and record decisions in `content/i18n/ru/images.overrides.json`. Rerun until every content card side is matched or deliberately left on the English scan. Report the list of cards that stay English.

## 3. Print texts

- [x] 3.1 Draft generation (OCR clean-up, icon tokens from the official markup) and the loader's `.print` layer, with the content check for `cards.print.json` (known codes, valid markup tokens). Unit tests: the loader layering order, and the icon-token reuse on Machete's text.
- [x] 3.2 Review and write `cards.print.json` for every content card with a Russian image (name, subname, traits, text, and back text for double-sided cards), comparing each against its image. Verify with `npm run check:content` and a spot check of 10 cards in the Russian details column against their images (screenshots).

## 4. Game

- [x] 4.1 `cardImage(card, side, locale)` with the generated Russian set; `CardFace`, `useCardTexture`, `Screens` and the fetch script updated; locale switching re-textures. Unit tests: ru with an image → `cards-ru/…`, ru without → the English URL, en → the English URL, a back side. Verify in the browser at 1600×900 with screenshots in Russian: the hand, the strip, the map (the Study's two sides), the act/agenda panel and a details column with the matching name. Switching to English swaps back without a reload.

## 5. Verification

- [x] 5.1 `npm test`, `npm run lint`, `npm run build` and `npm run check:content` pass; a `.playwright-mcp/drive.js` round in Russian has no console errors or failed image requests; the README documents the import (tools, `npm run import:ru-cards`, the review workflow, sources and hosting note).
