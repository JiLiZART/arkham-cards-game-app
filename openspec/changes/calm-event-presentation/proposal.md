## Why

During play, many things happen on screen at once, and the player can't tell what happened or why. Every log entry is shown twice: as text floating up over the map and as a line in the live feed (up to 8 lines, each for 12 s). Routine bookkeeping, such as upkeep's ready, draw and resource for every investigator, gets the same weight as an enemy attack. The showcase, encounter flight, token pop, test result and phase title can all overlap in the middle of the screen while floats and hit streaks play over them. The game needs one clear story told at a time.

## What Changes

- **Floats only for big moments.** Text floats rise over the map only for consequential events: damage and horror, enemy attacks, defeats, enemy damage, clues gained or dropped, doom, and act/agenda advances. Routine entries (resources, draws, moves, plays, engages, discards and similar) appear only in the feed.
- **Merged feed bursts.** Consecutive routine entries from one engine step that share a kind are folded into a single feed line. For example, upkeep becomes "each investigator drew 1 and gained 1 resource", and three draws become "Roland drew 3 cards". The live feed shows at most 4 lines. The Journal keeps every entry, unmerged.
- **One thing at a time.** The middle of the screen has a single "stage" that only one overlay holds at a time: the showcase, encounter card, resolving card, token draw, test result or phase title. Others queue behind it in order. Floats and hit streaks wait until the stage is free.
- **Spotlight.** While an animated event plays, the rest of the map dims and the card or investigator it involves is lifted and outlined. The dim clears as soon as the event ends and never blocks input.
- No engine or save-format change. Unpaced and paced games replay unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: adds four requirements: float selection, feed merging, stage exclusivity and the event spotlight.

## Impact

- `src/ui/feed.ts`: a float whitelist, plus a pure `mergeEntries` that folds bursts, with tests in `feed.test.ts`.
- `src/ui/hud/Feed.tsx`: the live feed uses merged entries and `LIVE_MAX = 4`. The Journal is unchanged.
- `src/ui/hud/Floats.tsx`: `ActionFloats` filters through the whitelist and holds while the stage is busy. `HitFx` queued hits wait for the stage too.
- `src/ui/view.ts` and a small `src/ui/stage.ts`: who holds the stage, derived from the existing state (showcase, intro, current event, pending phase pause). There is no new timer system.
- `src/ui/hud/Hud.tsx` (`PhaseTitle`, `EventPlayer`), `hud/Reveal.tsx` and `hud/Showcase.tsx`: each checks the stage before taking the middle of the screen.
- `src/ui/scene/Table.tsx` and `CardMesh.tsx`: map dimming plus a lifted, outlined spotlight card.
- `src/content` strings: merged feed templates in English and Russian.
