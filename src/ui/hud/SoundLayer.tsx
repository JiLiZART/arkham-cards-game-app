import { useEffect, useRef } from "react";
import type { GameState, InstId } from "../../engine/types";
import { audio } from "../audio";
import { db, gameStore, useGame } from "../context";
import { effectFor, gainOf, mayPlay, momentClip, musicFor } from "../sounds";
import { useView } from "../view";
import type { QueuedEvent } from "../store";

const sounds = () => db.sounds;

/** the sliders and the mute, live, on every screen: the category buses carry them, each clip its own gain */
export function useAudioLevels() {
  const musicVolume = useGame((s) => s.musicVolume);
  const sfxVolume = useGame((s) => s.sfxVolume);
  const muted = useGame((s) => s.muted);
  useEffect(() => {
    const settings = { musicVolume, sfxVolume, muted };
    audio.setLevel("music", gainOf(settings, "music", 1));
    audio.setLevel("effects", gainOf(settings, "effects", 1));
  }, [musicVolume, sfxVolume, muted]);
}

const lastMoment = new Map<string, number>();

/**
 * Play the clip for a UI moment (a card landing, a flip, a button, a tab…), with the card's own clip for play, fight and
 * spawn. It works without a game (menus); `scale` softens or strengthens it (the token clatter by count); a moment
 * repeated within a few ms is one sound.
 */
export function moment(name: string, cardId: InstId | null = null, scale = 1) {
  const clip = momentClip(name, cardId, gameStore.getState().game, sounds());
  if (!clip || !mayPlay(lastMoment, name, performance.now())) return;
  void audio.play(clip, sounds().effects[clip].file, sounds().effects[clip].gain * scale);
}

/**
 * The only component that knows audio exists (ADR-0002): effects when an event starts playing on screen, the music
 * track from the game state, the levels from the settings. Renders nothing.
 */
export function SoundLayer() {
  const game = useGame((s) => s.game) as GameState;
  const playing = useView((s) => s.playing) as QueuedEvent | null;
  // the state runs ahead of the screen while events wait to play: the music changes once the screen has caught up
  const idle = useGame((s) => !s.current && s.queue.length === 0);

  // effects are small: have them decoded before their first play (after the unlock, when the context exists)
  useEffect(() => {
    const warm = () => audio.preload(Object.values(sounds().effects).map((c) => c.file));
    warm();
    window.addEventListener("pointerdown", warm, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", warm, true);
  }, []);

  // an event starts on screen: its clips
  const last = useRef<QueuedEvent | null>(null);
  useEffect(() => {
    if (!playing || playing === last.current) return;
    last.current = playing;
    for (const id of effectFor(playing, game, sounds()) ?? []) void audio.play(id, sounds().effects[id].file, sounds().effects[id].gain);
  }, [playing, game]);

  // a fight begins: the weapon's sound (the test start has no animation of its own)
  const testSeen = useRef<number | null>(null);
  useEffect(() => {
    const t = game.skillTest;
    if (!t || t.id === testSeen.current) return;
    testSeen.current = t.id;
    if (t.kind === "fight") moment("fight", t.source);
  }, [game]);

  // the music follows the state of play, as shown
  useEffect(() => {
    if (!idle) return;
    const id = musicFor(game, sounds());
    const track = id ? sounds().music[id] : null;
    audio.music(id, track ? { stem: track.file, loop: track.loop, loopStart: track.loopStart, loopEnd: track.loopEnd } : null, track?.gain ?? 1);
  }, [game, idle]);

  // leaving the table (menu, campaign log): silence
  useEffect(() => () => audio.music(null, null, 0), []);

  return null;
}
