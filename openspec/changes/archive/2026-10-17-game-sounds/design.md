## Context

- The game is one browser app (React + react-three-fiber), deployed as static files to GitHub Pages. No server, no ADRs yet (`adr/` does not exist), so nothing in force constrains this design.
- Every animated engine event already passes through one gate: `ANIMATED` in `store.ts` picks them into `queue`, and `EventPlayer` (Hud.tsx) sets `view.playing` when one starts on screen, honouring the pace (normal, slow, tap) and the stage. Sound rides that signal.
- UI moments without an engine event (fan landing, strip landing, flips, mulligan, phase title, buttons, tips, hand-off, undo) each live in one component.
- Settings persist in the save's `settings` (`locale`, `privacy`, `drawByHand`, `pace`, `tipsOn`); assets ship from `public/` through `asset()` with the Pages base path; content loads through `src/content` with zod schemas and `check:content`.
- Browsers suspend the `AudioContext` until a user gesture; iOS honours the silent switch for Web Audio; MP3 cannot loop seamlessly because of encoder padding.
- `ffmpeg` is available locally (`/usr/local/bin/ffmpeg`), as the card-image scripts assume for their own tools.

## Goals / Non-Goals

**Goals:**
- Sound as data: which clip plays for what is a manifest, not code.
- One clock: effects follow the animation, music follows game state.
- Pure decision logic, thin audio wrapper, browser-checkable through a dev hook.

**Non-Goals:**
- Haptics, voice, per-location ambience, menu music, Debug-panel sounds.
- A general audio middleware (buses, reverb, ducking graphs). Two gain nodes and a crossfade are enough.

## Diagram (C4-inspired, component level, ASCII; the app is the only container)

Assumptions: lightweight rigor; the single container is the browser app; "Web Audio" is the browser API, drawn as an external system.

```
+--------------------------------------------------------------------------------+
| Browser app (React + R3F)                                                      |
|                                                                                |
|  +----------------+   choose/undo   +-----------------+    current, pace       |
|  | HUD components |---------------->| game store      |---------------------+  |
|  | fan, strip,    |                 | (zustand)       |                     |  |
|  | CardMesh, tips,|                 | settings:       |                     v  |
|  | title, handoff |                 | musicVolume,    |            +-------------+
|  +-------+--------+                 | sfxVolume,      |            | EventPlayer |
|          | moment("snap", card)     | muted           |            | sets        |
|          v                          +--------+--------+            | view.playing|
|  +----------------+                          |                     +------+------+
|  | SoundLayer     |<-------------------------+  game, settings            |       |
|  | (one component,|<---------------------------------------------------- +       |
|  |  subscribes)   |  view.playing (event start)                                   |
|  +-------+--------+                                                               |
|          | decide(event|moment, game, manifest) -> { clip, gain } | musicFor(game)|
|          v                                                                        |
|  +----------------+       +------------------+        +-------------------------+ |
|  | sounds.ts      |       | manifest         |        | audio.ts                | |
|  | pure, tested   |<------| content/sounds/  |        | decode, play(clip,gain),| |
|  +----------------+       | sounds.json      |        | music(track) crossfade, | |
|                           | (in content db)  |        | unlock, visibility,     | |
|                           +------------------+        | window.__arkhamAudio    | |
|                                                       +-----------+-------------+ |
+-------------------------------------------------------------------|---------------+
                                                                    v
                                           +-------------------------------------+
                                           | Web Audio API (browser)             |
                                           | AudioContext, GainNode x2, buffers  |
                                           +-------------------------------------+
                      fetch /sounds/*.mp3 | *.m4a | *.webm  <---  public/sounds/ (static files)
```

- **SoundLayer** is the only component that knows audio exists. It watches `view.playing` for effects, the game state for the music track, and the settings for gains. UI moments call one function, `moment(name, cardId?)`, which SoundLayer routes the same way.
- **sounds.ts** is pure: `effectFor(event, game, manifest)`, `momentClip(name, cardId, game, manifest)` (code → traits → generic), `musicFor(game)` (fight > tension > bed by scenario), `gainOf(settings)`. Unit-tested like `tips.ts`.
- **audio.ts** owns the `AudioContext`, two `GainNode`s (music, effects), buffer cache, crossfade timers, the unlock listener, the `visibilitychange` pause. No game knowledge.
- **manifest** joins the content db so `check:content` and the i18n-style loaders see it, and the pure functions get it as data.

## Decisions

### 1. Effects fire from `view.playing`, UI moments from one `moment()` call
Alternative: subscribe to the log and play on append. Rejected: at the tap pace sound would run ahead of the screen and bursts would stack (proposal Q10). `view.playing` already encodes "this is on screen now".

### 2. Pure `sounds.ts` + thin `audio.ts`, split for tests
Alternative: one module with Web Audio calls next to the lookups. Rejected: vitest has no audio; the decisions are where bugs would hide (trait order, priority, gains). The wrapper stays small enough to read.

