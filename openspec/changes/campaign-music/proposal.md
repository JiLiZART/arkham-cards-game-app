## Why

The music is three borrowed CC0 ambient loops shared by every scenario, plus one fight and one tension track. The author has now composed a track for each chapter of Night of the Zealot's first two scenarios, a main-menu theme and a fight theme, each with an alternate take, and supplied four effects (a button click, an enemy's hit, horror damage, a monster appearing). The menu is silent, and the music does not follow the scenario's progress.

## What Changes

- Scenario music follows the chapter: a track keyed to the current agenda card, else to the current act card, else the scenario's bed. The Gathering has one per act (Trapped, The Barrier, What Have You Done?); The Midnight Masks one per agenda (Predator or Prey?, Time Is Running Short). A scenario MAY have its own tension track: The Midnight Masks plays Uncovering the Conspiracy in place of the shared one.
- A track MAY have an alternate take (`<id>:alt`); each game picks one take per track from its seed, so a replay of the same seed sounds the same.
- The fight track is the author's Monster Fight Music. It plays while any enemy is engaged (in a threat area) and crossfades back the moment none is.
- The menu screens (main menu, new game wizard, deck builder, campaign log, settings) play the Main Menu theme, take picked at random per page load. The table's end screen stays silent.
- Every track change, menu to table included, crossfades over about 1.5 seconds (the existing crossfade).
- New effects: the enemy attack strike, horror damage, an enemy spawning (generic and Monster trait), the button click.
- **BREAKING** (content rules): a clip's licence MAY be `own` (made by the project's author) or `provided` (supplied by the author, origin not recorded) besides CC0; only a CC0 clip needs a source URL and candidates. The music budget rises from 12 MB to 50 MB.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-audio`: Scenario music (chapter tracks, alternate takes, per-scenario tension, menu theme), Sound manifest and provenance (licences, budget), Sound candidates (CC0 slots only).

## Impact

- `src/content/schema.ts` (licence, optional source), `src/content/soundChecks.ts` (budget, candidates), `scripts/sound-credits.ts`.
- `src/ui/assets/sounds.ts` (`musicFor`, `menuMusic`), `src/ui/App.tsx` (menu track), tests beside them.
- `content/sounds/sounds.json`, `public/sounds/` (converted files), originals under the untracked `sounds-src/own/`.
- README sound credits.
