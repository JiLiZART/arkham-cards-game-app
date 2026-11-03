## 1. Import for every locale

- [ ] 1.1 Failing test `scripts/import-i18n.test.ts`: the source map resolves `zh-hant` to `.po` `zh`, suffix `zh`, ArkhamDB `zh`; `zh-hans` to `zh-cn`, `zh_cn`, `zh-cn`; `pl` to `pl` three times; `--all` lists the ten non-English locales.
- [ ] 1.2 `scripts/import-i18n.ts`: `SOURCES` map, `importLocale(l)` as the body, `--all` and `--locale <l>`; `mkdirSync` the locale folder; a missing `all_campaigns_*`, `encounter_sets_*` or `.po` reads as empty. Lift the argument handling to the top, the usage line to name both forms.
- [ ] 1.3 Failing test in `scripts/snapshotText.test.ts`: `translationsByPack(root, "xx")` on a root without `translations/xx` gives an empty map. Make it so.
- [ ] 1.4 Hand-write `content/i18n/<l>/ui.json` with one key, `lang.name`, for `de` Deutsch, `es` Español, `fr` Français, `it` Italiano, `ko` 한국어, `pl` Polski, `pt` Português, `zh-hant` 中文, `zh-hans` 简体中文.
- [ ] 1.5 Run `pnpm import:i18n --all`; commit the nine folders' generated files and the refreshed `content/i18n/ru/ui.generated.json` (160 keys); check the summary lines against the inspection's counts (core names 93–104 per locale, 3/3 Night of the Zealot intros, 11 resolutions). Run it twice: no diff.
- [ ] 1.6 `package.json`: `import:i18n` usage in README (`pnpm import:i18n --all`, `--locale ru`).

## 2. Loader: a locale's generated text on demand (ADR-0045)

- [ ] 2.1 Failing test in `src/content/content.test.ts` (beside the `lazyPacks` tests): with the browser globs, `locales(db)` lists every folder from its eager `ui.json`; `db.i18n.pl.cards["01020"]` is undefined until `loadLocale("pl")` resolves, then its name is "Maczeta"; `loadLocale` twice fetches once; a rejected fetch returns a `ContentError` and leaves the locale in `locales(db)`.
- [ ] 2.2 `src/content/index.ts`: remove `i18n/*/{cards,campaigns,ui}.generated.json` from the eager glob (keep `ui.json`, `cards.json`, `cards.print.json`), add `lazyLocaleText = import.meta.glob("/content/i18n/*/*.generated.json")` and `export function loadLocale(l)` shaped as `loadPack`: fetch, `addCardText` at `textLayer("generated")`, UI merged under the hand-written keys, campaigns set; a set of loaded locales.
- [ ] 2.3 `src/content/loader.ts`: `buildContent` registers a locale from any of its files (it does: `TEXT_FILE`), and the UI/cards merge order is unchanged when the generated layer arrives after the hand-written one (layer 0 never overwrites layer 2: assert in the test of 2.1).
- [ ] 2.4 `src/content/node.ts` keeps loading everything from disk; `check:content` and the content tests see every locale whole (one assertion in `content.test.ts`).

## 3. The app: no hard-coded locale, one picker

