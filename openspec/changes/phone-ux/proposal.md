## Why

The phone layout (ADR-0005) makes the table playable on a phone held sideways, but the screens around it were sized for a desktop and only shrunk: the wizard's header, filters and footer leave almost no room for the campaign tiles on a 393 px tall screen, the investigator and deck steps need scrolling past the sidebar to reach the picks, the title menu and the instruction bar take more of the short screen than they earn, and the investigator sheet opened from the top-bar avatar is a 420 px fixed popover anchored under the avatar, so its lower half is off screen. There is no way to drop the browser chrome, which costs another 60 to 100 px. Two table defaults ("Tap decks to draw", "Draw chaos tokens by hand") also ask for taps a phone player doesn't want.

## What Changes

- **Fullscreen.** A fullscreen toggle on the title screen and in the game's top bar, shown only where the Fullscreen API works on the page. The first time the phone layout is in force, a one-line ask to enter fullscreen, dismissable and remembered; on iPhone (no Fullscreen API) the ask instead hints "Add to Home Screen" once.
- **Dense phone controls.** On the phone layout every control keeps a 44 px tap target but its visuals shrink: 13 to 14 px labels, tighter padding, icons where the label is known. Covers the title menu, the rail and bar buttons, the undo and camera buttons, the wizard's chips, tiles and footer, and the settings screen.
- **Compact instruction bar.** On the phone the instruction bar drops to a 15 px line with smaller end caps and no outer margin, so the hand drawer's peek and the map keep their height.
- **Wizard on the phone.** Title and step dots on one 40 px row, the hint dropped; filters behind a single "Filter" chip that expands the row; a 48 px sticky footer holding Back and Continue; tiles in a three-column grid; the campaign sheet and the investigator card open as a bottom sheet instead of a sidebar; the deck step puts the avatars and the deck tabs on one horizontal scroll row and opens the card pool full-screen.
- **Investigator sheet as a bottom sheet.** On the phone the sheet opened from a top-bar avatar is a bottom sheet (about 70 % of the height, a drag handle, scrolls inside, closed by a tap on the scrim, a swipe down or Close) instead of the anchored popover. Desktop keeps the hover popover.
- **Defaults.** "Tap decks to draw" and "Draw chaos tokens by hand" start off. Saved settings keep whatever they hold. **BREAKING** for the spec only: the existing requirement said "on by default".

## Capabilities

### New Capabilities

- `fullscreen`: the fullscreen toggle, where it appears, feature detection, and the one-time ask (with the iPhone fallback hint).
- `bottom-sheet`: the phone bottom sheet used for details panes (investigator sheet, the wizard's campaign sheet and investigator card): its size, scrolling, and how it closes.

### Modified Capabilities

- `game-table-ui`: the Phone layout mode requirement grows the dense-control and compact-instruction-bar rules; the Player bar's touch behaviour opens a bottom sheet on the phone; the New game wizard gains its phone shape (one-row head, filter toggle, sticky footer, three-column tiles, horizontal deck row, full-screen pool); the Tap decks to draw setting is off by default; the Title screen and settings requirement states the draw-by-hand default and the phone title menu's density.

## Impact

- `src/ui/menu/Title`, `NewGame`, `Settings`, `CampaignSheet`, `DeckEditArea`: phone variants of the existing components (classes under `.game.phone` / `.screen.phone`, read through `useLayoutMode()`), no new screens.
- `src/ui/hud/PlayerBar`: the Sheet renders into a `BottomSheet` on the phone; `src/ui/hud/Hud` (TopBar) and `ActionRail`: denser phone sizes, the fullscreen button in the bar.
- New shared components: `src/ui/components/BottomSheet`, `src/ui/components/FullscreenButton` (plus a small `fullscreen.ts` helper in `src/ui/state/`).
- `src/ui/state/store.ts`: the two defaults; `src/ui/state/layoutMode.ts` unchanged (the breakpoint stays).
- `src/ui/styles.css`: the `.game.phone` section and the wizard base rules; `PHONE_INSETS.bottom` shrinks with the instruction bar (the camera frames more map).
- `content/i18n/{en,ru}/ui.json`: fullscreen, add-to-home-screen, Filter, Close, bottom-sheet labels.
- Specs: `openspec/specs/game-table-ui` deltas; new `fullscreen` and `bottom-sheet` specs. No engine change, no content change, no new dependency (the Fullscreen API is native).
