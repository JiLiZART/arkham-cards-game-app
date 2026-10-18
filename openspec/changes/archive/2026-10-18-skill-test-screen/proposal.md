## Why

A skill test is the game's central moment, and today it is scattered: a small panel at the top centre holds the arithmetic and the committed cards, the cards to commit glow somewhere in the fan, then a separate overlay takes the screen for the chaos draw, and a third box reports the result. The player's eye jumps four times for one roll. Card games stage this as one scene: what you are testing, what you have put in, what it adds up to, the draw, the verdict.

## What Changes

- **One skill-test screen, three stages.** When a test begins, an overlay like today's token draw opens over the dimmed table and stays until the result is dismissed:
  - *commit*: the test's subject large on the left (the location, enemy or card the test is against or comes from; the investigator's portrait when there is none), the placed cards on the right with each card's icon contribution and a tap to take it back, a calculation strip across the bottom (base skill, each placed card, modifiers, total vs difficulty), the hand fan live below it with only committable cards bright; the instruction bar above with its instruction and Done;
  - *draw*: the discs spill out of the bag into the free middle, each the size of a real token; the chosen disc flips in place to reveal the token, which then slides into the calculation strip; with "Draw by hand" off a single token flips straight out of the bag instead;
  - *result*: in the same frame, the big total, then Success or Fail in big text, then Continue; bottom centre the arithmetic as icons, "[intellect] 3 + [token] −1 + [card] 2 = 4".
- **Helpers' cards on the same screen.** After the tester's Done, the other investigators at the location commit in turn on the same screen (the hand-off box over it when hands are private); placed cards carry their owner's portrait, each player can take back only their own, and the strip counts everyone's.
- **The play strip stays reachable** above the overlay, dimmed except the cards with a usable fast ability, so Physical Training and its kind can still be used during a test.
- **Replaces** the top-centre skill-test panel, the standalone token-draw overlay and the result box. The Journal, sounds, tips and the choice spotlight keep working: the test, token and result events are unchanged; only where they are shown moves.

Out of scope: the phone layout of the screen (the phone-landscape change lays the same three zones out for a short screen), changes to the engine's test rules, and multiple-token draws beyond showing each in turn as today.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: the chaos token draw becomes a stage of the skill-test screen with the spill-and-flip animation and the new result layout; the skill-test panel requirement is replaced by the skill-test screen.

## Impact

- New `src/ui/hud/SkillTestScreen.tsx` (the overlay, its three stages, the subject, placed cards, calc strip); `TokenDraw.tsx` reduced to the bag, the spill, the flip and the auto-mode flip inside the screen; the result box (`Breakdown` in `TokenDraw.tsx`) and `SkillTestPanel` in `Hud.tsx` removed.
- `src/ui/hud/Hud.tsx`: `EventPlayer`'s centre handling for `token` and `testResult` plays them inside the screen; the screen holds the stage for the test's duration.
- `src/ui/hud/Panels.tsx` (`PlayStrip` dim and layering during a test), `HandFan.tsx` (unchanged behaviour, the fan stays live), `TipLayer`/`tips.ts` (the test and token tips anchor to the screen's calc strip and bag), `styles.css`.
- `content/i18n/{en,ru}/ui.json`: strings for the result stage ("Success", "Fail", "Continue" exist; the stage lines and the helper's "already placed" label are new).
- Browser scripts: `drive-calm.js` and `check-sounds.js` click `.token-circle` and `.breakdown button`; they move to the screen's selectors.
