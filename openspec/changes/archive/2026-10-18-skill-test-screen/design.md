## Context

- The engine runs a test as `Test` steps: `commit` (one `commit` / `commitOther` prompt per investigator at the location, options: `commit:<card>`, `un:<card>`, fast abilities on in-play cards, `done`), then `reveal` (a `token` event per token, `testResult` with `success`, `total`, `difficulty`), then `apply`. `game.skillTest` holds `inv`, `skill`, `kind`, `source`, `target`, `committed`, `committers`, `tokens`. `testParts(g, t)` gives base, per-card icons, modifiers, total, difficulty.
- The UI today: `SkillTestPanel` (Hud.tsx, top centre) draws the arithmetic and the committed `MiniCard`s with take-back; `TokenDraw.tsx` is a fixed overlay (`.token-draw`) with the subject block, the bag and the circles, claimed on the stage as `event:<logIndex>` by `EventPlayer` for `token` and `testResult` (`CENTER` set); `Breakdown` is the result box; `whenSettled` gates the draw.
- Cards fly between HUD places through `arrivals.ts` (`rememberRect`, `takeLocalMove`, `flyIn`); the fan already sends a committed card to the panel and takes one back from it.
- The choice spotlight dims the fan to the committable cards; the instruction bar carries the prompt and Done; `TipLayer` anchors the test tip to `[data-tip="skilltest"]` and the token tip to `[data-tip="bag"]`; `SoundLayer` plays the rattle and clink from the `token` event and the result from `testResult`.
- In-force ADRs: 0001 (audio assets), 0002 (presentation keys off `view.playing`). 0002 applies: the draw and the result still play when their events start on screen.

## Goals / Non-Goals

**Goals:**

- One overlay for the whole test; the subject, placed cards and strip never move between stages.
- Reuse the pieces that work: the subject block, the circle-to-token flight, `MiniCard`, the fan's commit flight, `testParts`, the settle gate, the event player's pacing.
- The engine untouched.

**Non-Goals:**

- The phone layout of the screen; new test rules; a different multi-token draw.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

Assumptions: lightweight rigor; existing components named as they are in `src/ui/hud`.

```
+-----------------------------------------------------------------------------------+
| Browser app                                                                       |
|                                                                                   |
|   game store ----- game.skillTest, pending (commit / commitOther), queue -------+ |
|       |                                                                         | |
|       | choose(commit | un: | ability | done)                                   v |
|  +----+-----------+     flights      +------------------------------------------+ |
|  | HandFan        |<---------------->| SkillTestScreen  (claims stage test:<id>)| |
|  | (live, dimmed  |  commit / back   |  Subject | Middle | Placed  | CalcStrip |  | |
|  |  by spotlight) |                  |          |  stage  |  cards  |           |  | |
|  +----------------+                  |          |  area   |         |           |  | |
|                                      +---+------+----+----+---------+-----------+ |
|  +----------------+                      |           |                            |
|  | PlayStrip      | above overlay,       |           v                            |
|  | (usable cards  | dimmed to usable     |   +-------------------+                |
|  |  bright)       |                      |   | DrawStage         |  token event   |
|  +----------------+                      |   | bag, spill, flip, |<-- EventPlayer |
|                                          |   | slide to strip    |   (view.playing)|
|  +----------------+                      |   +-------------------+                |
|  | InstructionBar | above overlay:       |   +-------------------+                |
|  | prompt + Done  |                      |   | ResultStage       |  testResult    |
|  +----------------+                      |   | big total, verdict|<-- EventPlayer |
|                                          |   | Continue, icons   |                |
|  TipLayer --> data-tip="skilltest" (strip), "bag" (bag in the draw stage)        |
|  SoundLayer --> unchanged (token, testResult events; "commit" moment)            |
+-----------------------------------------------------------------------------------+
```

