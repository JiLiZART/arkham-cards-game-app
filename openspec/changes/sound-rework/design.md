## Context

Sound today: `content/sounds/sounds.json` names 35 effects and 6 tracks with provenance (ADR-0001), `scripts/import-sounds.ts` converts the originals under untracked `sounds-src/` with ffmpeg (trim, mono MP3 at 80 kbps; AAC and Opus for music), `src/ui/audio.ts` is a small Web Audio engine with a bus per category, `src/ui/sounds.ts` maps events, moments, traits and cards to clips, and `SoundLayer.tsx` is the one component that plays anything, keyed to `view.playing` (ADR-0002) and to explicit `moment()` calls. Measured with `ffmpeg volumedetect`, the effects' mean levels span −12.8 to −35 dBFS and twelve peak at 0 dBFS; nothing normalises. Many moments the table now has (the toss, tapped decks, the avatar choice, the countdown, the cancel, the builder, the catalog) are silent. In-force ADRs: 0001 to 0008, none superseded; 0001 (CC0, committed converted files, manifest) and 0002 (presentation on the animation clock) constrain this design directly.

## Goals / Non-Goals

**Goals:** one loudness across effects and across music; five CC0 candidates per slot, heard at in-game level and chosen with a tap; a sound for every moment the table marks; no change to how or when sounds play in a shipped game beyond the new moments.

**Non-Goals:** haptics; a sound designer's per-scene mix; voice; re-deciding the music roles or their priority; shipping candidates or the picker to players; non-CC0 sources (a later ADR could open them).

## Architecture

Lightweight C4-inspired container view (an assumption: the user asked for no more questions; plain Mermaid; one level, since the change is a dev-time pipeline plus one dev screen).

```mermaid
flowchart LR
  dev[Developer]
  subgraph devtime [Dev time: npm run dev / import:sounds]
    picker[Sounds screen<br/>src/ui/dev/SoundPicker.tsx]
    vite[Vite dev server<br/>+ sounds middleware]
    importer[import-sounds.ts<br/>candidates, loudnorm, convert]
    cands[(sounds-src/candidates/<br/>untracked audio)]
    candjson[(content/sounds/candidates.json)]
    manifest[(content/sounds/sounds.json)]
  end
  subgraph runtime [The game, shipped]
    layer[SoundLayer + moment()]
    engine[audio.ts Web Audio engine]
    files[(public/sounds/)]
  end
  ext[CC0 sources<br/>Kenney, OpenGameArt, freesound CC0]
  dev -->|taps a clip| picker
  picker -->|play at in-game gain| engine
  picker -->|GET candidate audio| vite
  picker -->|POST choice| vite
  vite -->|serve| cands
  vite -->|write| manifest
  vite -->|runs for the chosen clip| importer
  importer -->|download| ext
  importer --> cands
  importer --> candjson
  importer -->|loudnorm + encode| files
  layer -->|clip ids| manifest
  layer --> engine
  engine --> files
```

- The shipped game is unchanged in shape: `SoundLayer` reads the manifest and plays through the engine. Only the manifest's entries and the set of moments grow.
- Everything to do with candidates lives at dev time: the importer downloads and lists them, the dev server serves and records choices, the picker is excluded from the production bundle by `import.meta.env.DEV` and a lazy import.
- The one new boundary is the dev server writing a content file. It is the only writer of `sounds.json` besides the developer's editor, and it only ever changes one slot's clip entry per request.

## Decisions

1. **Normalise on import with a measured gain, not with manifest gains.** (Changed while applying: `loudnorm` could not lift peaky clips under the ceiling and disagreed with the R128 meter by up to 2.7 dB, and a limiter squashed clicks. The importer now measures with `ebur128` as dual mono, applies `volume = min(target − measured, −2 dBTP − peak)`, and trims silence from both ends of tracks. A transient therefore ends quieter than −18 LUFS, held by its peak, and the content check accepts that.) ffmpeg's `loudnorm` filter in two passes (measure, then apply `measured_*`) brings every effect to I = −18 LUFS, TP = −1 dBTP, LRA 7, and every track to I = −23 LUFS. The manifest `gain` is then a small mix offset (schema range tightened to 0.5–1.5; today's values are reset to 1 and re-tuned in the picker). *Alternative:* keep hand gains and lower the slider default: rejected, it leaves peaks clipping and the spread in place. *Alternative:* a compressor on the effects bus at run time: rejected, it changes the sound's character and hides the problem from the content check. The check measures each converted effect's integrated loudness (ffmpeg `ebur128`, run by `check:content`, which already shells out for nothing today, so it gains a `ffmpeg` requirement that is reported plainly when missing) and fails over 2 LU from target.

