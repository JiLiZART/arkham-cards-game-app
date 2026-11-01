/**
 * The Web Audio wrapper: no game knowledge. One context created inside the first user gesture (browsers keep audio
 * suspended until then), a gain node per category, decoded buffers cached, music as one track at a time (looping,
 * or a composed piece crossfading into its other take before it ends) with a crossfade between tracks, and a pause while the tab is hidden. A play before the unlock is dropped; a track
 * asked for before the unlock starts on it. In dev, `window.__arkhamAudio` logs what played for the browser scripts.
 */
import { asset } from "./images";

export type Category = "music" | "effects";
export interface MusicFiles {
  /** file stem under public/sounds, served as .m4a (AAC) and .webm (Opus) */
  stem: string;
  loop: boolean;
  loopStart?: number;
  loopEnd?: number;
  /** a track that doesn't loop (a composed piece with an ending): the stem crossfaded in before it ends, then back */
  next?: string;
}
export interface AudioLogEntry {
  t: number;
  kind: "effect" | "music" | "unlock" | "pause" | "resume" | "dropped";
  id: string;
}

const CROSSFADE = 1.5;
const RAMP = 0.05;

interface Playing {
  id: string;
  /** every source the track has scheduled (a take and the one crossfading in), stopped together */
  sources: Set<AudioScheduledSourceNode>;
  gain: GainNode;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bus: Record<Category, GainNode> | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  /** urls to fetch past the HTTP cache next time (a file the dev picker has just rewritten) */
  private stale = new Set<string>();
  private audition_: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private levels: Record<Category, number> = { music: 0.5, effects: 0.8 };
  private current: Playing | null = null;
  private wanted: { id: string; files: MusicFiles; gain: number } | null = null;
  readonly log: AudioLogEntry[] = [];
  unlocked = false;

