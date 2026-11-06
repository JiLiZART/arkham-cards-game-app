## Context

The engine sets `state.pending` and the store plays the animated events of each dispatch through `current` and `queue` (ADR-0002). Viewing is view state, deciding is game state (ADR-0004): `useView` holds `viewing`, `mySeats`, `intro`, `showcase` (drawn cards waiting) and `stage` (who holds the middle of the screen, as string claims such as `test:<id>`, `pause:<seq>`, `title:<key>`, `showcase`). Whether the player may answer the choice is computed in each surface from a subset of these, and again in `choose()`:

| Where                                                                  | busy                                        | offered (`choicesOffered`) | intro | showcase      | stage                 | seat         |
| ---------------------------------------------------------------------- | ------------------------------------------- | -------------------------- | ----- | ------------- | --------------------- | ------------ |
| `choose()` (`store.ts:666`)                                            | yes                                         | no                         | yes   | yes           | no                    | online only  |
| `useOptionsByCard` (map, strip, player bar, test screen, assets modal) | yes                                         | yes                        | no    | no            | no                    | via offered  |
| `useCardOptions` (`Modals.tsx`, phone drawers)                         | yes                                         | yes                        | no    | no            | no                    | via offered  |
| `useHand` (`HandFan.tsx`)                                              | yes                                         | yes                        | no    | no            | no                    | via offered  |
| `InstructionBar`                                                       | yes, plus caption, held, `kind === "phase"` | via `barAsk`               | no    | no            | via caption           | via `barAsk` |
| `ActionRail`                                                           | dims only                                   | yes                        | no    | no            | no                    | via offered  |
| `Showcase` deck pick                                                   | yes                                         | no                         | yes   | yes (its own) | its own claim         | no           |
| `MulliganRow`                                                          | yes                                         | no                         | no    | no            | no                    | no           |
| `InvestigatorChoiceOverlay`                                            | yes                                         | yes                        | yes   | yes           | `test:`/`pause:` only | via offered  |
| `PileColumn` decks                                                     | no                                          | yes                        | no    | no            | no                    | via offered  |

Every row that says "no" where `choose` says "yes" is a lit card or button whose click is dropped; every row that says "yes" where `choose` says "no" is a click `choose` would take that no surface offers.

## Goals / Non-Goals

**Goals:**

- One pure function decides whether the pending choice can be answered, and says why not.
- `choose()` and every surface that offers options use it, so they cannot disagree.
- A table-driven vitest in Node covers every reason.

**Non-Goals:**

- Where each option is drawn (`ui-option-placement`).
- The event clock and typed stage claims (`ui-event-conductor`); this change reads the claims as they are.
- Timing consumers of "events are playing" that are not input: `AutoSwitch`, `ScenarioEnd`, `TipLayer`, `SoundLayer`, `captionIndex`.
- `undo()` and `cancelTest()` (open question).

## Decisions

### 1. Before and after (component view of the UI container)

Before:

```
  +-----------------------+        +--------------------------+
  | game store (useGame)  |        | view store (useView)     |
  | game.pending          |        | intro, showcase, stage,  |
  | current, queue        |        | viewing, mySeats         |
  | choose() ------------------+   +--------------------------+
  |  own copy: queue,     |    |      ^  reached via getState()
  |  current, intro,      |    +------+
  |  showcase, mySeats    |
  +-----------------------+
     ^ ^ ^ ^ ^ ^ ^ ^ ^ ^      each surface subscribes and composes its own test
     | | | | | | | | | |
  HandFan  Map/useOptionsByCard  Modals  ActionRail  InstructionBar  Showcase
  MulliganRow  InvestigatorChoice  PileColumn  PhoneDrawers
     (10 copies of busy + a different mix of extras each)
```

After:

