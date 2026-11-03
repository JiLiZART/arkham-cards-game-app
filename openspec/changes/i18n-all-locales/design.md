## Context

The runtime is already locale-agnostic. `locales(db)` is `Object.keys(db.i18n)` (`src/content/i18n.ts:33`); a folder under `content/i18n/` is a locale as soon as the loader's `TEXT_FILE` (`src/content/loader.ts:131`) matches one of its files; `t()`, `cardText()`, `campaignBlurb()`, `stepText()`, `scenarioText()` and `logLabel()` each fall back to English per key or field. Saved games and online rooms carry `locale` as a string (`store.ts:900`), and `App.tsx:59` writes it to `html[lang]`.

What stops a tenth locale is around the runtime. `scripts/import-i18n.ts` takes one `--locale`, uses that code for all three sources (`all_campaigns_${locale}.txt`, `${locale}.po.json`, `translations/${locale}`), throws when `content/i18n/<locale>/` is missing (line 168) and when a source is (`read()` and `translationsByPack`). `scripts/check-content.ts:91–103` requires the 120 `prompt.*`/`instruction.*`/`tip.*`/`howto.*` keys in every locale, which no `.po` holds (119 of 120 are unmatched in every language), and prints `cycleCoverage(db, "ru")` alone. `startLocale` (`src/ui/state/store.ts:34`) answers `ru` or `en`; `defaultDeckName` (`src/ui/game/decks.ts:185`) picks `ru-RU` or `en-GB`; `cardImage` (`src/ui/assets/images.ts:28`) serves the Russian scans for `ru`, rightly. `LangSwitch` is one tab per locale, or on the phone one button that steps to the next. `content/index.ts:21` bundles every `i18n/*/{cards,ui,campaigns}*.json` eagerly: about 204 KB raw per locale (core cards 72K, campaigns 124K, UI 8K), 1.8 MB for nine. EB Garamond and Prata are subset to Latin and Cyrillic (no ł ą ę ś ź ż), Teutonic/TeutonicRU to Latin/Cyrillic, and no bundled font has Hangul or Han.

The sources, measured by `scratchpad/inspect/i18n-stats.mjs`: for `de es fr it ko pl pt zh zh-cn`, 93–104 of the 104 core card names and 101 texts, 900–5,600 card names across all packs, every Night of the Zealot intro and resolution, 168–459 encounter-set names, and 151–161 of our 1,011 UI keys (the rest have no `.po` match; 209 carry placeholders and are skipped by rule). `uk` has core card text only, `vi` campaign text only, `cs` and ArkhamDB's `vn` placeholder stubs.

In-force ADRs: 0001–0036, none superseded but 0019 (by 0020). 0006 (card text from the vendored snapshot, generated files read-only), 0007 (generated campaigns, their text loaded with the campaign), 0008 (scans from the CDN; Russian scans hosted), 0012 (completeness measured and committed: `coverage.json` measures behaviour, not translation), 0016 (components own their styles) and 0005 (one layout mode) bound this design.

## Goals / Non-Goals

**Goals:** nine locales with everything their sources hold and nothing else; one command that regenerates all eleven; a first load that does not grow with the locale count; a picker that holds eleven languages on a phone; no `"ru"` in the app code but the scans; Polish and CJK readable in the chrome.

