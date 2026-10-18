## 1. Art

- [x] 1.1 `scripts/import-art.ts` (`npm run import:art`): extract the cover crop, the parchment page and the five class parchments from the rulebook with their masks; write `public/art/*.webp` and `content/art/art.json`. Test the selection table and the manifest shape.
- [x] 1.2 Run it; commit the images and the manifest; record the sizes. 8 images, 760 KB in `public/art/`: title 133 KB, parchment 38 KB, wide parchment 54 KB, class pages 77-112 KB each. The cover painting itself has its logo printed in, so the title uses the cut-out painting of the rulebook's back page (stairs scene) with its soft mask, fading into the dark.

## 2. Screens

- [x] 2.1 Title: the painting behind the menu with the dark overlay, preloaded; Settings as a menu item after How to play; the gear removed.
- [x] 2.2 Parchment on the wizard, settings, how-to and campaign log, with dark ink text; phone layout checked.

## 3. Campaign tiles

- [x] 3.1 `prologue` and `scenarioNames` in generated `campaign.json` and in each locale's campaign text (`import-campaigns`, `import-i18n`), including Night of the Zealot; `campaignText` returns it. Tests.
- [x] 3.2 Tiles: reference card art, name, first prologue paragraph with "More", scenario count, generated note; side scenarios fall back to their intro.

## 4. Verification

- [x] 4.1 `npm test`, `npm run lint`, `npm run build`, `npm run check:content` clean; screenshots of the title, the wizard and the settings at 1600×900 and on the phone layout, in English and Russian; `drive-calm.js` to round 3 with 0 errors; first-load size before and after. Done: 676 tests, lint, build and check:content clean; title, wizard and settings checked at 1600x900 and 852x393 (and the title at 390x844) with no horizontal overflow; drive-calm to round 3 with 0 errors; main chunk 1,874 KB (493 KB gzipped) to 1,979 KB (531 KB), the prologues and scenario names.
- [x] 4.2 README; `openspec validate menu-facelift --type change --strict`.
