## Why

The game plays in English and Russian, but the text sources it already vendors cover nine more languages: ArkhamCards' campaign guides (`inspired/ArkhamCards/assets/generated/all_campaigns_<l>.txt`) and `.po` files, and ArkhamDB's `translations/<l>` card text, for German, Spanish, French, Italian, Korean, Polish, Portuguese and both Chinese scripts. The import (`scripts/import-i18n.ts`) and the runtime (`src/content/i18n.ts`, per-string fallback to English) were written for any locale, yet the script throws on a locale folder that does not exist, `check:content` fails a locale that lacks any of 120 hand-written prompt strings, the language switch is two tabs, three code paths say `"ru"`, and the bundled fonts cannot set Polish or CJK. Players of the other eight languages read every card, scenario and campaign in English today for no reason but these.

## What Changes

- **Nine locales join `en` and `ru`:** `de`, `es`, `fr`, `it`, `ko`, `pl`, `pt`, `zh-hant` (Traditional, ArkhamCards' `zh`) and `zh-hans` (Simplified, `zh-cn`). Each carries only what a real source holds: card names, subtitles, traits and text for every cycle (ArkhamDB), campaign and scenario names, intros, resolutions, log labels, flow steps and encounter-set names (ArkhamCards), and the ~160 UI labels whose English matches a `.po` entry. Everything else reads in English, per string. No text is translated by hand or by machine; the one hand-written key per locale is its endonym (`lang.name`).
- **One import for every locale:** `import:i18n --all` (or `--locale <l>`) with a per-locale source map (the `.po` name, the `*_<l>.txt` suffix, the ArkhamDB folder), creating the folder and tolerating a missing source. The stale `ru/ui.generated.json` (148 keys, 160 match today) is refreshed by the same run.
- **A locale's generated text loads when it is chosen**, as a pack does (`loadPack`): the eager bundle keeps each locale's hand-written `ui.json` and `cards.json`, and fetches `*.generated.json` for the start locale before the first screen and for a locale the player switches to. Otherwise the first load grows about 200 KB raw per locale.
- **One language picker:** the corner switch and the settings row become one native `<select>` of endonyms, in both layouts; the phone's step-to-next button goes.
- **No locale is hard-coded in the app:** the start locale is matched from `navigator.language` against the locales the content has (`zh-TW`/`zh-HK` → `zh-hant`, `zh`/`zh-CN`/`zh-SG` → `zh-hans`, `pt-BR` → `pt`, else the primary subtag); deck dates format with the locale's own tag; the Russian scans stay the one `ru` special case, stated as such.
- **`check:content` tells the maintained locales from the imported ones:** the 120 prompt, instruction, tip and how-to keys are required in `en` and `ru`; every locale must name itself (`lang.name` in its own `ui.json`); the per-cycle text coverage is printed for every locale, not `ru` alone.
- **Fonts:** EB Garamond and Prata re-subset with Latin Extended (ł ą ę ś ź ż for Polish); `:lang(ko)`, `:lang(zh-hant)` and `:lang(zh-hans)` font stacks over the system's CJK serif faces for body, display and card-name text; no CJK font is bundled.
- README and AGENTS.md: "English or Russian" becomes the locale list; the rule that a new UI string is written in `en` and `ru` stays as it is, with the other locales stated as import-only.

Not in this change: Ukrainian (`uk`: core card names and text only, no campaign or UI source) and Vietnamese (`vi`: Night of the Zealot's story only, no card text), Czech and ArkhamDB's `vn` (placeholder stubs), localized card scans for any locale but `ru` (no source exists), a translated rules glossary from `rules_<l>.txt`, and hand translation of the ~850 UI keys no `.po` matches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-content`: Localization (a locale is a folder; eleven locales; per-string fallback; a locale's generated text loads when chosen); Reused translations (every locale from its own sources through one command; endonyms by hand; `check:content` requires completeness of the maintained locales only); Every cycle's cards as data (the per-cycle coverage printed for every locale).
- `game-table-ui`: Title screen and settings (the language picker is one select of endonyms, in the corner of every menu screen and in Settings, on both layouts).

## Impact

- `scripts/import-i18n.ts` (source map, `--all`, folder creation, missing sources), `scripts/snapshotText.ts` (`translationsByPack` over a missing folder), `scripts/check-content.ts` (maintained-locale rule, `lang.name`, coverage per locale).
- `src/content/index.ts` and `loader.ts` (lazy `i18n/<l>/*.generated.json`, `loadLocale`), `src/content/i18n.ts` (`locales` unchanged), `src/ui/state/store.ts` (`startLocale` against the content's locales, `setLocale` awaiting the text), `src/ui/game/decks.ts` (date tag), `src/ui/assets/images.ts` (comment), `src/ui/components/LangSwitch/`, `src/ui/menu/Settings/Settings.tsx`, `src/ui/App.tsx`.
- `content/i18n/<l>/` for nine locales (generated files plus a one-key `ui.json`), `content/i18n/ru/ui.generated.json` refreshed; `public/fonts/EBGaramond*.woff2`, `Prata-Regular.woff2`, `LICENSES.md`; `src/ui/styles.css` (`:lang()` stacks).
- README.md, AGENTS.md. No engine change; `ENGINE_VERSION` unchanged; saves and online rooms already store the locale as a string.
