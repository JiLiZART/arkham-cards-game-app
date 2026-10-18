## 1. Fix

- [x] 1.1 `guideHtml` in `src/ui/guideText.ts` with tests (each tag, nesting, unknown tags, escaping, Russian); fonts Caveat, TT2020 Style E and About Dead into `public/fonts` with licences (About Dead's licence checked, Teutonic fallback otherwise); used by the intro, the resolution screen and the campaign tiles.
- [x] 1.2 Intro overlay: the box bounded by the viewport, the text scrolling with a fade (`moreBelow` tested), the card shrinking on short screens, the intro rendered through `guideHtml`.

## 2. Verification

- [x] 2.1 Browser check: Machinations Through Time's introduction at 1600×900 and 852×393, Continue and Skip on screen, the text scrolls; The Gathering unchanged; an intro with fancy, centre and typewriter lines in English and Russian; screenshots. `npm test`, lint, build, content check; drive-calm to round 3.
- [x] 2.2 `openspec validate fix-intro-overflow --type change --strict`.
