## Context

Reproduced through the store with two players, private hands, tokens by hand: Crypt Chill on top of the encounter deck, a Ghoul engaged with Roland, Roland holding Guts. In the mythos phase, after the card is tapped in the showcase, the state is: pending `01001:commit`, `skillTest 01001:willpower`, nothing playing, the stage held by `test:1`, and the instruction bar absent. `InstructionBar` returns null when `useCaption()` is not null; `captionIndex(log, current, queue, shown, stageBusy, pendingKind)` returns the step's index when nothing plays but `stageBusy` is true and the pending kind isn't `phase`. `stageBusy` is `stage.length > 0`, and the test screen holds the stage for the whole test. So the caption "Roland Banks draws an encounter card" sits where Done should be. Cards can still be committed (the fan is live), but the window can't close. In the investigation phase there is no step, so the earlier treachery fix worked there. The engaged Ghoul in the strip is incidental.

The `stageBusy` rule exists for the hand showcase: after an upkeep draw the showcase holds the middle with the next choice pending and the caption should stay (feed.test.ts covers it).

The test screen's `.st-middle` is `left: 470px; right: 660px` (room for the placed cards on the right), so its centre is 95 px left of the screen's at 1600 px, while `.st-strip` is at `left: 50%`.

The Debug panel already has Download action log and Load action log (file based); `exportLog`/`importLog` in the store do the work.

In-force ADRs: 0001–0006; ADR-0002 (presentation follows the clock) and ADR-0004 (viewing is view state) are respected: the fix is a presentation rule, the report reads view state and never writes it into the game.

## Goals / Non-Goals

**Goals:**

- Done reachable in every commit window, in every phase.
- The line and the strip on one axis.
- A one-tap report the player can paste into a message, and a paste box that recreates the table from it.

**Non-Goals:**

- Changing when captions show during events, or the showcase rule.
- A bug-report backend; the report is clipboard text.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
 view.ts stage ──► StepCaption.useCaption ──► feed.captionIndex(log, current, queue, shown, stageBusy, pendingKind)
   ["test:1"]        stageBusy = captionStageBusy(stage)   = stage.some(k => !k.startsWith("test:"))   → null here
                                                              └─ InstructionBar shows (Done)
 store.ts  exportReport() = { version, app, setup, actions, campaign, settings, view, pending } ──► DebugPanel Copy report
           importReport(json) = importLog(json) + settings ◄────────────────────────────────── DebugPanel Paste report… / Load
 styles.css .st-middle { left: 50%; translate: -50% 0; width: 440px }   (line centred, same axis as .st-strip)
```

## Decisions

### 1. Only the test screen's hold is transparent to the caption

`captionStageBusy(stage: string[])` in `feed.ts`: true when any stage key doesn't start with `test:`. `useCaption` passes that instead of `stage.length > 0`. The showcase (`showcase`), titles, pauses and held events keep the caption as before; the test screen, which is the player's interaction surface, does not. Alternative rejected: making `InstructionBar` win over the caption whenever a choice is pending; it would also show buttons under the hand showcase after an upkeep draw, where the spec wants the caption.

### 2. Centre the line with a transform

`.st-middle { left: 50%; right: auto; width: 440px; translate: -50% 0; }` keeps the column's top and bottom and centres it on the screen like the strip. The draw stage's own layout is untouched. At 1280 px the placed cards (right: 360 px, 290 px wide) start at 630 px, inside the column's right edge (860 px); the line is a 220 px pill in the middle, so no overlap in practice; verified at 1280 and 1600.

### 3. The report is the replay log plus context

`exportReport()` in `store.ts` returns `JSON.stringify({ version: ENGINE_VERSION, app: <package version>, setup, actions, campaign, settings: { locale, privacy, drawByHand, pace }, view: { viewing }, pending: game.pending && { inv, kind, prompt } })`. `importReport(json)` applies the settings then `importLog` (which already tolerates an unknown campaign). The DebugPanel's Copy report uses `navigator.clipboard.writeText`, and on rejection fills the panel's text box with the report and selects it. Paste report… toggles a textarea with a Load button calling `importReport`, errors shown in the panel (no `alert`). The app version comes from `import.meta.env.VITE_APP_VERSION ?? "dev"` with `define` in `vite.config.ts` reading `package.json` (one line), so a pasted report says which build it came from.

## Risks / Trade-offs

- [Other stage keys that are interaction surfaces] → today only `test:` is one; the encounter showcase runs while an event plays (the caption is right there); if a future overlay needs the same, it joins the predicate.
- [The report can be large (actions)] → it is the same as the downloaded log; a few hundred KB at most.
- [Clipboard on an insecure origin] → the fallback text box.

## Migration Plan

Code only; rollback is a revert.

## Open Questions

- None.
