## Why

Fighting an engaged enemy from the play strip is awkward:
- the strip cards are small;
- the hover copy is cut off at the bottom of the screen, and its details sit under it;
- Fight and Evade are hidden behind a click menu.

The skill-test panel shows committed cards as tiny thumbnails with no details. A card committed by mistake can't be taken back.

Centre-screen notifications fade in about 1.5 s, too fast to read. A phase change looks like any other action, though it should feel like a new chapter.

## What Changes

- **Play strip:**
  - Strip cards are bigger.
  - Hovering a strip card shows the same details column as hand cards, beside the card. Enemies get their fight, health, evade, damage and horror rows. The enlarged copy is placed fully on screen above the strip.
  - A strip card with pending options shows them as labelled buttons above it, so Fight and Evade on an engaged enemy are one click. No popup menu is needed.
  - The fight target is highlighted while its test runs.
- **Skill-test panel:**
  - Committed cards are bigger.
  - Hovering a committed card shows its details column.
  - The panel shows the value as a line: base skill + committed icons + other modifiers vs difficulty.
  - While the commit window is open for the player who committed a card, clicking that card returns it to their hand. They can then commit another card or none.
- **Chaos token draw:**
  - The bag screen shows the card being tested beside the bag (the treachery, enemy or location), large enough to read, with hover details. Under it is a line: investigator, skill, value vs difficulty.
  - The draw starts only after the screen has settled: earlier animated events finished and flying cards landed, plus a short beat. It is capped at 4 s so it can never stall.
- **Engine:** the commit stage offers an "uncommit" option for each card the deciding investigator committed in this window. It moves the card back to hand and recomputes the value. Replays stay deterministic, since it is an ordinary choice.
- **Notifications:**
  - Action floats stay at the actor or the screen centre as now, but they last longer. The time scales with sentence length, at least about 3.5 s.
  - Floats are staggered further apart, and fewer show at once, so each one can be read.
  - Phase changes no longer float. Each shows a full-screen "chapter title": the phase name in large display type with the round under it. It fades in, holds about 2 s, then fades out. It never blocks input.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: Play area strip (bigger cards, option buttons on cards, details column), Hover enlarge (strip cards use the details column), Chaos token draw (tested card shown, waits for animations), new Skill-test panel requirement (bigger committed cards, details, breakdown, take back), new Phase title requirement.
- `action-feed`: Action floats (longer, length-based life and wider stagger; phase changes excluded).
- `game-engine`: Skill tests (a committed card can be taken back during its commit window).

## Impact

- `src/ui/hud/Panels.tsx` (`PlayStrip`, `MiniCard`), `src/ui/hud/Hud.tsx` (`SkillTestPanel`, `EventPlayer` settle gate, new `PhaseTitle`), `src/ui/hud/TokenDraw.tsx` and `Reveal.tsx` (tested card), `src/ui/hud/HoverCard.tsx`, `src/ui/hud/HandDetails.tsx`, `src/ui/details.ts` (enemy rows), `src/ui/hud/Floats.tsx`, `src/ui/styles.css`, i18n strings (en/ru).
- `src/engine/rules/skillTest.ts` commit stage (new option value) and the `token` event's data (tested card, skill, value, difficulty), `src/ui/optionHome.ts` (uncommit options belong to the skill-test panel, not the rail), `src/engine/bot.ts` (bot never uncommits).
- No new dependencies. Saved games and action logs stay valid; old logs never chose an uncommit option.
