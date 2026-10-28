## 1. Defaults and strings

- [x] 1.1 In `src/ui/state/store.ts` set `drawByHand` and `tapDecks` to `false` in the initial state and in the save-restore fallbacks (`?? false`); leave the new-game setup's `tapDecks: true` as it is. Update the store test that asserts the defaults (add one if none).
- [x] 1.2 Add the strings to `content/i18n/en/ui.json` and `ru/ui.json`: `fullscreen.enter`, `fullscreen.exit`, `fullscreen.ask`, `fullscreen.yes`, `fullscreen.no`, `fullscreen.homeScreen`, `fullscreen.dismiss`, `wizard.filter.toggle` ("Filter"), `wizard.filter.count`, `wizard.details`, `sheet.close`.

## 2. Layout mode on the menus

- [x] 2.1 In `src/ui/App.tsx` read `useLayoutMode()` once and add `phone` to the `.screen` root's class; add a `data-layout` attribute for the drive scripts. Test in `src/ui/App.test.tsx` (or beside it) that the class follows the mode.
- [x] 2.2 Lower `PHONE_INSETS.bottom` in `src/ui/state/layoutMode.ts` to match the compact instruction bar (about 112 px) and update its test.

## 3. Fullscreen

- [x] 3.1 Write `src/ui/state/fullscreen.ts`: `fullscreenSupported()`, `toggleFullscreen(el)` (prefixed forms, rejection caught), `useFullscreen()` on `fullscreenchange`. Unit test with a stubbed `document` for supported, unsupported and a refused request.
- [x] 3.2 Build `src/ui/components/FullscreenButton/` (folder, module, index, test): the icon button rendered only when supported, `aria-label` and `title` from the strings, `aria-pressed` for the state.
- [x] 3.3 Build `FullscreenAsk` in the same folder: shown when the mode is phone and `safeStorage()` has no `fullscreen-asked`; Enter toggles inside the tap handler; both answers write the key; unsupported platforms get the Home Screen line with one dismiss. The branching is a pure function (`askKind`) tested in `fullscreen.test.ts`; the DOM is checked in the 852×393 drive (tasks 5.3, 6.5), as the repo has no DOM test environment.
- [x] 3.4 Mount: `FullscreenAsk` in `App.tsx` above the screen; `FullscreenButton` top-right of `Title` and after the chaos bag in `TopBar` (`src/ui/hud/Hud/Hud.tsx`) on the phone only.

## 4. Bottom sheet

- [x] 4.1 Build `src/ui/components/BottomSheet/` (folder, module, index, test): portal to `document.body`, scrim, panel at `70dvh` with `env(safe-area-inset-bottom)`, drag handle, head with title and Close, scrolling body; closes on scrim tap, Escape, Close, and a handle swipe down over 60 px. Props: `open`, `title`, `onClose`, `children`. Tests for each close path and that a scrim tap does not reach what is under it.
- [x] 4.2 In `src/ui/hud/PlayerBar/PlayerBar.tsx` render `Sheet`'s content in a `BottomSheet` when the mode is phone, the anchored popover otherwise; remove the phone's "tap outside" handler where the scrim now does it. Verified in the 852×393 drive (no DOM test environment in the repo); the swipe and close rules are unit-tested in `sheetDrag.test.ts`.

## 5. Dense phone controls

- [x] 5.1 `src/ui/styles.css`: in the `.game.phone` section set the shared sizes (label 13 to 14 px, padding 4 to 6 px, `min-height: 44px` kept) for `.icon-btn`, `.rail-btn`, `.undo-btn`, `.camera-buttons button`; add the `.screen.phone` block for the title (h1 44 px, one column of 44 px buttons, 16 px labels, 6 px gaps) and the settings screen.
- [x] 5.2 `src/ui/hud/ActionRail/ActionRail.module.css` and the TopBar styles: the phone instruction bar at 15 px, `padding: 2px 8px`, caps at the bar's height, `margin-inline: 0`, at most 40 px with its buttons; icon-only undo and camera buttons on the phone with `aria-label`.
- [x] 5.3 Drive at 852×393 with Playwright (`pnpm dev --port 5174`, screenshots under `.playwright-mcp/`): measure the instruction bar's height, every bar button's hit box (at least 44 px), and that a location stays framed above the bar.

