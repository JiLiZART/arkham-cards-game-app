## 1. Bag art

- [x] 1.1 Chaos bag back to the PNG (`icons.ts`, `extract-assets.sh`, `public/icons/chaos-bag.png`); icon checks updated; tests.

## 2. The toss

- [x] 2.1 `src/ui/toss.ts`: seeded bag and token paths with bounces, spin and settling, sampled to keyframes; tests (start at the mouth, end at rest, at least one bounce, inside the stage, deterministic).
- [x] 2.2 `DrawStage` plays the toss on every draw, scaled to the pace (Normal about 0.9 s, Slow and Tap about 1.2 s): the bag's arc, landing and tip; the token stream; shadows; the pick waits for the last token; reduced motion places everything.
- [x] 2.3 Token backs in the real tokens' plain cream: no symbol, darker rim, edge when tilted, shadow; hover.

## 3. Verification

- [x] 3.1 Browser: a recorded GIF of the toss with 16 tokens at 1600×900 and on the phone layout; frame timing with the perf script; the automatic draw; reduced motion; drive-calm to round 3 with 0 errors; tests, lint, build, content check.
- [x] 3.2 `openspec validate bag-toss --type change --strict`.
