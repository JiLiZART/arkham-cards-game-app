## Why

Whether the player may answer the pending choice right now is decided in a dozen places that disagree. The "busy" test `!!s.current || s.queue.length > 0` is written out 11 times: 10 in components and hooks (`cardClick.ts:10`, `Modals.tsx:70`, `HandFan.tsx:64`, `InvestigatorChoice.tsx:27`, `ActionRail.tsx:195` and `:290`, `Showcase.tsx:31`, `MulliganRow.tsx:41`, `Hud.tsx:312` and `:672`) and once in `feed.ts:273` (`captionIndex`); `PileColumn.tsx:106` lights the decks on `useChoicesOffered()` alone, with no busy test at all. Each adds its own extras: `useChoicesOffered()`, `useCaption() !== null`, `useHeld()`, `pending.kind === "phase"`, `!intro`, `showcase.length === 0`, or "the stage holds only `test:` and `pause:` claims". `choose()` in `src/ui/state/store.ts:666-676` keeps yet another copy (queue, current, `v.intro`, `v.showcase`, and `mySeats` online) by reaching into `useView.getState()`. They don't match: `useOptionsByCard()` (the map, the play strip, the player bar, the skill-test screen, the assets modal) checks only busy and `choicesOffered`, so while drawn cards wait in the showcase or the scenario introduction is up, cards light as clickable and `choose` drops the click. In hot-seat play `choose` never checks whose table is on screen, which every surface does. The recent "fix: action bar" commit is one more patch of one copy.

## What Changes

- **One input gate.** A pure function `inputGate(input)` in `src/ui/state/inputGate.ts` returns `{ open: true }` or `{ open: false, why }`, with `why` one of `noChoice`, `animating`, `intro`, `showcase`, `middle` (the middle of the screen is held by something other than the skill-test screen or the phase pause), `notYourSeat` (online: the decider sits at another device) and `notShown` (another investigator's table is on screen). Its input is plain data: the pending choice, the event player's `current` and `queue`, and the view's `intro`, `showcase`, `stage`, `viewing` and `mySeats`.
- **One hook.** `useInputGate()` in `src/ui/state/` reads the two stores once and returns the verdict. Every surface that offers options (hand fan, map, play strip, player bar, skill-test screen, modals, showcase, mulligan row, action rail, instruction bar, investigator choice overlay) asks it instead of composing its own test.
- **`choose()` asks the same function.** The store calls `inputGate` with its own state and the view's, and drops the call exactly when no surface would have offered the option. Online, only the gate's `notYourSeat` branch replaces the inline `mySeats` check.
- Behaviour change, small and intended: cards no longer light while the showcase or the introduction is up, or while a phase title holds the middle; in hot-seat play a `choose` call while another investigator's table is on screen is dropped (no surface offers one today, so nothing visible changes).
- Out of scope: `undo()` and `cancelTest()` keep their own checks; the auto-switch and step caption keep their timing rules (they are not choices).

Assumed (to confirm with the user in grill-me):

- The gate is one verdict for the whole choice, not per option or per surface. Surfaces that need the middle (the showcase's deck pick) still claim the stage themselves; the gate only says the choice can be answered.
- The Tap pace's "held" event (`useHeld`) needs no reason of its own: an event held for Next is the playing event, so the gate already says `animating`.
- The action rail keeps drawing its buttons dimmed while `why === "animating"` (as today), and every other surface hides its options; the gate gives the reason so a surface can choose its look, never whether a click counts.
- The pure function lives in `src/ui/state/` beside `choicesOffered()` in `players.ts`, which it absorbs; `useChoicesOffered()` becomes a thin alias or goes.
- The stage test reads the claims as strings today (`test:`, `pause:`); when `ui-event-conductor` lands its typed stage claims, the gate reads those instead. This change does not wait for it.

## Open questions

1. In hot-seat play, should `choose` refuse an answer while another investigator's table is on screen (the gate's `notShown`), or should that reason only hide options and the store accept the call?
2. Should a phase title or other hold of the middle (`middle`) block card clicks, as the investigator choice overlay and auto-switch already treat it, or only animating, intro and showcase, as `choose` does today?
3. Should the action rail hide like the instruction bar while events play, so every surface shows the same thing?
4. Should `undo()` and `cancelTest()` also go through the gate (today they check only the introduction)?

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: a new requirement says that a choice is offered on screen exactly when the store will take it, and names the states in which nothing is offered.

## Impact

- New `src/ui/state/inputGate.ts` and `inputGate.test.ts` (table-driven, Node).
- `src/ui/state/store.ts` (`choose`), `src/ui/state/players.ts` and `usePlayers.ts` (`choicesOffered` folds into the gate), `src/ui/game/cardClick.ts` (`useOptionsByCard`).
- The HUD surfaces listed above lose their local `busy` and extras: `Modals.tsx` (`useCardOptions`), `HandFan.tsx` (`useHand`), `InvestigatorChoice.tsx`, `ActionRail.tsx` (`InstructionBar`, `ActionRail`), `Showcase.tsx`, `MulliganRow.tsx`, `PileColumn.tsx`, `Hud.tsx` (`PhoneDrawers`).
- Not changed: `Hud.tsx`'s `AutoSwitch` and `ScenarioEnd`, `TipLayer.tsx`, `SoundLayer.tsx` and `feed.ts`'s `captionIndex` read "events are playing" for timing, not for input; they keep it (the event clock itself belongs to `ui-event-conductor`).
- `ui-option-placement` builds on this gate.
- New ADR-0030.
