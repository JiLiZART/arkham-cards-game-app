## Context

`musicFor(game, manifest)` picks one music id (fight, tension, `bed:<scenario>`, `bed:default`); `SoundLayer` hands it to `audio.music()`, which crossfades over 1.5 s and ignores a repeat of the playing id. The menu calls nothing, so it is silent. The manifest's licence is the literal CC0 and every slot needs CC0 candidates.

## Goals / Non-Goals

**Goals:** the author's chapter tracks, menu and fight themes, alternate takes, the four supplied effects; the crossfade on every change, the menu included.

**Non-goals:** tracks for scenarios the author has not scored (The Devourer Below and the generated ones keep their beds); a picker UI for the new tracks.

## Decisions

### 1. Music ids, resolved in order

```
  musicFor(game)
    phase ended ......................... null
    any enemy engaged ................... take("fight")
    enemy phase / agenda one doom short . take("tension:<scenario>") | take("tension"), skipped when silent
    current agenda card ................. take("card:<agenda code>")
    current act card .................... take("card:<act code>")
    scenario bed ........................ take("bed:<scenario>") | take("bed:default")

  take(id) = id, or "<id>:alt" when it exists and hash(seed, id) is odd (the starting take)
  menuMusic(random) = take of "menu" by a coin flip per page load
```

Keyed by card code, a new scenario's score is data only. The agenda wins over the act because The Midnight Masks has one act and two agendas; The Gathering's agendas have no track, so its acts play.

### 2. Composed pieces chain their takes

The author's tracks have an intro and a fade-out ending, so a sample loop would pump (seams of 7 to 37 dB). They are `loop: false`; `audio.ts` plays a take and, `CROSSFADE` seconds before its end, starts the other take fading in (`MusicFiles.next`), alternating for as long as the id is wanted. The hand-over is scheduled in the audio context's time by a silent `ConstantSourceNode` tick a second ahead, so a suspended context (hidden tab) holds it too. Every scheduled source sits in the track's set and stops with it.

```
  take A  |=========================\
  take B                       /=========================\
  take A                                             /======...
          <------ A.duration ------>
                           <-1.5s->
```

Rejected: a timer in wall-clock time (drifts while the tab is hidden); trimming each piece to a loop by hand (loses the endings the author wrote).

### 3. The menu track in `App`

`App` sets the menu track whenever the screen is not the table. On leaving the table, `SoundLayer`'s unmount clears the music first, then `App`'s effect asks for the menu theme; `audio.music()` crossfades from whatever is still fading.

### 4. Licences

`license: "CC0" | "own" | "provided"`, `source` optional and required for CC0 (schema refinement). `checkCandidates` skips slots whose clip is not CC0; the credits list the author's own and the provided clips apart from the CC0 sources.

## Risks / Trade-offs

- [The supplied effects' origin is unknown] -> marked `provided`; to be confirmed before a public deploy.
- [About 40 MB of music] -> each track loads only when first played; budget raised to 50 MB.
- [The hand-over needs the next take decoded] -> it starts loading when the current take starts, a minute or more ahead.

## Migration Plan

None.

## Open Questions

None. In-force ADRs reviewed: ADR-0002 (the sound layer follows the event clock), ADR-0009 (fixed loudness), ADR-0004 (music is screen state derived from the game).
