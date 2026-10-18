## 1. Card data for every cycle

- [x] 1.1 `scripts/import-cards.ts`: add `--source arkhamdb-json-data` reading `inspired/arkhamdb-json-data/pack/<cycle>/*.json` (with `packs.json` and `encounters.json` for pack and set names), `--cycle <folder>` and `--all`; one pack per snapshot folder (the core folder's reprints, `core_2026`, as a pack of their own; bare duplicate stubs and the 01000 placeholder left out); `cards.json` untouched. Tests in `import-cards.test.ts`: a snapshot record maps like an API record; `--all` enumerates every cycle in `cycles.json`; a record failing the schema is reported with its code.
- [x] 1.2 Run `--all`; commit `content/packs/<cycle>/cards.generated.json` for all 17 cycles; `check:content` passes with every pack validated and the per-cycle report (task 3.1 adds the report; here it must at least pass).

## 2. Loading

- [x] 2.1 Lazy packs: `src/content/index.ts` loads `core` eagerly (a scenario of another cycle adds its pack to the two literal patterns in `index.ts`) and the rest through `loadPack(cycle)`; `buildContent` gains `loadPack`, `packLoaded`, `cardsOf(cycle)`; references in eager content are validated against the eager set plus named packs; `check:content` loads everything. Tests: the eager db has core and not Dunwich; after `loadPack("dwl")` Zoey exists; the bundle's first-load JSON is measured and recorded in the README (before and after). Measured 2026-10-18 (main JS chunk, gzip in brackets): core only 1,736 KB (462 KB); every pack eager 5,469 KB (1,151 KB); lazy packs 1,742 KB (464 KB), the 18 packs as separate chunks fetched on demand.

## 3. Russian text

- [x] 3.1 `scripts/import-i18n.ts`: card text for every cycle from `translations/<locale>/pack/…`; campaign text from ArkhamCards as before; `check:content` prints per-cycle counts of cards and Russian-translated cards. Run for `ru`; commit `content/i18n/ru/cards.generated.json` (the core pack's text, unchanged) and `content/i18n/ru/packs/<pack>.generated.json` for the other 16 packs, 3.3 MB, loaded with their pack so the first load doesn't grow. Result: 5,544 of 5,859 cards have Russian text; flavour text is not imported (the game never shows it). Verify: Zoey Samaras shows Russian name and text in the Russian locale; the core cards keep their print-matched texts (the layering is unchanged, `i18n.test.ts` case).

## 4. Russian images

- [ ] 4.1 `scripts/import-ru-cards.ts`: source folder `inspired/Arkham_Horror_LCG`, a PDF-to-cycle table from the file names (`01` core, `02` dwl, `03` ptc, `04` tfa, `05` tcu, `06` tde, `0xR` return, investigator sheets to their cycles), matching scoped to the cycle, cache per PDF, contact sheets per cycle. Tests for the table and the scope in `ruMatch.test.ts`.
- [ ] 4.2 Run the pipeline over all 61 PDFs (hours; stages cached); review the per-cycle contact sheets and pin or reject low-confidence matches in the overrides; commit `public/cards-ru/` and `content/i18n/ru/images.json`. Record in the README how many images matched per cycle and how many are unmatched.

## 5. Verification and docs

- [ ] 5.1 Run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with 0 errors in Russian (`__driveLocale = "ru"`) with Russian images on the core cards; a cold load's JSON transfer measured before and after the lazy packs.
- [ ] 5.2 README: the snapshot as the source (its commit), the three commands and their flags, the per-cycle coverage, the PDF folder and the review process, the repository size note. Run `openspec validate all-cycles-ru-content --type change --strict`.