- [ ] 3.1 Failing tests in `src/ui/state/store.test.ts`: `startLocale(storage, lang, available)` with `available = ["de","en","es","fr","it","ko","pl","pt","ru","zh-hans","zh-hant"]`: saved `ru` wins; `de-AT` → `de`; `pt-BR` → `pt`; `zh-TW`, `zh-HK`, `zh-Hant-TW` → `zh-hant`; `zh`, `zh-CN`, `zh-SG`, `zh-Hans` → `zh-hans`; `nl` and `""` → `en`; `zh` with no Chinese folder → `en`.
- [ ] 3.2 `src/ui/state/store.ts:33`: `startLocale` as designed (decision 5); the store calls it with `locales(db)`; app start awaits `loadLocale(startLocale)` with the core pack; `setLocale(l)` awaits `loadLocale(l)` then `set({ locale })` and the storage write; a `ContentError` is reported like a pack's.
- [ ] 3.3 Failing test in `src/ui/game/decks.test.ts`: `defaultDeckName` with `de` on 17 October gives "Roland · 17. Okt", with `en` "Roland · 17 Oct", with `zh-hant` "Roland · 10月17日". `decks.ts:185`: `toLocaleDateString(locale === "en" ? "en-GB" : locale, …)`.
- [ ] 3.4 `src/ui/assets/images.ts:28`: a comment that `ru` is the one locale with hosted scans; no code change. `src/ui/App.tsx:59` unchanged (`html[lang]` = the folder tag).
- [ ] 3.5 Failing test `src/ui/components/LangSwitch/LangSwitch.test.tsx`: with eleven locales the component renders one `select[data-testid="lang-switch"]` with eleven options sorted by tag, each `lang={l}` and text `lang.name`, the current one selected; choosing one calls `setLocale`; with one locale it renders nothing.
- [ ] 3.6 `LangSwitch.tsx`: the select; drop `compact` and the step button; `LangSwitch.module.css` styles the select as the corner tab and the phone bar pill (the `lang-switch` hook class in `styles.css` kept for `App.tsx` and `Hud.tsx:436`). `Settings.tsx:31` renders `<LangSwitch />` in the language row.
- [ ] 3.7 `src/ui/noClassLookups.test.ts` and the existing `App`/`Hud` tests still pass; the phone top bar's `compact` call sites updated.

## 4. check:content for maintained and imported locales (ADR-0046)

- [ ] 4.1 Failing test (a small `scripts/check-content.test.ts` over the needed-keys rule lifted into `src/content/i18nChecks.ts`, or an assertion in `src/content/content.test.ts`): `de` with only `lang.name` gives no "missing string" error; `ru` missing `instruction.x` gives one; any locale without `lang.name` in its own `ui.json` gives one.
- [ ] 4.2 `scripts/check-content.ts:91–108`: `MAINTAINED = ["en", "ru"]` for the needed keys; `lang.name` required from the locale's own file; per locale, the count of UI keys from a source and `cycleCoverage(db, l)` per cycle for every non-English locale, replacing the `ru` block.
- [ ] 4.3 `pnpm check:content` passes with the eleven folders.

## 5. Fonts and CJK

- [ ] 5.1 Re-subset `public/fonts/EBGaramond.woff2`, `EBGaramond-Italic.woff2` and `Prata-Regular.woff2` from the Google Fonts sources with `pyftsubset` over Latin, Latin Extended-A/B, Cyrillic and punctuation (decision 8); record the command and ranges in `public/fonts/LICENSES.md`; check ł ą ę ś ź ż render in the chrome (`scratchpad/inspect/glyphs.mjs` reads the cmap).
- [ ] 5.2 `src/ui/styles.css`: `:lang(ko)`, `:lang(zh-hant)`, `:lang(zh-hans)` overrides of `--f-body`, `--f-display` and `--f-name` with the system CJK faces after the design's fonts; the card-face Alegreya stack likewise.
- [ ] 5.3 Playwright on `pnpm dev --port 5174`: the title, the Night of the Zealot tile, Roland's turn with the bar, feed and option pills in `pl`, `ko` and `zh-hans`, screenshots under `.playwright-mcp/`; fix clipped line heights; stop the server.

## 6. Docs and verification

- [ ] 6.1 README.md: the locale list, the import (`--all`), "Russian card images" stays `ru`-only with one sentence that other locales use the English scans; AGENTS.md: the first paragraph names the locales, the `{en,ru}/ui.json` rule gains "the other locales are import-only (ADR-0046)".
- [ ] 6.2 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`.
- [ ] 6.3 `pnpm coverage` (no change expected), `pnpm check:content`, `pnpm test`; `pnpm build` and note the main chunk size against 1,874 KB (493 KB gzipped): it must not grow by the nine locales' generated text.
- [ ] 6.4 `openspec validate i18n-all-locales --type change --strict`.
