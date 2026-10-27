## 1. Overlap step

- [x] 1.1 In `src/ui/hud/strip.test.ts`, replace the `rowCardWidth` tests with `rowGap(rowW, widths)` tests: fewer cards than fit (step = card width + gap), exactly fitting, 6 and 8 cards over 320 px (step shrinks, last card's right edge at the row's edge), exhausted cards (1.4× width) in the mix, a single card
- [x] 1.2 In `src/ui/hud/Panels.tsx`, add `export function rowGap` and remove `rowCardWidth` and `ROW_MIN_W`; tests pass

## 2. The row

- [x] 2.1 In `PlayStrip`'s layout effect (`part === "assets"`): keep the dock/piles measurement for `bottom` and `width`, drop `maxHeight`, set `--sw` to the full 92 px and `--gap` from `rowGap` (the margin between slots, negative when they overlap)
- [x] 2.2 In `src/ui/styles.css`, `.play-strip.assets`: `flex-wrap: nowrap`, `overflow: visible`, no `max-height`; slots after the first get `margin-left: calc(var(--step) - <previous slot width>)` (use a per-slot `--prev` variable or sibling selectors for exhausted/upright); later slots lie over earlier ones (`z-index` in document order)
- [x] 2.3 Hover and focus: `.play-strip.assets .strip-slot:hover`, `:focus-within` come to the front (a touch tap focuses the card, so no separate peeked state is needed)
- [x] 2.4 `.play-strip.assets .mini-card .tokens` at the card's top-left; check the pulsing `legal` ring and the `target` outline are not clipped

## 3. Checks

- [x] 3.1 Browser check on a dev server (not 5173): 2, 4, 6 and 8 assets at 1440×900 and 1366×768, with two exhausted; hover the middle card; no scrollbar, no second row, badges in view; screenshots under `.playwright-mcp/`; stop the server
- [ ] 3.2 Play an asset from the hand and exhaust one: the fly-in lands on its slot and the sideways card overlaps correctly; a skill test still slides the row aside
- [ ] 3.3 `.agents/context/design.md` and `.impeccable/design.json`: one sentence on the overlapping asset row and its top-left badges
- [x] 3.4 `pnpm lint:fix`, `pnpm format:fix` on the touched files, `pnpm typecheck`, `pnpm test`
- [x] 3.5 `openspec validate asset-area-stacks --type change --strict`
