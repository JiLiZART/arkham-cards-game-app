## 1. Before starting

- [ ] 1.1 `ui-input-gate` is applied (`useInputGate()` exists and `choose` uses it).
- [ ] 1.2 Settle the proposal's open questions with the user (grill-me) and update proposal, spec and design where an answer differs from the assumption.

## 2. The placement (tests first)

- [ ] 2.1 `optionHome.test.ts`: for each bot playthrough step, run `placeOptions` for `desktop` and `phone`; assert at least one rendered home per option, at most one card-keyed home per option, and that every option in two slices is one of the listed mirrors. Keep the existing zone checks per home. Red until 2.2.
- [ ] 2.2 `turnAction(o, pending)` narrowing over `TurnAction`; `RAIL_KINDS` uses it. Unit test: a turn's Draw, Resource and Investigate are found; a non-turn option with a `kind` field is not.
- [ ] 2.3 `placeOptions(game, looking, mode)` in `src/ui/game/optionHome.ts`: homes from `optionHome`, `avatar`/`sheet` split, `deck`, the mirrors; slices with `byCard`. 2.1 green.
- [ ] 2.4 `usePlacement()` and `usePlaced(home)` in `src/ui/game/cardClick.ts`, memoised on `pending.seq`, mode and `looking`, empty when the gate is closed; `useCardClick` reads the union of card-keyed slices. Test (Node): switching `viewing` changes the slices.

## 3. Surfaces, one at a time

- [ ] 3.1 `Table.tsx`, `PlayStrip.tsx`, `AssetsModal.tsx` read `board`; `ScenarioPanel.tsx` and `PhoneDrawers` read `strip`; `SkillTestScreen.tsx` reads `skilltest` and `hand`.
- [ ] 3.2 `HandFan.tsx` (`useHand.optionsFor`) reads `hand`; `Showcase.tsx` reads `showcase` (pick and `pickable`); `MulliganRow.tsx` reads `mulligan`.
- [ ] 3.3 `PlayerBar.tsx` reads `avatar`; `Stats.tsx` reads `sheet`; `Investigators.tsx` reads `invModal` grouped by `optionOwner`; `PileColumn.tsx` and `PhoneDrawers` read `deck`.
- [ ] 3.4 `ActionRail` reads `rail`, `InstructionBar` reads `bar`; the card modal, `CardOptions.tsx` and `HoverCard.tsx` read the card-keyed union.
- [ ] 3.5 Delete `useOptionsByCard`, `useCardOptions`, `onRail`, `inBar`, `investigatorOptions`, `deckOptions` (and `abilityOptionsOf` if unused); `rg "options\.(filter|find|some)\(\(o\) => o\.card" src/ui` finds nothing outside `optionHome.ts`.

## 4. Verification

- [ ] 4.1 Browser pass, desktop (1600×900) and phone (852×393), own dev server on port 5174 with Playwright, screenshots under `.playwright-mcp/`: a turn (rail or bar, Investigate on the location), playing a hand card, a commit, an encounter enemy fought from the strip, a deck search in the showcase, the act advanced from the panel and from the phone bar, a choice of an asset another investigator controls (offered in their modal).
- [ ] 4.2 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format` (on the files this change touches only), `openspec validate ui-option-placement --type change --strict`.
