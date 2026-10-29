## 1. Which views are shared

- [x] 1.1 `sharedView(game, modal)` in `src/ui/game/`: true for `{ deck }`, and for `{ card }` whose instance exists with no owner. Tests first: act/agenda/reference, an enemy, a location, a hand card, an asset in play, an investigator card, an unknown id, `{ bag }`, `{ inv }`.

## 2. Session

- [x] 2.1 `Wire` gains `{ t: "show"; m }`. `Session.show(m)` sends it to every other online player; a received one calls the new `onShow(name, m)` dependency with the sender's roster name. Session tests: shown over the data channel, and through the room with no link.

## 3. View and wiring

- [x] 3.1 View store: `shownBy: string | null`; `setModal` clears it; `showFrom(name, m)` opens `m` with `shownBy` set only when no modal, menu, move drag or scenario intro is up (a shown view may replace a shown view). Tests.
- [x] 3.2 `connect.ts`: send `show` when this browser opens a shared view itself (not one it was shown); `onShow` opens it through `showFrom` when `sharedView` holds on this browser's game.
- [x] 3.3 `CardModal` and `DeckViewer`: "{name} is showing" when `shownBy` is set; `net.showing` in EN and RU.

## 4. Verification

- [x] 4.1 Two browsers on the local Worker: the agenda and an enemy open on the other screen with the label; a hand card does not; closing one copy leaves the other; with a direct link and with the relay-only setup. Screenshots under `.playwright-mcp/net-shared-card-view/`.
- [x] 4.2 `pnpm typecheck`, lint, tests, `openspec validate net-shared-card-view --type change --strict`.