**Non-Goals:** hand or machine translation of any string (the ~850 unmatched UI keys stay English in every locale but `ru`); `uk`, `vi`, `cs`, `vn`; localized scans beyond `ru`; a translated keyword glossary or rules text from `rules_<l>.txt`; a bundled CJK font; a Ukrainian-capable Teutonic; changes to the engine or to `coverage.json`.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
 inspired/ (never read at runtime)                      scripts/import-i18n.ts  --all | --locale <l>
   ArkhamCards/assets/i18n/<po>.po.json        ---->    SOURCES: { de:{po:"de",txt:"de",db:"de"}, ...,
   ArkhamCards/assets/generated/*_<txt>.txt    ---->      "zh-hant":{po:"zh",txt:"zh",db:"zh"},
   arkhamdb-json-data/translations/<db>/       ---->      "zh-hans":{po:"zh-cn",txt:"zh_cn",db:"zh-cn"} }
                                                          mkdir content/i18n/<l>; a missing source = {}
                                                                     |
                                                                     v
 content/i18n/<l>/                                       scripts/check-content.ts
   ui.json            (hand: en, ru full; others lang.name) MAINTAINED = ["en","ru"]: the 120 needed keys
   cards.json         (hand fixes; ru only today)           every locale: lang.name in its own ui.json
   cards.generated.json, campaigns.generated.json,          every locale: UI keys from a source,
   ui.generated.json  (import, LAZY)                        cycleCoverage(db, l) per cycle
   packs/<pack>.generated.json   (import, with the pack)
   campaign-texts/<id>.json      (import, with the campaign, ADR-0007)
            |
            v
 +----------------------------------------------------------------------------------------------+
 | src/content                                                                                  |
 |  index.ts: eager  i18n/*/{ui,cards}.json, i18n/*/cards.print.json                            |
 |            lazy   i18n/*/{cards,campaigns,ui}.generated.json  -> loadLocale(l): Promise      |
 |            lazy   i18n/*/packs/*.json (loadPack), i18n/*/campaign-texts/*.json (loadCampaign)|
 |  loader.ts: buildContent registers each folder as a locale from the eager files;             |
 |             addCardText / Object.assign in textLayer order, generated (0) under hand (2)     |
 |  i18n.ts: unchanged (locales, t, cardText, scenarioText... fall back per string)             |
 +----------------------------------------------------------------------------------------------+
            |  db.i18n[l]                                        ^ loadLocale(l) awaited by
            v                                                    |
 +----------------------------------------------------------------------------------------------+
 | src/ui                                                                                       |
 |  state/store.ts: startLocale(storage, navigator.language, locales(db)) -> tag match           |
 |                  setLocale(l): await loadLocale(l); set({locale}); storage                   |
 |  components/LangSwitch: <select lang-per-option> of endonyms (corner, phone bar, Settings)   |
 |  game/decks.ts: toLocaleDateString(locale === "en" ? "en-GB" : locale)                      |
 |  assets/images.ts: ru scans (the one locale with scans; comment says so)                     |
 |  App.tsx: html[lang] = locale;  styles.css: :lang(ko), :lang(zh-hant), :lang(zh-hans) stacks |
 +----------------------------------------------------------------------------------------------+
```

## Decisions

1. **The locale set is the nine with card text and campaign text both.** `de es fr it ko pl pt zh-hant zh-hans`. The rule "a locale exists where a real translation exists" needs a floor, or `cs` (an untranslated guide file) would qualify; the floor is the two things a player meets first, the cards and the story. `uk` (cards only) and `vi` (story only) miss it and are listed under Open Questions, not added: the importer after this change takes either with one line in the source map, so leaving them out costs nothing later. _Alternative:_ every folder ArkhamCards names (13) — rejected: `cs` and `vn` would be English with a flag.

2. **Folder name = BCP 47 tag in lower case; Chinese by script.** `zh-hant` and `zh-hans`, not ArkhamCards' `zh` / `zh-cn`. The folder name becomes `html[lang]` (`App.tsx:59`), the `lang` of each picker option and the tag passed to `toLocaleDateString`; `lang="zh"` alone leaves the browser to guess the glyph set, and the CJK `:lang()` font stacks (decision 8) need to tell the two apart. The map between our tag and the three source names lives once, in `SOURCES` in `import-i18n.ts`. `pt` stays `pt` (ArkhamCards gives no region). _Alternative:_ keep the source codes and map at render time — rejected: two names for one locale in the repository, and `startLocale`, `App.tsx`, `decks.ts` would each need the map.

3. **A locale's generated text loads when the locale is chosen, like a pack.** `content/index.ts` moves `i18n/*/{cards,campaigns,ui}.generated.json` out of the eager glob into a `lazyLocaleText` glob and exports `loadLocale(l): Promise<ContentError[]>`, shaped as `loadPack`: fetch the three files (those that exist), run them through `addCardText`/the UI merge at their `textLayer`, remember the locale as loaded. `cards.print.json` stays eager: it is `ru`'s and 183 entries. `buildContent` registers each locale from its eager files, so `locales(db)` and `lang.name` are right before any lazy text arrives; `en` has no generated files and is always whole. `startLocale` is resolved, then `loadLocale(startLocale)` awaited alongside the core pack before the first render; `setLocale(l)` awaits `loadLocale(l)` before `set({ locale })` so the screen never shows a half-loaded locale (the button shows nothing while the ~200 KB arrive; on a second choice it is instant). Online: each device loads its own locale; the moves carry none. _Why:_ 1.8 MB raw (about 360 KB gzipped) on a 493 KB gzipped main chunk, for text nine of ten players never read; packs and campaign texts already load this way (ADR-0007), so the pattern and its tests exist. _Alternative:_ keep eager and accept the size — rejected by the number; a per-locale Vite chunk by manual chunking — the same thing with less control over when it loads.

4. **One native `<select>` is the picker, everywhere.** `LangSwitch` renders `<select data-testid="lang-switch" value={locale}>` with an `<option lang={l}>` per locale (sorted by tag, text `t(db, l, "lang.name")`), styled by its CSS Module to look like today's tab in the corner and the phone bar; `compact` goes, as does the step-to-next button. `Settings.tsx:31` renders `<LangSwitch />` in its language row instead of its own select, which also fixes its `l.toUpperCase()` labels. A native select is the one control that holds eleven options on a 393 px phone without a menu component, opens the OS picker, and is keyboard- and screen-reader-complete for free. _Alternative:_ a custom popover menu — rejected: a new component, focus handling and a phone sheet for what `<select>` does.

5. **`startLocale` matches the browser against the content.** `startLocale(storage, lang, available: string[])`: the saved choice; else, with `lang` lower-cased, the first of: an exact match in `available`; `zh-tw`, `zh-hk`, `zh-mo`, `zh-hant*` → `zh-hant` and `zh`, `zh-cn`, `zh-sg`, `zh-hans*` → `zh-hans` when present; the primary subtag when present; `en`. The store calls it with `locales(db)` so the list is the folders, never a constant. `defaultDeckName` passes `locale === "en" ? "en-GB" : locale` to `toLocaleDateString` (the day-first English date is a choice, kept; every other tag is its own). `images.ts:28` keeps `locale === "ru"` with a comment that Russian is the one locale with hosted scans (card-content's Card images requirement already says other locales use the English scans).

6. **`check:content` separates the maintained locales from the imported.** A constant `MAINTAINED = ["en", "ru"]` beside the needed-keys loop (`check-content.ts:92–103`): the 120 keys are errors only for those two. For every locale: an error unless `lang.name` is in the locale's own hand-written `ui.json` (read from `db.i18n[l].ui` and the file, so a fallback to English does not pass), one line with the UI keys the locale has, and `cycleCoverage(db, l)` for each non-English locale replacing the `ru`-only block at line 106. `coverage.json` is untouched (ADR-0012 measures behaviour). AGENTS.md's rule stays: a new string goes into `en` and `ru`; the nine other locales are never edited by hand beyond `lang.name`. _Alternative:_ require the 120 keys everywhere and fill them by machine — rejected by the user's decision; a per-locale "complete" flag in `ui.json` — a second place to say what the constant says.

7. **The importer gets a source map and loses its throws.** `SOURCES: Record<string, { po: string; txt: string; db: string }>` for the ten non-English locales; `--all` iterates it, `--locale <l>` picks one. The body becomes `importLocale(l)`: `mkdirSync(dir, { recursive: true })`; `read()` of a missing `all_campaigns_*`/`encounter_sets_*`/`.po` gives `[]`/`{}`; `translationsByPack` returns an empty map for a missing `translations/<db>` folder. A new locale's `ui.json` with `lang.name` is written once by hand (the endonyms from ArkhamCards' `localizedName()`: Deutsch, Español, Français, Italiano, 한국어, Polski, Português, 中文, 简体中文), never by the script. Running `--all` also refreshes `ru/ui.generated.json` (148 → 160 keys). `packs/` and `campaign-texts/` are removed and rewritten per locale as today.

8. **Fonts: re-subset for Latin Extended, system stacks for CJK.** `EBGaramond.woff2`, `EBGaramond-Italic.woff2` and `Prata-Regular.woff2` are re-cut from the Google Fonts sources with `pyftsubset --unicodes="U+0000-00FF,U+0100-024F,U+0400-04FF,U+2000-206F,U+20A0-20CF,U+2122"` (Latin, Latin Extended-A/B, Cyrillic, punctuation), the command recorded in `public/fonts/LICENSES.md`; Polish then sets in the design's faces. For Korean and Chinese no bundled font: `src/ui/styles.css` adds `:lang(ko) { --f-body: "EB Garamond", "Apple SD Gothic Neo", "Noto Serif KR", "Malgun Gothic", serif; --f-display: Prata, ...same; --f-name: Teutonic, ...same }` and the like for `:lang(zh-hant)` ("PingFang TC", "Noto Serif TC", "Microsoft JhengHei") and `:lang(zh-hans)` ("PingFang SC", "Noto Serif SC", "Microsoft YaHei"), so Latin glyphs keep the design and Han/Hangul come from the system; the card faces (Alegreya) get the same tail. Line height: the bar, feed and option pills are checked by Playwright screenshots in `ko` and `zh-hans`, and fixed where a glyph clips. _Alternative:_ bundle Noto Serif CJK — rejected: 4–8 MB per script against a 3 MB site; subset by the content's glyphs — a build step for a script set that changes with every import.

9. **Specs and docs.** `card-content`'s Localization, Reused translations and Every cycle's cards as data, and `game-table-ui`'s Title screen and settings, carry the deltas; no new capability, the existing ones already own locales. README's "English or Russian" and the Russian-only import lines, and AGENTS.md's first paragraph, name the eleven; the `{en,ru}` string rule stays with one sentence on the import-only locales.

## Risks / Trade-offs

- [A mixed-language screen: Polish cards and story around an English bar and feed] → stated in the proposal and the spec as the rule ("real translations only, English otherwise"); the maintained locales are the two with full UI; the picker's endonyms set the expectation.
- [`setLocale` awaits a fetch; the picker feels slow the first time] → ~40 KB gzipped per locale; the select keeps the new value at once and the screen re-renders when the text is in; a loaded locale is remembered, so the second switch is immediate; a failed fetch is reported like a failed pack and the locale still switches (every string falls back to English).
- [Node's `loadContentFromDisk` and the tests see all locales eager] → that is the point of `check:content`; the browser's `loadLocale` is tested in `src/content/*.test.ts` with the glob mocked as `lazyPacks` tests do.
- [`zh-hant`/`zh-hans` differ from ArkhamCards' codes a contributor may expect] → the `SOURCES` map is the one place that knows both, with a comment.
- [`pt` is a mix of Brazilian and European Portuguese in the sources] → it is what the source holds; the folder stays `pt`.
- [System CJK fonts differ per OS] → serif on Apple and Google faces, sans on Windows (no Serif CJK ships with it); acceptable, since no font is bundled.
- [The re-subset fonts change the byte size of `EBGaramond.woff2`] → Latin Extended adds ~10 KB per face; `LICENSES.md` records the ranges.
- [Tests that loop over `["en", "ru"]` (`feed.test.ts` and others)] → they test the maintained locales and stay; a new loader test and a `LangSwitch` test cover the nine.

## Migration Plan

Content and app in one change; no engine or save format change. Deploy: `pnpm import:i18n --all`, `pnpm check:content`, build. A saved `ah:locale` of `en` or `ru` is read as before. Rollback: revert; the extra folders are inert without the app change.

## Open Questions

- `uk` (Ukrainian, core card text only) and `vi` (Vietnamese, Night of the Zealot story only): in or out? Decided (assumed) out by decision 1's floor; either is one line in `SOURCES` plus a `ui.json` with `lang.name` if the user wants them, with `uk` also wanting Teutonic glyphs for і ї є ґ.
- Whether to show, in the picker or Settings, how much of a locale is translated (the import prints the numbers). Decided (assumed) no: the endonym alone, no percentages in the UI.
- No in-force ADR needs revisiting. Decisions 3 and 6 are durable commitments the adr step records (ADR-0045, ADR-0046).
