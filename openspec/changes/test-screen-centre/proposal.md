## Why

The skill-test screen puts the card being tested in the left corner, the draw in an empty middle and the placed cards on the right, so the eye travels between three places. The test is about the card: the Ghoul being fought, the room being searched. It belongs in the centre, with the chaos bag thrown onto it and the tokens tumbling over it, and the arithmetic staying along the bottom.

## What Changes

- The subject card moves to the centre of the screen and grows (at least 240×336 px at 1080p); the test's line sits above it; the placed cards sit in a wrapping row to its right; the calculation strip stays along the bottom.
- The chaos draw plays over the subject: the bag lands on the card and the tokens tumble over and around it, leaving the card visible between them; the result's big total appears over the card too.
- The subject no longer enlarges on hover (it is large already); its details column still appears.
- The phone layout keeps the same arrangement at smaller sizes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: the skill-test screen's arrangement, the line alignment, the token draw's stage over the subject.

## Impact

- `src/ui/hud/SkillTestScreen.tsx`, `src/ui/hud/TokenDraw.tsx` (the stage's area is the subject's box plus margins), `src/ui/testScreen.ts` (`spillLayout` over the card), `src/ui/styles.css` (desktop and phone rules), the test-screen browser checks.
- Builds on `bag-toss`: its spec text for the token draw is taken as the base here, so `bag-toss` should be applied and archived first.
