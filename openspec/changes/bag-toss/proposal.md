## Why

The svg-icons change replaced the painted chaos bag with a flat sprite glyph, which reads as a brown blob in the top-right corner and in the token draw. And the draw itself shows the bag growing and plain white discs gliding out of it in a neat cascade: nothing like throwing the bag down and watching the tokens tumble out, which is the moment the screen is there for.

## What Changes

- The chaos bag is the painted PNG again (`inspired/icons/no_bg_chaos-bag.png`, the image used before `svg-icons`) everywhere: the top-right button, the bag modal and the token draw. The sprite glyph stays in the sprite but isn't used for the bag.
- The token draw's spill becomes a toss: the bag flies from its button in an arc, lands with a bounce and a squash, and tips over; the tokens burst out of its mouth one after another, each on its own arc, spinning, hitting the table, bouncing with less height each time, and rolling to rest at its place, tilting flat. About 0.9 seconds at the Normal pace and 1.2 seconds at the Slow and Tap paces, on every draw, seeded per test so a reload looks the same, and plain appearance under reduced motion.
- The face-down tokens look like real chaos tokens instead of flat white plates: plain cream like the physical tokens, no symbol, a slightly darker rim, a visible edge when tilted, and a soft shadow on the table.
- Unchanged: the tap picks a token and the flip reveals the engine's token; the automatic draw tosses the bag with a single token.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-iconography`: the chaos bag as PNG art.
- `game-table-ui`: the chaos token draw's toss and token look.

## Impact

- `src/ui/icons.ts` (chaosBag back to PNG), `scripts/extract-assets.sh` (copies the bag again), `public/icons/chaos-bag.png`.
- `src/ui/hud/TokenDraw.tsx` (the toss), a new pure `src/ui/toss.ts` (seeded paths and keyframes, tested), `src/ui/styles.css` (token backs, shadows, the bag's tip-over).
- No engine change.
