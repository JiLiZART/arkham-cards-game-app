## Context

The skill-test screen (`src/ui/hud/SkillTestScreen.tsx`) opens over the dimmed table when a test's commit window opens and stays through the chaos draw (`TokenDraw.tsx`) and the result. App sets `.game.testing` from `useView().testing`. The play strip (`PlayStrip` in `src/ui/hud/Panels.tsx`) is fixed above the hand (`bottom: 228px`, `300px` while testing, so the calculation strip fits under it) at z-index 52, above the screen, so an in-play fast ability can be used during the commit window. Its card width comes from `stripCardWidth` (124 px, down to 84 px when the row is full), set inline as `--sw`; each card's options come from `useCardClick().byCard` and sit above it as buttons.

The subject column (`.st-middle`) starts 140 px from the top; the subject is 240×336; the draw stage (`.st-stage`) reaches 60 px below it, and the discs rest inside it. At 900 px tall the subject's lower edge is at 535 px and the stage's at 557 px, while the strip, with 124 px cards and a 34 px button, starts at about 392 px. The strip's slots take pointer events even when dimmed, so the discs under them can't be tapped.

The engine offers in-play abilities during a test only in the commit window (`src/engine/rules/skillTest.ts:128`, fast abilities that modify the test or run a script). During the draw and the result no prompt is open, so nothing on the strip can be chosen.

In-force ADRs: 0001 to 0013. ADR-0004 (viewing is view state, deciding is game state) and ADR-0005 (one layout mode read by components) apply; ADR-0002 (presentation follows the animation clock) is unaffected.

## Goals / Non-Goals

**Goals:** the strip never covers a disc or the subject card; an in-play ability stays usable in the commit window; the subject keeps 240×336 at 1080p and fits above the compact strip at 1600×900.

**Non-Goals:** moving the strip to a column on the desktop (considered and declined, see Decisions); changing which abilities the engine offers during a test; the phone's strip column, beyond stepping aside by the same rule.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
  engine (pure)                  store / view                          hud (React)
  +-------------------+         +-----------------------+         +----------------------------------+
  | skillTest.ts      | pending | useGame: game.pending |  byCard | PlayStrip (Panels.tsx)            |
  | commit window:    |-------->| useCardClick().byCard |-------->|   mode = stripDuringTest(        |
  |  fast abilities   |         | useView: testing      |-------->|     testing, shown ids, byCard)  |
  |  as options       |         +-----------------------+         |   "normal" | "compact" | "aside" |
  +-------------------+                                           |   --sw: 84 when compact           |
                                                                  |   class "aside": slide + fade,    |
                                                                  |   no pointer                      |
                                                                  +----------------------------------+
                                                                  | SkillTestScreen / .st-middle      |
                                                                  |   subject size and top from the   |
                                                                  |   window height (styles.css)      |
                                                                  +----------------------------------+
```

## Decisions

1. **One rule: during a test the strip is shown only when one of its cards has an option.** A pure helper in `src/ui/hud/Panels.tsx` (or beside `testScreen.ts`), `stripDuringTest(testing, ids, byCard): "normal" | "compact" | "aside"`: not testing → `normal`; testing and some strip card has an option in `byCard` → `compact`; testing otherwise → `aside`. It needs no knowledge of draw stages: during the draw and the result there is no pending choice, so `byCard` is empty and the strip is aside; in a commit window with Physical Training offered, it is compact. *Why:* the strip's only purpose during a test is that ability; the rule follows the engine's offer instead of the screen's animation states, so it can't drift from them. *Alternative:* a class keyed to the draw stage only: rejected, the commit window with nothing to use would still cover the subject.

2. **Stepping aside keeps the strip mounted.** `aside` adds a class: `translate: 0 120%`, `opacity: 0`, `pointer-events: none` on the strip and its children, with a 0.2 s transition (none under reduced motion). The cards keep their remembered rects for fly-in and fly-out, and the strip comes back without re-animating its cards. *Alternative:* unmounting: rejected, a card leaving play during the test would have nothing to fly from.

3. **Compact is the strip's minimum card width.** In `compact` the width passed as `--sw` is `STRIP_MIN_W` (84 px) instead of `stripCardWidth`'s result. The strip stays at `bottom: 300px`; its top, with one option button, is about 158 px above that.

4. **The subject follows the window's height.** In `styles.css` (desktop rules only): `.st-middle` top `--st-top: clamp(96px, calc((100vh - 900px) * 0.44 + 96px), 140px)`; `.st-center` height `--st-h: clamp(200px, calc(100vh - 554px - var(--st-top)), 336px)`, width 5/7 of it; `.st-placed` top is `--st-top + 56px`. The numbers come from the compact strip: its cards 118 px tall at 300 px from the bottom, and above them two stacked ability buttons (61 px) with a 6 px gap and a 10 px margin, so the buttons start at `100vh - 495px`, and the subject's lower edge (`--st-top` + 58.6 for the line, gap and margin, + `--st-h`) is kept at or above that. At 1080 and above: 140 px and 240×336, as now; at 900: 96 px and 179×250. *Why:* CSS alone, read by the one layout mode (ADR-0005). Found in the browser: Physical Training offers two abilities (+1 willpower, +1 combat), so one button's height was not enough. *Alternative:* shrinking the strip further: rejected, 84 px is the strip's readable minimum.

5. **The phone steps aside by the same rule.** Its right-edge column (`.play-strip.column`) already sits clear of the centre; the `aside` class applies to it too, so the column doesn't sit over the token area on a narrow screen.

6. **Declined: a desktop column during the test.** A column on the right would meet the pile dock (160 px at the right edge) and the placed cards on a 1280 px wide window, and switching row to column at every test would fly the cards across the screen. The user chose the step-aside approach.

## Risks / Trade-offs

- [An ability offered during the draw in a future change would bring the strip back over the discs] → the rule then shows it compact, which is the intent; the browser check at 1600×900 covers the draw with the strip aside, and a test asserts `aside` when `byCard` is empty.
- [Below about 850 px tall the subject stops shrinking at 200 px and a compact strip with two buttons can still meet it] → only while an ability is offered in the commit window; recorded here; the discs are never affected (the strip is aside during the draw). A card offering three or more abilities would also need more room.
- [The player may not notice the strip went away] → it slides down rather than vanishing, and returns the same way when the screen closes.

## Migration Plan

UI only; no save or content change. Rollback: revert.

## Open Questions

None.