2. **Candidates are untracked audio plus a committed list.** `scripts/sound-candidates.ts` holds, per slot, five sources: a pack URL, the file inside it (or a freesound id), and a short description of the sound's character. `import:sounds -- --candidates` downloads each pack once into `sounds-src/packs/`, extracts the named files to `sounds-src/candidates/<slot>/<n>.<ext>`, writes `content/sounds/candidates.json` (slot → five entries with source, author, licence "CC0", original path, description) and renders a normalised preview MP3 beside each original so the picker compares them at the same level. Kenney (CC0 packs: Casino, Impact Sounds, UI Audio, RPG Audio, Interface Sounds), OpenGameArt CC0 collections (rubberduck's, artisticdude's, qubodup's) are fetched by URL; freesound needs an API token (`FREESOUND_TOKEN`), and a slot whose freesound candidate can't be fetched is filled from the packs instead and says so. *Alternative:* commit the candidates: rejected, 45 slots × 5 × 30–300 KB is 10–40 MB of binaries for a one-time choice. *Alternative:* an online picker that streams from the sources: rejected, OpenGameArt and Kenney give no stable per-file URLs and freesound previews are watermarked.

3. **The picker is a dev screen in the app, choosing through the dev server.** `src/ui/dev/SoundPicker.tsx` is lazy-loaded and mounted only when `import.meta.env.DEV`, from a Sounds button in the Debug panel (`screen: "sounds"` is not added to the store; the picker is a modal over whatever is on screen, so it can be opened mid-game to hear a slot in context). It lists the slots from the manifest plus the new moments, each with the current clip, the five candidates from `candidates.json` and "no sound"; a tap plays the clip through `audio.play` (effects) or a 10-second `audio.music` excerpt from the loop start (music), at `gainOf(settings, category, gain)`, so the engine and the sliders are the real ones. Tapping Choose POSTs `{ slot, candidate }` to `/__sounds/choose`; a Vite dev middleware (in `vite.config.ts`, `configureServer`) moves the candidate's provenance into `sounds.json`, sets the file name, runs the importer for that clip (`import:sounds <id>`), and answers when the file is written; the picker then reloads the manifest module (Vite HMR picks up the JSON). The middleware also serves `GET /__sounds-src/*` from `sounds-src/candidates/` so previews play. *Alternative:* a standalone page: rejected by the user (in-game loudness matters). *Alternative:* copy-the-JSON: rejected, 45 round trips by hand.

4. **New moments are `moment()` calls at the UI, not event sounds**, per ADR-0002: the move sound fires when the marker's flight lands (Investigators/Table), the reveal with the existing flip, the deck tap in `Pile`'s click, the bag landing and the clatter from `DrawStage` timers (the clatter's gain scales with the token count, 1 to 30, from 0.6 to 1.0), the token pick in `pick()`, the avatar choice in `InvestigatorChoiceOverlay` (the automatic single pick too), the countdown in `PhasePause`'s `delayed` callback, the cancel in `cancelTest`'s caller, the builder's add/remove/replace in `DeckEditArea`, tabs in `Catalog` and `DecksStep`, open/close in `Modal` and `Drawer`, screen changes in `App` (a store subscription on `screen`), the turn title in `TurnTitle`, victory in `ScenarioEnd` when `game.resolution` is a win. Resource, heal, evade, engage and discard have no animation and today only float: they fire from the float's appearance (`ActionFloats`), which is already on the animation clock. `moment()` gains a 60 ms debounce per name so a burst (three cards discarded at once) is one sound. Two event sounds are added in the manifest only: `enemyDamage` → hit, `weakness` → sting-low (both are in `ANIMATED`).

5. **"none" is a manifest value.** `moments.<name>` may be the string `"none"`; the schema accepts it and `momentClip` returns null, so a moment can be silenced without removing the slot from the picker.

6. **Seam check for loops.** `check:content` measures the track's RMS over 200 ms at `loopStart` and before `loopEnd` (ffmpeg `astats` on two trims) and fails over a 6 dB difference; the picker shows the measured seam for each music candidate so a bad loop isn't chosen.

## Risks / Trade-offs

- [Two-pass loudnorm on short clicks over-measures silence] → `loudnorm` runs on the trimmed clip with `dual_mono=true`; clips under 400 ms are padded with silence for measurement only.
- [Candidate downloads break when a source moves] → the list records the pack URL and a sha256 of each file; the import reports which slot lost a candidate and continues; the developer swaps the source in `sound-candidates.ts`.
- [The dev middleware writing content] → it only writes one slot's entry, validates the result with `SoundManifest` before saving, and refuses when the candidate isn't CC0 or isn't in `candidates.json`.
- [ffmpeg becomes a requirement of `check:content`] → the check reports "ffmpeg not found: loudness and seam checks skipped" as a warning, not a failure, so CI without ffmpeg still runs the other checks; the README says so.
- [More sounds can get noisy] → every new moment is gentle by brief (soft drop, soft confirm, soft click) and any one can be set to "none" in the picker.
- [Many `moment()` call sites] → the names are one list in `sounds.ts` (`MOMENTS`), the content check fails on a manifest moment not in the list and on a list entry with no manifest value.

## Migration Plan

Additive. Old saves carry no sound state. The first import after this change rewrites every file under `public/sounds/` at the new levels (one commit of binaries, about the same size). Rollback: revert the commit.

## Open Questions

None. No in-force ADR needs revisiting: ADR-0001 is kept exactly (CC0 only, committed converted files, manifest provenance) and ADR-0002 is honoured by routing every new sound through `moment()` or `view.playing`.
