## Why

The game's 35 effects come from a dozen CC0 packs by different authors and were trimmed by hand: their loudness spans 22 dB (mean −12.8 dBFS for the defeat sting to −35 dBFS for a footstep), twelve clips peak at 0 dBFS, and the manifest's per-clip gains only half correct it, so the table sounds loud, uneven and stitched together. Since the sounds were chosen, the table gained many moments that make no sound at all (moving, revealing a location, tapping a deck, the bag landing and the tokens tumbling, picking a token, choosing an investigator, the phase countdown, cancelling a test, the deck builder, the catalog), and the engine emits about 55 event types of which 16 are heard.

## What Changes

- **One loudness.** The import normalises every effect to one target (EBU R128, −18 LUFS integrated, −1 dBTP peak) and every music track to another (−23 LUFS), so the manifest's `gain` becomes a small mix offset rather than a correction. The slider defaults stay; the table gets quieter and even.
- **Candidates and an audition picker.** For every sound slot (each event, UI moment, trait sound, card sound and music role) the import gathers five new CC0 candidates into untracked `sounds-src/candidates/`, listed in `content/sounds/candidates.json` with their provenance. A dev-only screen, reached from the Debug panel under `npm run dev`, lists every slot with its current clip, the five candidates and "no sound"; each plays through the game's own audio engine at in-game level, and tapping one writes the choice into `content/sounds/sounds.json` through the dev server. Only chosen clips are converted into `public/sounds/`.
- **More moments.** New UI moments with sounds: an investigator's marker arriving at a location, a location turning over, a card discarded, a resource gained, a heal, an evade, an engage, the mulligan redraw confirmed, a deck tapped to draw, the bag landing, the tokens hitting the table (a clatter sized to their number), a token picked, an investigator chosen (and the automatic single pick), the phase countdown closing, a test cancelled, a card added to or removed from a deck in the builder, a tab changed, a modal or drawer opened and closed, a menu screen entered, the turn title, the scenario's victory. Two animated events gain sounds: enemy damage (a hit) and a weakness drawn (a low sting).
- **Music roles kept, tracks re-chosen.** The bed, fight and tension roles and their priority are unchanged; the picker lets the tracks themselves be swapped, and every bed gets a loop-point check so it seams cleanly.
- Unchanged: ADR-0001 (CC0 only, converted files committed, provenance in the manifest) and ADR-0002 (effects on the animation clock).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-audio`: normalised loudness; the candidate list and the audition picker; the new UI moments and the two new event sounds; the manifest's `candidates.json` companion.

## Impact

- `scripts/import-sounds.ts` (loudnorm two-pass, candidates download and conversion, `--choose` application), new `scripts/sound-candidates.ts` (the CC0 sources and search terms per slot), `content/sounds/sounds.json` (new moments, updated gains), new `content/sounds/candidates.json`, `src/content/schema.ts` and `soundChecks.ts` (candidates file, loudness check), `vite.config.ts` (dev middleware: serve `sounds-src/candidates/`, write a choice), new `src/ui/dev/SoundPicker.tsx`, `src/ui/hud/SoundLayer.tsx` and the components that gain `moment()` calls (Table/Investigators for the move, Panels for the deck tap, TokenDraw for the bag and tokens, InvestigatorChoice, Hud for the countdown and turn title, SkillTestScreen for the cancel, DeckEditArea, Catalog, Drawer, Modals, App for screen changes), `README.md` credits.
- No engine change.
