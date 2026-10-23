## Why

The table is silent. Cards snap, bags rattle and enemies growl in the physical game and in every card game on a phone, and that feedback is half of what makes an action feel done. With the pacing, captions and tips in place, the screen now tells the player what is happening; sound is the missing channel, and the phone version planned next needs it more than the desktop did.

## What Changes

- **Sound effects** for the moments the screen already marks: every animated engine event (chaos token, test result, encounter card, attack, spawn, enemy move, damage and horror, clues, doom, act and agenda advance, defeats, resolution) and the UI moments that have no log entry (a card drawn into the fan, played to the strip, flipped on the map, committed to a test, the mulligan shuffle, the phase title, button presses, a tip appearing, the hand-off, undo). About 25 clips, several reused.
- **Card-specific sounds by trait**, with per-card overrides: a Firearm fires, a Melee weapon cuts, a Spell whooshes, a Tome turns a page, an enemy's spawn growl follows its traits. The manifest maps traits to clips and lets a card code override; new cards get a sound from their traits with no code change.
- **Music**: one ambient bed per scenario, a shared tension track when the agenda is one doom from advancing or during the enemy phase, and a shared fight track while any enemy is engaged with an investigator. Tracks crossfade; priority fight > tension > bed. Menu and campaign log stay silent.
- **Sound on the animation clock**: an effect plays when its event starts playing on screen, so it matches the float and the dim at every pace; skipped events make no sound. Music pauses while the tab is hidden.
- **Controls**: Music and Effects sliders in the menu settings (defaults 50 and 80, saved with the other settings) and a mute button in the game's top bar. Audio unlocks on the first pointer or key event, so a reload into a running game works.
- **Assets and provenance**: converted files committed under `public/sounds/`; a `content/sounds/sounds.json` manifest records every clip's source URL and licence (CC0 only: Kenney, Freesound CC0, OpenGameArt CC0, FreePD), its trim and loop points, and the event, UI moment, trait or card it serves. A `scripts/import-sounds.ts` turns originals into MP3 (effects, mono) and AAC + Opus (music) with ffmpeg; `check:content` verifies that every manifest entry has its files, a CC0 licence and a known target. Budget: effects ≤ 1 MB, music ≤ 10 MB, music loaded after the game starts.

Out of scope: haptics, per-location ambience, voice, music on the menu or log screens, sounds for Debug panel actions. Sound is independent of the reduced-motion setting.

## Capabilities

### New Capabilities

- `game-audio`: sound effects for game events and UI moments, trait-based card sounds, scenario music with tension and fight tracks, the volume and mute controls, the audio unlock, and the sound manifest with its CC0 provenance and validation.

### Modified Capabilities

<!-- none: the menu gains two sliders and the top bar a button, both specified under game-audio -->

## Impact

- New `src/ui/sounds.ts` (pure: event or moment + game + manifest → clip, gain, and which music track should play; unit-tested), `src/ui/audio.ts` (Web Audio wrapper: decode, play, crossfade, unlock, visibility, and a dev hook `window.__arkhamAudio` logging plays for the browser scripts), `src/ui/hud/SoundLayer.tsx` (subscribes to the event player and the game, drives `audio.ts`).
- `src/ui/hud/Hud.tsx` (`EventPlayer` start of play), `HandFan.tsx`, `scene/CardMesh.tsx` (flip), `hud/Panels.tsx` (strip landing), `hud/MulliganRow.tsx`, `hud/TokenDraw.tsx`, `hud/TipLayer.tsx`, `hud/ActionRail.tsx` (button press): one call each at the UI moments.
- `src/ui/store.ts`: `musicVolume`, `sfxVolume`, `muted` in `UiState` and the save's `settings`; `Screens.tsx`: the sliders; `Hud.tsx` `TopBar`: the mute button; `content/i18n/{en,ru}/ui.json`: the labels.
- `content/sounds/sounds.json`, `public/sounds/**`, `scripts/import-sounds.ts`, `scripts/check-content.ts` (manifest checks), `src/content` loader (the manifest joins the content db), README (credits section listing the sources, play notes for the controls).
- Depends on nothing in flight. The phone-landscape change later reuses the unlock and the mute button.