  constructor() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      this.unlock();
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx || !this.unlocked) return;
      if (document.hidden) {
        void this.ctx.suspend();
        this.note("pause", this.current?.id ?? "");
      } else {
        void this.ctx.resume();
        this.note("resume", this.current?.id ?? "");
      }
    });
  }

  private note(kind: AudioLogEntry["kind"], id: string) {
    this.log.push({ t: Date.now(), kind, id });
    if (this.log.length > 500) this.log.splice(0, this.log.length - 500);
  }

  /** called from the first gesture: create the context, apply the levels, start the track that was asked for */
  private unlock() {
    if (this.unlocked) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    void this.ctx.resume();
    this.bus = { music: this.ctx.createGain(), effects: this.ctx.createGain() };
    for (const c of ["music", "effects"] as const) {
      this.bus[c].gain.value = this.levels[c];
      this.bus[c].connect(this.ctx.destination);
    }
    this.unlocked = true;
    this.note("unlock", "");
    if (this.wanted) void this.startMusic(this.wanted.id, this.wanted.files, this.wanted.gain);
  }

  /** the category's level, 0 to 1, applied with a short ramp so a change never clicks */
  setLevel(category: Category, level: number) {
    this.levels[category] = level;
    if (!this.ctx || !this.bus) return;
    const g = this.bus[category].gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(level, this.ctx.currentTime + RAMP);
  }

  private music_url(stem: string) {
    const aac =
      typeof document !== "undefined" &&
      document.createElement("audio").canPlayType('audio/mp4; codecs="mp4a.40.2"');
    return asset(`sounds/${stem}.${aac ? "m4a" : "webm"}`);
  }

  /** fetch and decode once; a missing or undecodable file resolves to null and is silent */
  private buffer(url: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(url);
    if (!p) {
      p = (async () => {
        try {
          const res = await fetch(url, this.stale.delete(url) ? { cache: "reload" } : undefined);
          if (!res.ok) return null;
          const data = await res.arrayBuffer();
          return this.ctx ? await this.ctx.decodeAudioData(data) : null;
        } catch {
          return null;
        }
      })();
      this.buffers.set(url, p);
    }
    return p;
  }

  /** warm the cache for the effects, so the first play of each is on time (needs the context: after the unlock) */
  preload(files: string[]) {
    if (!this.ctx) return;
    for (const f of files) void this.buffer(asset(`sounds/${f}`));
  }

  /** play an effect once at `gain` (its own gain times the slider); dropped before the unlock */
  async play(id: string, file: string, gain: number) {
    if (!this.ctx || !this.bus) {
      this.note("dropped", id);
      return;
    }
    const buf = await this.buffer(asset(`sounds/${file}`));
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.bus.effects);
    src.start();
    this.note("effect", id);
  }

  /**
   * Dev picker: play any file once on a category's bus, stopping the previous audition. `from` and `length` (seconds)
   * pick an excerpt, for a music track. Returns once playback has started (false when it could not).
   */
  async audition(
    url: string,
    category: Category,
    gain: number,
    from = 0,
    length?: number,
  ): Promise<boolean> {
    this.stopAudition();
    const buf = await this.buffer(url);
    if (!buf || !this.ctx || !this.bus) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.bus[category]);
    const t = this.ctx.currentTime;
    src.start(t, from);
    if (length !== undefined) {
      g.gain.setValueAtTime(gain, t + Math.max(0, length - 0.4));
      g.gain.linearRampToValueAtTime(0, t + length);
      src.stop(t + length + 0.05);
    }
    this.audition_ = { source: src, gain: g };
    this.note("effect", `audition:${url}`);
    return true;
  }

  stopAudition() {
    this.audition_?.source.stop();
    this.audition_ = null;
  }

  /** drop the decoded copies of files that were rewritten on disk (effects as files; music as stems) */
  forget(files: string[], stems: string[] = []) {
    const urls = [
      ...files.map((f) => asset(`sounds/${f}`)),
      ...stems.flatMap((t) => [asset(`sounds/${t}.m4a`), asset(`sounds/${t}.webm`)]),
    ];
    for (const u of urls) {
      this.buffers.delete(u);
      this.stale.add(u);
    }
  }

  /** the track that should be playing now (null for silence); idempotent, crossfading on a change */
  music(id: string | null, files: MusicFiles | null, gain: number) {
    if (id && files) this.wanted = { id, files, gain };
    else this.wanted = null;
    if (!this.ctx) return;
    if (this.current?.id === id) return;
    if (id && files) void this.startMusic(id, files, gain);
    else this.stopMusic();
  }

  private stopMusic() {
    if (!this.ctx || !this.current) return;
    const { sources, gain } = this.current;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + CROSSFADE);
    for (const s of sources) s.stop(t + CROSSFADE + 0.05);
    this.current = null;
  }

  /**
   * One take of a track that doesn't loop, from `at` (ctx time), fading in when it follows another; a silent tick a
   * second before its end schedules the following take to crossfade in (ctx time, so a hidden tab's pause holds it).
   */
  private playTake(playing: Playing, buf: AudioBuffer, at: number, stems: string[], n: number) {
    const ctx = this.ctx;
    if (!ctx || this.current !== playing) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const end = at + buf.duration;
    g.gain.setValueAtTime(n === 0 ? 1 : 0, at);
    g.gain.linearRampToValueAtTime(1, at + (n === 0 ? 0 : CROSSFADE));
    g.gain.setValueAtTime(1, end - CROSSFADE);
    g.gain.linearRampToValueAtTime(0, end);
    src.connect(g).connect(playing.gain);
    src.start(at);
    playing.sources.add(src);
    src.onended = () => playing.sources.delete(src);
    const following = this.buffer(this.music_url(stems[(n + 1) % stems.length]));
    const tick = ctx.createConstantSource();
    tick.offset.value = 0;
    tick.connect(playing.gain);
    tick.onended = () => {
      playing.sources.delete(tick);
      void following.then(
        (next) => next && this.playTake(playing, next, end - CROSSFADE, stems, n + 1),
      );
    };
    tick.start(Math.max(at, end - CROSSFADE - 1));
    tick.stop(Math.max(at, end - CROSSFADE - 1) + 0.01);
    playing.sources.add(tick);
  }

  private async startMusic(id: string, files: MusicFiles, gain: number) {
    const buf = await this.buffer(this.music_url(files.stem));
    // the wish may have changed while the file loaded
    if (!buf || !this.ctx || !this.bus || this.wanted?.id !== id || this.current?.id === id) return;
    this.stopMusic();
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + CROSSFADE);
    g.connect(this.bus.music);
    const playing: Playing = { id, sources: new Set(), gain: g };
    this.current = playing;
    if (files.loop) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      if (files.loopStart !== undefined) src.loopStart = files.loopStart;
      if (files.loopEnd !== undefined) src.loopEnd = files.loopEnd;
      src.connect(g);
      src.start();
      playing.sources.add(src);
    } else this.playTake(playing, buf, t, [files.stem, files.next ?? files.stem], 0);
    this.note("music", id);
  }

  /** the track playing now, for the dev hook */
  get track() {
    return this.current?.id ?? null;
  }

  /** the category levels as set, for the dev hook */
  get levelsNow(): Record<Category, number> {
    return { ...this.levels };
  }
}

export const audio = new AudioEngine();

if (typeof window !== "undefined" && import.meta.env?.DEV) {
  Object.assign(window, {
    __arkhamAudio: {
      log: audio.log,
      track: () => audio.track,
      unlocked: () => audio.unlocked,
      levels: () => audio.levelsNow,
    },
  });
}
