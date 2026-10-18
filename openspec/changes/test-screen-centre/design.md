## Context

`SkillTestScreen` lays out `st-subject` (absolute, left 230 px), `st-middle` (centred column: the line, then `st-stage` where `DrawStage` and `ResultStage` render), `st-placed` (absolute, right) and `st-strip` (fixed, bottom). `DrawStage` measures its stage box and spills the tokens inside it with `spillLayout`; the bag sits at the bottom of the stage. The phone layout repositions each with its own rules. `bag-toss` turns the spill into a toss with seeded paths ending at `spillLayout`'s points.

## Goals / Non-Goals

**Goals:** the subject in the centre with the draw on it; the strip untouched; the phone keeps up.

**Non-Goals:** the toss itself (`bag-toss`); the commit flow, the hand fan, the instruction bar.

## Decisions

1. **Layout:** `st-middle` becomes the centred column holding the line, then the subject (`st-subject` inside it, 240×336 at 1080p, portrait 200 px for no-card tests), with `st-stage` absolutely positioned over the subject's box extended by a margin (about 120 px each side, 60 px above and below) so tokens can rest around the card. `st-placed` is anchored to the right of `st-middle` (`left: calc(50% + 150px)`), wrapping in two columns. The strip is unchanged.
2. **Draw over the card:** `DrawStage` gets its area from the stage box as now; `spillLayout` is unchanged (the box is just somewhere else), so the toss paths (from `bag-toss`) land over and around the card. The bag's landing point is the lower third of the subject. `z-index`: tokens above the subject, the subject above the dimmed table. Hover enlarge of the subject is removed (`hoverProps` dropped, the details column kept through the existing hover-details hook).
3. **Tap to finish:** the subject's element gets `legal` and `onClick` when the pending choice is the viewer's commit window (`kind === "commit"`, offered on screen) and its options include `done`; the click calls `choose("done")`, the same id the bar's Done uses; the existing key handler for Space/Enter in the screen covers the keyboard. Test: the subject is clickable only in the commit window and dispatches `done`.
4. **Result:** `ResultStage` keeps its place in `st-stage`, so the total sits over the card with the subject dimmed behind it (`.st-result` gains a translucent dark disc behind the number).
5. **Phone:** subject 150×210 in the centre, line above at 16 px, placed cards to the right at the existing zoom, the stage margin 60/30 px; checked at 852×393.

## Risks / Trade-offs

- [Tokens hiding the subject] → the resting layout spreads over the card plus margins and the card remains readable between tokens; the line above names it anyway.
- [Two changes editing the token draw requirement] → this change's spec builds on `bag-toss`'s text; archive `bag-toss` first.

## Migration Plan

None.

## Open Questions

None.