```
  +-----------------------+        +--------------------------+
  | game store            |        | view store               |
  +-----------+-----------+        +------------+-------------+
              |  pending, current, queue        |  intro, showcase, stage, viewing, mySeats
              v                                 v
           +-------------------------------------------+
           | inputGate(input)  src/ui/state/inputGate  |   pure, Node-tested
           | -> { open: true }                         |
           |  | { open: false, why }                   |
           +-----------+-----------------------+-------+
                       |                       |
            useInputGate() hook          choose() calls it with
                       |                 get() + useView.getState()
                       v
  HandFan, map, strip, player bar, test screen, modals, rail, bar,
  showcase, mulligan row, investigator choice, piles, phone drawers
```

- The function takes a plain record, not the stores, so the test builds inputs directly and the store and the hook pass the same shape.
- `choicesOffered()` and `holdsSeat()` in `players.ts` stay as helpers the gate calls; `useChoicesOffered()` callers move to `useInputGate().open`.

### 2. The verdict

```ts
type GateReason =
  | "noChoice"
  | "animating"
  | "intro"
  | "showcase"
  | "middle"
  | "notYourSeat"
  | "notShown";
type Gate = { open: true } | { open: false; why: GateReason };
interface GateInput {
  pending: PendingChoice | null;
  playing: boolean; // current !== null || queue.length > 0
  intro: boolean;
  showcase: number; // drawn cards waiting
  stage: readonly string[]; // claims holding the middle
  looking: Looking; // viewing, mySeats
  game: GameState; // for shownInv / viewerOf
}
```

Reasons are checked in that order, so the first one that applies is reported: no choice, then anything on the event clock, then what holds the screen, then whose decision it is. `middle` is "a stage claim other than the skill-test screen's or the phase pause's", the rule `InvestigatorChoiceOverlay` and `AutoSwitch` already apply. A Tap-paced event waiting for Next is the playing event, so it is `animating`; `useHeld` stays for the caption's Next button only.

- Rejected: a per-option gate (`canChoose(option)`). Nothing today depends on the option, and placement (which surface shows it) is a separate question.
- Rejected: a boolean. Surfaces need the reason to choose a look (the rail dims on `animating`, the bar hides; the bar shows "waiting for…" on `notYourSeat`), and tests read better with it.

### 3. `choose()` uses it

`choose(optionId)` builds the same input from `get()` and `useView.getState()`, returns when the gate is closed, and otherwise proposes the move (online) or answers (local). The inline `mySeats` check becomes the gate's `notYourSeat`. The store already reads the view store this way (`intro` in `undo`, `cancelTest`); no new dependency direction.

### 4. Surfaces

Each surface replaces its `busy` and extras with `const gate = useInputGate()`, keeps its own rendering rule, and offers nothing when `!gate.open`. The showcase still claims the stage before it draws a deck pick (One thing at a time); the gate does not draw anything. `useOptionsByCard()` returns an empty map when the gate is closed; `ui-option-placement` later moves that keying behind the gate too.

## Risks / Trade-offs

- [Cards no longer light during phase titles and the encounter reveal, where today a click on a lit card was dropped anyway or, for a hand card, taken by `choose`] -> scenario tests over the bot playthroughs check that every choice is still answered once the clock and the stage are free; browser pass over a full round.
- [A `choose` made by code (the investigator choice overlay's auto-pick, the dev panel) while the gate is closed is now dropped] -> the auto-pick already waits for `choicesOffered && !busy && free`, the same rule; `autoStep` (the debug bot) and replays dispatch directly, not through `choose`, so they don't pass the gate.
- [`stage` as strings until `ui-event-conductor` lands] -> one function reads them, so the switch to typed claims is one edit.

## Migration Plan

No saved data changes. Land the function and its test, switch `choose`, then the surfaces one at a time; each step leaves the app working. Rollback is a revert.

## Open Questions

- Should `notShown` close `choose` in hot-seat play, or only hide options?
- Should `middle` block card clicks, or only animating, intro and showcase, as `choose` does today?
- Should the action rail hide like the bar while events play?
- Should `undo()` and `cancelTest()` use the gate?

No in-force ADR needs revisiting: the gate is how ADR-0002 (input waits for the animation clock) and ADR-0004 (viewing is view state; the decision is the engine's) are applied in one place.
