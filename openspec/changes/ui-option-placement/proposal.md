## Why

Where each option of the pending choice is offered on screen is decided twice, and the version that is tested is not the one players see. `src/ui/game/optionHome.ts` names 11 homes (`hand`, `board`, `strip`, `avatar`, `invModal`, `rail`, `bar`, `skilltest`, `mulligan`, `phase`, `showcase`), and `optionHome.test.ts` checks over bot playthroughs of three scenarios that every option lands in one. But in production only the action rail and instruction bar (`onRail`, `inBar` in `ActionRail.tsx`) and the investigators' modal (`Investigators.tsx:36`, `"invModal"`) read it. Every other surface keys options by card on its own: `useOptionsByCard()` (map, play strip, scenario panel, hover card, player bar, skill-test screen, assets modal), `useCardOptions(ids)` (card modal, card options, stats, phone drawers), and three hand-written `pending.options.filter/find(o => o.card === id)` (`HandFan.tsx:80`, `Showcase.tsx:90` and `:119`, and `Modals.tsx:73` inside `useCardOptions`). Two more classifiers sit beside them: `investigatorOptions()` (avatar answers versus the decider's own ability) and `deckOptions()` (a lit deck), both in `src/ui/state/players.ts`. An option can therefore be tested as reachable in a home that no surface draws, or be drawn by two surfaces the test doesn't know about. `RAIL_KINDS` and `deckOptions` read `(o.value as { kind?: string }).kind` untyped, although the engine types turn options as `TurnAction` (`src/engine/world/types.ts`).

## What Changes

- **One placement.** A pure `placeOptions(game, looking, mode)` in `src/ui/game/optionHome.ts` returns, for every home, `{ options, byCard }`. Each option has one home and, where the layout calls for it, mirrors: Investigate on the rail and on its location, the turn's Draw on the rail and on the deck, a waiting draw on the deck, and on the phone the rail's and the act's and agenda's options in the bar too (ADR-0005). The homes gain `sheet` (the decider's own investigator ability, today `investigatorOptions().abilities`) and `deck` (today `deckOptions`); `avatar` keeps the answers among investigators.
- **Computed once, behind the gate.** `usePlacement()` memoises it per pending choice, mode and looking, and returns empty homes when `useInputGate()` (from `ui-input-gate`) is closed. Each surface reads its slice: `usePlaced("hand").byCard`, `usePlaced("rail").options`.
- **Surfaces stop keying options themselves.** `useOptionsByCard`, `useCardOptions`, the three hand-written filters, `onRail`, `inBar`, `investigatorOptions` and `deckOptions` are replaced by slices of the placement; `optionOwner` stays as the invModal's grouping.
- **Typed turn actions.** Rail kinds are read through a narrowing helper over the engine's `TurnAction` when `pending.kind === "turn"`, not an untyped `value.kind`.
- **The test checks what is drawn.** `optionHome.test.ts` asserts, over the same bot playthroughs and in both layout modes, that every pending option has at least one home the mode renders, and that a card's option is in exactly one card-keyed home (so a card never carries two copies of one option).
- No visible change intended: the placement reproduces today's surfaces, and the test pins them.

Assumed (to confirm with the user in grill-me):

- This change follows `ui-input-gate` and uses its hook; it does not recompute "can answer now".
- Mirrors are explicit and few (the four above); anything else is a single home. A new mirror is a design decision, not a surface's local filter.
- The card detail modal and the hover card show the options of the card they show, whatever its home; they read `byCard` across all card homes rather than having a home of their own.
- The skill-test screen's commit logic in `src/ui/game/testScreen.ts` (`un:` options, `done`) stays as it is; it reads the `skilltest` and `hand` slices.
- "Rendered in this mode" is a static table per mode (the phone renders no `rail`; the desktop renders no bar copies of strip options), not whether a drawer happens to be open.

## Open questions

1. Should the card modal and hover card offer a card's options (today they do) or only show the card, leaving the options to the card's home?
2. Are the phone's two places for the act's options (the bar and the button beside the drawer handle) both wanted, or should one go?
3. Should the engine give options a typed `value` (a discriminated union per choice kind) so the UI never narrows, or is narrowing on `pending.kind` enough for now?
4. Should the `phase` and `mulligan` homes stay homes, or become the pending kinds their surfaces read directly?

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: "Prompts and choices" states that every option has one home drawn in the current layout mode (with the listed mirrors), and that a card never offers the same option twice.

## Impact

- `src/ui/game/optionHome.ts` (`placeOptions`, homes `sheet` and `deck`, typed rail kinds), `optionHome.test.ts` (both modes, at least one rendered home, one card home).
- New hook `usePlacement` / `usePlaced` in `src/ui/game/cardClick.ts` (which keeps `useCardClick`, reading the placement).
- `src/ui/state/players.ts`: `investigatorOptions` and `deckOptions` become slices of the placement; `abilityOptionsOf` reads `sheet`.
- Surfaces: `Table.tsx`, `PlayStrip.tsx`, `ScenarioPanel.tsx`, `HoverCard.tsx`, `PlayerBar.tsx`, `SkillTestScreen.tsx`, `AssetsModal.tsx`, `Modals.tsx`, `CardOptions.tsx`, `Stats.tsx`, `Investigators.tsx`, `HandFan.tsx`, `Showcase.tsx`, `MulliganRow.tsx`, `ActionRail.tsx`, `PileColumn.tsx`, `Hud.tsx` (`PhoneDrawers`).
- `src/ui/game/showcase.ts` and `spotlight.ts` keep calling `deckPick`.
- Depends on `ui-input-gate`. New ADR-0031.
