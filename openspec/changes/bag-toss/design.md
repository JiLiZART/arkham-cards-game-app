## Context

`ICON_SOURCES.chaosBag` is `{ glyph: "chaos_bag" }` since `svg-icons`; before, `{ png: "chaos-bag" }` from `public/icons/chaos-bag.png` (139×118, copied by `extract-assets.sh` from `inspired/icons/no_bg_chaos-bag.png`). `DrawStage` (`TokenDraw.tsx`) grows the bag from its button with one transform animation, then animates each disc from the bag's mouth to its `spillLayout` point (translate + scale, 420 ms, 18 ms stagger). Discs are `.token-circle` buttons with a 3D flip (`.disc-back` a white radial gradient, `.disc-front` the token art).

## Goals / Non-Goals

**Goals:** a toss that reads as physical; tokens that look like tokens; the bag art back.

**Non-Goals:** a physics engine; changing which token is drawn or how the result is shown; WebGL.

## Decisions

1. **Bag PNG:** `chaosBag: { png: "chaos-bag" }` again, the asset script copies it, `checkIcons`/`codeIconNames` stop requiring the glyph for the bag. At 150 px in the draw the 139 px art is upscaled slightly, as before `svg-icons`; acceptable.
2. **Toss as precomputed keyframes, not a simulation at run time:** `toss.ts` exports `bagPath(from, landing)` (an arc with an overshoot squash: `scaleY 0.85` on landing, then a 25° tip with the mouth toward the spill) and `tokenPath(mouth, rest, seed, k)`: a launch velocity toward the rest point plus seeded spread; the path is integrated in fixed 16 ms steps under gravity with a restitution of 0.4 for 1–2 bounces on the "floor" (the rest point's y), friction for a short roll, and a spin (rotateZ from the horizontal speed, a rotateX tumble that flattens to 0 at rest). The result is sampled into 10–14 WAAPI keyframes with offsets, `transform: translate() rotateZ() rotateX()` plus a shadow element whose scale and opacity follow the height. Pure and seeded: tests check that each path starts at the mouth, ends exactly at its rest point, bounces at least once, stays inside the stage, and that the same seed gives the same keyframes.
3. **Timing:** at the Slow and Tap paces: bag flight 350 ms, landing and tip 200 ms, tokens launched over 450 ms (stagger scaled by count so 30 tokens still finish), each path 500–700 ms; all at rest by about 1.2 s. At the Normal pace every duration is scaled by 0.75 (about 0.9 s). The toss plays on every draw. The existing "pick waits for arrival" uses the last token's finish.
4. **Token look:** `.disc-back` becomes the real tokens' plain cream (a soft radial cream with paper grain, a slightly darker rim ring, no symbol), a `::before` edge (a darker offset ellipse shown when tilted via `rotateX`) so the thickness reads, and a separate `.disc-shadow` under each token; hover lifts and lights the rim gold. Against the cream back the revealed face differs by its symbol, as with the physical tokens. The face after the flip is the existing `ChaosToken`.
5. **Reduced motion:** no keyframes; bag and tokens placed at rest.

## Risks / Trade-offs

- [30+ animated elements at once on phones] → transforms and opacity only, no layout; measured with the existing perf script on the phone profile.
- [Tokens overlapping the bag or each other at rest] → the rest points still come from `spillLayout`; the paths only add the journey.

## Migration Plan

None.

## Open Questions

None.
