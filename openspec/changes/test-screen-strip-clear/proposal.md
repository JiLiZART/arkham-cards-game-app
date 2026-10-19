## Why

On the skill-test screen the play strip covers the chaos tokens: the lower rows of face-down discs sit under the strip's cards, which take the click, so the player can't pick them. The strip is fixed 300 px above the bottom with 124 px cards and their option buttons, while the subject card and the disc area are fixed from the top; at 1080 px they just clear, at 900 px (the spec's own 1600×900 reference, any laptop) the strip overlaps the disc area and the subject card by 130 to 230 px. The strip is kept above the test overlay so an in-play fast ability (Physical Training during a willpower test) can be used while committing, but during the draw nothing on it can be used at all.

## What Changes

- **The strip steps aside during a skill test whenever none of its cards has an option right now.** It slides down out of view, faded, and takes no pointer, so it never covers the subject card or the discs. That is the whole token draw and the result (no engine prompt is open), and a commit window in which no in-play ability is offered. It comes back when the screen closes.
- **When one of its cards does have an option during the test** (a fast ability offered in the commit window), the strip is shown compact: cards at the strip's minimum size (84 px wide), the offered card bright and clickable, the others dimmed, as today.
- **The subject card fits above the compact strip on short screens.** The subject's size and the column's top follow the window's height, so at 1600×900 the card, its line and the disc area stay clear of the compact strip; at 1080 and above it keeps its 240×336 size.
- The phone layout keeps its right-edge strip column (it already sits clear of the centre); it steps aside by the same rule.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: Skill-test screen (the play strip during a test is shown only when one of its cards has an option, compact; otherwise it steps aside; the subject fits on short screens) and Play area strip (the test's target is outlined while the strip is shown during a test; the strip leaves the discs and the subject free).

## Impact

- `src/ui/hud/Panels.tsx` (`PlayStrip`: during a test, whether any strip card has an option; the compact width), `src/ui/App.tsx` or the strip's own class (`stepped-aside`), `src/ui/styles.css` (the slide and fade, pointer-events, the subject's height-based size and top).
- A pure helper with its test (`stripDuringTest`: hidden / compact / normal from the test state and the options).
- No engine, rules or content change; no save change.