## 6. Wizard on the phone

- [x] 6.1 `styles.css` wizard base and `NewGame.module.css`: under `.screen.phone` the one-row 40 px head (h1 20 px, dots inline), `.wz-hint` hidden, `.wz-foot` sticky at 48 px with the safe-area padding, tiles in three columns.
- [x] 6.2 `NewGame.tsx` `CampaignStep` and `InvestigatorsStep`: on the phone wrap the filter row in a disclosure behind a "Filter (n)" chip with local `filtersOpen` state; `n` counts filters not at "all" / empty. Test that the chip shows the count and toggles the row, and that the desktop still shows the row open.
- [x] 6.3 `CampaignStep` and `InvestigatorsStep`: on the phone render no sidebar; each tile gets a 44 px details control that sets the existing `sheet` state, rendered into a `BottomSheet` with the `CampaignSheet` or the investigator card content; the tile's own tap keeps selecting. Test both steps at phone size: details opens the sheet, the grid stays put after Close, the desktop keeps the sidebar.
- [x] 6.4 `DecksStep` and `DeckEditArea`: on the phone put the avatars and the deck tabs in one horizontal `overflow-x: auto` row with scroll snap; open the card pool through the card modal (`dialog.modal`) with its Close. Test the row renders every tab and that the pool opens as a modal at phone size.
- [x] 6.5 Drive the wizard at 852×393: campaign step with the Filter chip and the three-column grid, the investigator details sheet, the deck row; screenshots under `.playwright-mcp/`.

## 7. Follow-up fixes from the phone review

- [x] 7a.1 Bottom sheet keeps the wizard's paper theme (rendered in place, `portal={false}`); its Close becomes a × icon with a 44 px tap.
- [x] 7a.2 Deck step: the pool layer's Close becomes a × icon; investigator chips and deck tabs restyled as one-line pills.
- [x] 7a.3 Introduction's act and agenda at 88 % of the height with the buttons beside; the act/agenda viewer in one column at 82 % of the height.
- [x] 7a.4 An act or agenda option (Advance act) stands beside the closed left drawer's handle, which glows (`CardOptions` takes `ids` and `className`).
- [x] 7a.5 Ready step on the phone: the case file in two columns (campaign, investigators at 52 px without the class line, first scenario | the bag), fitting the body with four investigators.
- [x] 7a.6 Showcase on the phone: drawn and encounter cards take the height (`showcaseLayout(…, phone)` reserves a side column for the help line, tested), one or two cards at least 85 % of the height.
- [x] 7a.7 Play strip split on the phone as on the desktop: threats in a small top-centre row, assets in the right column; a tap opens `AssetsModal` (new modal kind `{ assets }` in the view store) with every asset large, options over the centre, slots, tokens and an Exhausted mark.
- [x] 7a.8 Phone: the asset column moves to the left edge and the undo and camera dock to the right (camera insets follow, tested); the threat row opens the same full-screen view (`{ threats }` modal kind) with Fight and Evade over each card; strip thumbnails get no hover copy on the phone so a tap reaches the card.
- [x] 7a.9 The encounter card showcase (`Reveal`) uses the phone layout too: the card at the full height, its help line beside it.
- [x] 7a.10 Phone sweep fixes: the resolving card (`resolveBox`, tested) fits between the top bar and the instruction bar instead of running off the bottom; the showcase scrim hides the feed captions behind its help line; How to play, the campaign log and the catalog get a one-line heading and the catalog the wizard's slim padding.
- [x] 7a.11 Polish: the top bar's chaos bag takes the bar's tab lacquer so the dark bag reads; a chosen wizard tile's paperclip is smaller on the phone and stays off the Filter chip; the investigator avatar's class line is translated (`card.faction.*`) instead of the raw class code.

## 8. Review and close

- [x] 8.1 Run `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm check:content`.
- [x] 8.2 Review the phone screens with the `web-design-guidelines` skill for tap size, contrast and focus order; fix findings in the touched components.
- [ ] 8.3 Run `openspec validate phone-ux --type change --strict`, then sync the delta specs (`/opsx:sync`) before archiving.