### 3. Music selection is a function of game state, re-evaluated on store change
`musicFor(game)` returns a track id; `audio.music(id)` is idempotent (same id → nothing). Crossfade 1.5 s via two sources and gain ramps. Alternative: event-driven cues (on engage, on defeat). Rejected: state-derived can't drift out of sync after undo or reload.

Signals: fight = any card in zone `enemy` with `engagedWith` set; tension = `phase === "enemy"` or doom on the agenda equals its threshold minus 1 (via `doomInPlay` and the agenda card's `doom`, as the scenario panel badge does); bed = `scenarioId`.

### 4. Formats: MP3 mono 80 kbps for effects; AAC `.m4a` + Opus `.webm` for music
Music needs gapless loops; containers that support them beat the loop-point trick (proposal Q5). `audio.ts` picks by `canPlayType("audio/mp4; codecs=mp4a.40.2")`, else Opus. Effects are short, MP3 everywhere, no fallback. The import script encodes with `ffmpeg` (`-ac 1 -b:a 80k` for effects; `-c:a aac -b:a 96k` and `-c:a libopus -b:a 80k` for music) and fails if `libopus` is absent.

### 5. Manifest shape
```json
{
  "effects": { "snap": { "file": "snap.mp3", "gain": 0.8, "source": "...", "author": "...", "license": "CC0" } },
  "music":   { "bed:the-gathering": { "file": "gathering", "loop": true, ... }, "fight": {...}, "tension": {...} },
  "events":  { "attack": "strike", "damage": "hit", "token": ["rattle", "clink"] },
  "moments": { "play": "snap", "draw": "slide", "flip": "flip" },
  "traits":  { "play": { "Firearm": "gun-ready", "Spell": "arcane" }, "fight": { "Firearm": "gunshot", "Melee": "blade" }, "spawn": { "Ghoul": "growl-ghoul" } },
  "cards":   { "01016": { "fight": "gunshot-45" } }
}
```
Validated by a zod schema in `src/content/schema.ts`; `check:content` adds: files exist, licence is `CC0`, every referenced clip id exists, every `events` key is in `ANIMATED`, sizes within budget.

### 6. Settings in the save, mute as a flag
`musicVolume`, `sfxVolume` (0 to 100), `muted` on `UiState` and in `settings`; resume defaults 50 / 80 / false. Mute keeps the levels. Gains apply as `volume/100 * clipGain`, muted → 0, with a short ramp to avoid clicks.

### 7. Unlock on the first gesture
A one-shot `pointerdown`/`keydown` listener on `window` calls `ctx.resume()`. Until then `audio.ts` drops plays silently and `music()` just records the wanted track, which starts on unlock.

## Risks / Trade-offs

- [Finding good CC0 clips takes longer than the code] -> the manifest allows a placeholder clip per target; the change ships when every target has *a* clip, and clips improve by data later.
- [Audible loop seam in a music track] -> containers chosen for gaplessness; the manifest allows `loopStart`/`loopEnd` per track as a fallback.
- [Sound and screen drift at the tap pace] -> effects keyed to `view.playing` only; a check script asserts play order against the sampler.
- [Mobile data: 10 MB of music] -> loaded after the game starts, bed first, fight and tension after; music absence is silent, never an error.
- [Two sounds for one moment (an event plus a UI landing)] -> the manifest decides per target; the review listens for doubles in `drive-calm.js` with the audio log.
- [AudioContext created too early on iOS gets stuck suspended] -> created lazily inside the first gesture handler.

## Migration Plan

Additive. Old saves resume with default volumes. No data migration. Rollback: remove `SoundLayer` from the HUD; files and manifest are inert without it.

## Open Questions

- Does the `encounter` reveal want both the flip (UI moment) and the sting (event)? Default: both, flip then sting.
- Whether the mute button belongs in the top bar's right cluster (Journal, Debug, Menu) or beside the chaos bag. Default: right cluster.

## As built

- **Music follows the state as shown.** `musicFor(game)` is re-evaluated only when nothing plays or waits to play; otherwise the Ghoul's defeat changed the track while its attack was still on screen (the state runs ahead of the animation). Decision 3 otherwise as designed.
- **Sources.** FreePD is offline ("taken the service offline" on its home page) and Kenney's own site serves downloads through a script modal, so every clip came from OpenGameArt's CC0 filter, including Kenney's casino pack mirrored there. 18 packs, 40 clips and tracks, 444 KB of effects and 8.8 MB of music.
- **The bus carries the slider, the clip its own gain**: `gainOf(settings, category, 1)` sets the category bus; `audio.play` uses the manifest gain. The same formula, split so a slider moves live.
- **Fight at test start**: the skill test's `source` card picks the weapon clip when a fight test begins (`SoundLayer` watches `skillTest.id`); a bare-handed fight has no sound at the start.
- **Dev hook** `window.__arkhamAudio`: `log`, `track()`, `unlocked()`, `levels()`; used by `check-sounds.js` and `check-sound-controls.js`.
- **Not verified by ear**: the loop seam of the fight track (a 14.8 s WAV loop encoded to AAC and Opus) and iOS behaviour; the manifest's `loopStart`/`loopEnd` are the fallback if a seam is audible.
