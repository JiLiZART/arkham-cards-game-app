## Context

`GameSetup.pacePhases` is copied onto the state and `flow.ts` inserts a `PhasePause` step whose handler `ask`s a one-option choice; the bot answers it. `Draw` (`investigators.ts`, n cards, re-pushed one at a time) and `DrawEncounter` (`scenario.ts`) perform draws at once. The rail's Draw is a turn action `{ kind: "draw" }` with no card. `Pile` in `Panels.tsx` is a button that opens the top card; `.legal` highlighting exists for cards with pending options; the choice spotlight dims everything not an option. The phone layout keeps the piles in the left drawer.

## Goals / Non-Goals

**Goals:** every in-play draw is a tap on a lit deck when the setting is on; replay-safe; phone usable without opening the drawer.

**Non-Goals:** choosing which card to draw; animating the deck itself (the drawn card's flight to the showcase stays).

## Decisions

1. **Setup flag** `tapDecks`, stored on `GameState` like `pacePhases`, set by the store from the setting on `startScenario`.
2. **Engine:** `Draw` and `DrawEncounter` handlers begin with `if (g.s.tapDecks && g.s.phase !== "setup" && !step.tapped) { const t = ask(g, step, step.inv, "draw", "Draw", [{ id: "draw", label: "Draw", value: "draw" }], { key: "tapDeck", vars: { deck, n } }); if (t === undefined) return; }`. `Draw` with n > 1 pushes its continuation with `tapped: true` so one tap covers the whole effect; Surge pushes a fresh `DrawEncounter` (a second tap, as a second draw). Setup draws run while `phase === "setup"` and the mulligan redraw is its own step, both untouched. The bot chooses the only option. The new pending kind `draw` joins the union; `holdsForTap`/pacing unaffected.
3. **UI routing:** `investigatorOptions`-style helper `deckOptions(game)` returns the option for the player deck (a pending `draw` for the viewer's own deck, or the turn action `{kind:"draw"}`) and for the encounter deck. `Pile` takes `option` and renders `legal` + `onClick: choose`; the existing pile modal click stays for face-up piles. The spotlight treats the lit deck as the option (its `data-pile`). Instruction strings `instruction.tapDeck.player` / `.encounter` in both languages; the bar's primary button is the same option on the phone. The left drawer handle gets `glow` while `deckOptions` has a waiting draw (not for the plain Draw action, which would glow all turn).
4. **Tests:** engine tests for the four scenarios (paced upkeep, mythos in turn, two cards one tap, old save replay); a UI test for `deckOptions`; the drive scripts' `settle()` taps the lit pile when a draw waits.

## Risks / Trade-offs

- [More taps per round] → the setting turns it off; the mythos draw was already a stop (the showcase) so the extra tap is where the eye is.
- [A waiting draw for an investigator not on screen] → the decision belongs to them, so the table switches as for any decision of their own (see `avatar-handoff`).

## Migration Plan

Old saves replay unchanged (no flag). New games read the setting.

## Open Questions

None.
