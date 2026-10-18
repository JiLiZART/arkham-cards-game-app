## Why

The scenario introduction centres the agenda card, the intro text and the Continue button in a box that has no height limit and no scrolling. With a long intro the box is taller than the screen, so its top and bottom, including Continue and Skip, are off screen and nothing scrolls: the player is stuck until they guess Enter. 37 of the 152 scenarios have an intro over 1,500 characters (the longest, Machinations Through Time, 5,758), and the phone layout at 393 px tall hits it with much shorter texts. Many generated intros also show the campaign guide's own markup as raw text: `<fancy>` (87 times), `<center>` (74), `<right>` (32), `<typewriter>` (13), `<game>` (12), `<blockquote>`, `<smallcaps>`, `<innsmouth>`, `<strike>`, besides `<i>` and `<b>`. The guides use them for handwritten notes, typed letters, centred headings and the like.

## What Changes

- The introduction box SHALL fit the screen: the intro text scrolls inside the box when it is long, the agenda card shrinks on short screens, and Continue and Skip stay visible at the bottom of the box. When the text is scrollable a fade at its bottom edge says so.
- The guide's markup is rendered as the printed guides and ArkhamCards show it: `fancy` in the handwriting font Caveat, `typewriter` in TT2020 Style E, `innsmouth` in About Dead (Teutonic for Russian, which About Dead lacks), `game` in the game's Teutonic display font, `smallcaps` as small capitals, `center` and `right` as aligned blocks, `blockquote` indented, `strike` struck through, `i` and `b` as now. The three fonts come from `inspired/ArkhamCards/assets` into `public/fonts`. Any other tag is shown as its text without the tag. The same renderer serves resolutions and campaign tile text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: the scenario introduction fits the screen and scrolls its text.

## Impact

- `src/ui/styles.css` (intro overlay rules), `src/ui/hud/IntroOverlay.tsx` (the scroll fade), a new `src/ui/guideText.ts` (safe renderer for the guide markup, tested), three fonts in `public/fonts` with their licences, the resolution screen and campaign tiles using the renderer.
- No engine change.
