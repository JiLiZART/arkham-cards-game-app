## Why

The game knows one pack: the core set, 183 cards used by three scenarios, fetched from ArkhamDB's API, with Russian text for those cards from ArkhamCards and Russian images for them from one PDF. Deck editing, the other campaigns and a Russian player all need more: every card that exists, in Russian, with its Russian image when there is one. `inspired/arkhamdb-json-data` is an offline copy of ArkhamDB's data for 17 cycles with Russian text for every cycle, and `inspired/Arkham_Horror_LCG` holds 61 Russian print PDFs covering the first six cycles and the Return-to boxes. The import tools exist; they need to read these sources and run across everything.

## What Changes

- **Card data for every cycle** from the local `arkhamdb-json-data` snapshot instead of the API: each cycle becomes a pack under `content/packs/<cycle>/cards.generated.json` (6,047 cards across 17 cycles), the hand-written `cards.json` overrides untouched. Packs load lazily by cycle so the first screen doesn't pay for 6,000 cards.
- **Russian text for every card** from the snapshot's `translations/ru`: names, subnames, traits, rules text, flavour and back text, layered as today under the print-matched texts and hand fixes. The other locales the snapshot has (de, es, fr, it, ko, pl, pt, uk, zh, …) become available by the same command; only Russian is shipped by this change.
- **Russian images for every card the PDFs print**: the existing OCR pipeline reads `inspired/Arkham_Horror_LCG` (all 61 PDFs, each tagged with its cycle so matching is scoped to that cycle's cards), writes `public/cards-ru/<code>.webp` for every match and the manifest with confidence and review overrides; all matched images are committed (about 300 MB).
- **Campaign text** (scenario intros, resolutions, encounter-set names) keeps coming from ArkhamCards; the snapshot has none.
- `check:content` extends to every pack: schema, references, and translation coverage reported per cycle.

Out of scope: scenario definitions for the other campaigns (they stay unplayable data), deck pools (deck-configuration reads whatever packs exist), images for cycles the PDFs don't cover.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `card-content`: the import source becomes the local snapshot for every cycle; localization covers every cycle from it; the Russian image import reads the new PDF folder across cycles.

## Impact

- `scripts/import-cards.ts` (`--source arkhamdb-json-data`, `--cycle <code>`, all cycles with `--all`; reads `pack/<cycle>/*.json`, `encounters.json`, `packs.json`), `scripts/import-i18n.ts` (card text from `translations/<locale>/pack/…`, campaign text still from ArkhamCards), `scripts/import-ru-cards.ts` (source folder, cycle tags per PDF, per-cycle matching, larger cache), `scripts/check-content.ts` (per-cycle coverage report), `src/content/index.ts` and `loader.ts` (lazy pack loading by cycle; the core pack and the scenarios' encounter sets eager), `content/packs/<cycle>/`, `content/i18n/ru/*.generated.json`, `content/i18n/ru/images.json`, `public/cards-ru/` (~6,000 files), README (sources and commands).
- The content tests that count cards (`content.test.ts`) and the `check:content` summary line change their numbers.