- **SkillTestScreen** mounts when `game.skillTest` exists and the pending prompt is a commit (or a token / result is playing for that test id); it claims the stage as `test:<id>` and holds it until the result is dismissed, so showcases, titles and the hand-off queue behind or over it as the stage rules already decide.
- **DrawStage** is today's `TokenDraw` body moved inside the screen's middle area: the bag, the discs (now spilled, token-sized), the flip-in-place, the slide into the strip. It plays when `view.playing` is the `token` event (ADR-0002).
- **ResultStage** replaces `Breakdown`: it plays on the `testResult` event, inside the same frame.
- **CalcStrip** renders `testParts` plus the revealed tokens; the same data the panel used.

## Decisions

### 1. The screen owns the stage for the test's whole duration

`useStage("test:<id>")` from the first commit prompt until the result's Continue (or the auto-close). `EventPlayer` keeps gating `token` and `testResult` on settling and pacing, but their "holds the middle" check becomes "the test screen holds" instead of claiming `event:<logIndex>` themselves. Alternative: keep per-event stage claims and let the screen mount and unmount around them. Rejected: the screen would flicker between stages, and the hand-off box ordering (stage-based) would race it.

### 2. Reuse, don't redraw

The subject block, the circle flight (now a flip then a slide), `MiniCard`, `stripAction`, the fan's commit and take-back flights and `testParts` are reused as they are. The new code is the frame, the spill layout, the flip, the result stage and the strip. Alternative: a fresh component tree. Rejected for the usual reason: the flights and hover already work and are tested by the drive scripts.

### 3. Discs are tokens face down

A disc is the token's own component (`ChaosToken`) rendered face down (a plain disc of the same size); the flip is a 3D rotation that swaps to the face. Sizes match by construction. Alternative: keep the small white circles and grow them on the flip. Rejected: the user wants same-size discs, and a face-down token is also the right thing for the auto mode's single flip.

### 4. Spill layout is deterministic

Disc positions come from a seeded scatter (the test id as seed) around the bag's mouth, within the middle area, no overlap; the same test spills the same way after a reload. Alternative: physics. Rejected: cost, and nondeterminism in screenshots.

### 5. Helpers on the same screen through the existing prompts

Nothing changes in the engine: each `commitOther` prompt is a new deciding player; the screen reads `pending.inv` for whose fan is live and whose placed cards are removable (`committers[k] === pending.inv` and an `un:` option exists). The hand-off box already appears when hands are private; it sits above the overlay by z-index.

### 6. Strip above the overlay

The play strip's z-index goes above the overlay while a test is on, with a `dimmed` class on cards that have no option in `byCard` for the current prompt; this reuses the choice spotlight's dim style. Alternative: a "from play" row on the screen (asked; declined).

### 7. Result stage waits like the breakdown did

By hand or at the Tap pace, Continue dismisses it; otherwise it closes after the existing timer. Continue also answers nothing in the engine (the result event is already past), so Undo keeps working as before.

## Risks / Trade-offs

- [The overlay hides the map during helpers' commits: a helper may want to see the location] -> the subject card is the location when investigating; for other tests the map is one Continue away, and the Journal has the context.
- [Z-index juggling: strip, bar, hand-off box, tips all above the overlay] -> one CSS rule set under `.game.testing` (a class on the root while the screen is up) rather than per-component numbers.
- [Spill animation on weak devices: 16 discs with transforms] -> CSS transitions on transform only; reduced motion places them without animation.
- [Drive scripts break] -> `.token-circle` keeps its class name on the discs and `.breakdown button` becomes the result's Continue with the same selector kept as an alias for one release; scripts updated in the same change.
- [Tips anchors] -> `data-tip="skilltest"` moves to the calc strip, `data-tip="bag"` to the bag in the draw stage; `check-tips.js` covers both.

## Migration Plan

Additive UI; no data change. Rollback: remount `SkillTestPanel`, `TokenDraw` and `Breakdown` as before (kept in git history).

## Open Questions

- Whether the middle line ("Investigate: Study · shroud 2") should also name the action's cost or consequence (for example "defeats the Ghoul on success"). Default: name and difficulty only.
- Reduced-motion: discs appear in place with no spill, flip replaced by a crossfade. Default: yes.
