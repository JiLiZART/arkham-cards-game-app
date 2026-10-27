import type { ContentError } from "./loader";
import type { SoundCandidates, SoundManifest } from "./schema";
import { slotsOf } from "./soundSlots";

/** bytes: effects stay small enough to ship with the first load; music loads after the game starts */
export const EFFECTS_BUDGET = 1_500_000;
export const MUSIC_BUDGET = 12_000_000;
/** the formats a music track ships in: AAC for Safari, Opus for the rest */
export const MUSIC_FORMATS = ["m4a", "webm"] as const;

const FILE = "content/sounds/sounds.json";

/**
 * The checks that need the file system: every clip's converted file exists under public/sounds (both formats for a
 * track), every event with a sound is one the UI animates (a sound keyed to an event that never plays would never be
 * heard), and the size budgets hold. `size` returns a file's size in bytes, or null when it is absent.
 */
export function checkSounds(
  m: SoundManifest,
  size: (path: string) => number | null,
  animated: ReadonlySet<string>,
): ContentError[] {
  const errors: ContentError[] = [];
  let effectsBytes = 0;
  for (const [id, clip] of Object.entries(m.effects)) {
    const n = size(clip.file);
    if (n === null)
      errors.push({
        file: FILE,
        path: `effects.${id}`,
        message: `missing file public/sounds/${clip.file}`,
      });
    else effectsBytes += n;
  }
  let musicBytes = 0;
  // two roles may share a track (bed:default and a scenario's bed): its files ship once
  const counted = new Set<string>();
  for (const [id, track] of Object.entries(m.music)) {
    for (const ext of MUSIC_FORMATS) {
      const n = size(`${track.file}.${ext}`);
      if (n === null)
        errors.push({
          file: FILE,
          path: `music.${id}`,
          message: `missing file public/sounds/${track.file}.${ext}`,
        });
      else if (!counted.has(`${track.file}.${ext}`)) {
        counted.add(`${track.file}.${ext}`);
        musicBytes += n;
      }
    }
  }
  for (const key of Object.keys(m.events)) {
    const type = key.split(":")[0];
    if (!animated.has(type))
      errors.push({
        file: FILE,
        path: `events.${key}`,
        message: `event ${type} is never animated, its sound would never play`,
      });
  }
  if (effectsBytes > EFFECTS_BUDGET)
    errors.push({
      file: FILE,
      path: "effects",
      message: `effects total ${effectsBytes} bytes, over the ${EFFECTS_BUDGET} budget`,
    });
  if (musicBytes > MUSIC_BUDGET)
    errors.push({
      file: FILE,
      path: "music",
      message: `music total ${musicBytes} bytes, over the ${MUSIC_BUDGET} budget`,
    });
  return errors;
}

/** measurements of a converted file; null when the file can't be read */
export type SoundProbe = {
  /** integrated loudness (LUFS) and true peak (dBTP) of a file under public/sounds */
  loudness: (file: string) => { lufs: number; peak: number } | null;
  /** dB between the 200 ms at the loop's start and the 200 ms before its end */
  seam: (file: string, loopStart: number, loopEnd?: number) => number | null;
};
/** the targets the importer levels to (ADR-0009), the tolerance, the true-peak limit, the peak above which a quiet clip counts as held by the ceiling, and the loop seam limit */
export const LOUDNESS = {
  effect: -18,
  music: -23,
  tolerance: 2,
  peak: -1,
  held: -4,
  seam: 6,
} as const;

/** Every converted effect is within 2 LU of -18 LUFS (or held below it by the peak ceiling) and under -1 dBTP; every track likewise near -23, and its loop seam under 6 dB. */
export function checkLoudness(m: SoundManifest, probe: SoundProbe): ContentError[] {
  const errors: ContentError[] = [];
  const level = (path: string, file: string, target: number) => {
    const l = probe.loudness(file);
    if (!l) return;
    // a transient the peak ceiling holds below the target is as loud as it can be; anything else must be within the tolerance
    const held = l.lufs < target && l.peak >= LOUDNESS.held;
    if (l.lufs > target + LOUDNESS.tolerance || (l.lufs < target - LOUDNESS.tolerance && !held))
      errors.push({
        file: FILE,
        path,
        message: `${file} is ${l.lufs.toFixed(1)} LUFS, more than ${LOUDNESS.tolerance} LU from ${target} (npm run import:sounds)`,
      });
    if (l.peak >= LOUDNESS.peak)
      errors.push({
        file: FILE,
        path,
        message: `${file} peaks at ${l.peak.toFixed(1)} dBTP, not under ${LOUDNESS.peak} (npm run import:sounds)`,
      });
  };
  for (const [id, clip] of Object.entries(m.effects))
    level(`effects.${id}`, clip.file, LOUDNESS.effect);
  for (const [id, track] of Object.entries(m.music)) {
    level(`music.${id}`, `${track.file}.m4a`, LOUDNESS.music);
    if (!track.loop) continue;
    const d = probe.seam(`${track.file}.m4a`, track.loopStart ?? 0, track.loopEnd);
    if (d !== null && Math.abs(d) > LOUDNESS.seam)
      errors.push({
        file: FILE,
        path: `music.${id}`,
        message: `loop seam of ${track.file} is ${Math.abs(d).toFixed(1)} dB, over ${LOUDNESS.seam} dB: the loop will pump`,
      });
  }
  return errors;
}

/** Every slot of the manifest (and any `required` slot) has its candidates listed in candidates.json. */
export function checkCandidates(
  m: SoundManifest,
  c: SoundCandidates,
  required: readonly string[] = [],
): ContentError[] {
  return [...new Set([...slotsOf(m), ...required])]
    .filter((slot) => !c.slots[slot])
    .map((slot) => ({
      file: "content/sounds/candidates.json",
      path: slot,
      message: "no candidates for this slot (npm run import:sounds -- --candidates)",
    }));
}

/** The manifest has a value (a clip or "none") for exactly the moments the UI plays: no typo, no silent new moment. */
export function checkMoments(m: SoundManifest, moments: readonly string[]): ContentError[] {
  const listed = new Set(moments);
  return [
    ...Object.keys(m.moments)
      .filter((k) => !listed.has(k))
      .map((k) => ({
        file: FILE,
        path: `moments.${k}`,
        message: "no UI moment of this name is ever played (add it to MOMENTS in src/ui/assets/sounds.ts)",
      })),
    ...moments
      .filter((k) => !(k in m.moments))
      .map((k) => ({
        file: FILE,
        path: `moments.${k}`,
        message: "a UI moment with no value in the manifest (a clip, or none)",
      })),
  ];
}
