import type { ContentError } from "./loader";
import type { SoundManifest } from "./schema";

/** bytes: effects stay small enough to ship with the first load; music loads after the game starts */
export const EFFECTS_BUDGET = 1_000_000;
export const MUSIC_BUDGET = 10_000_000;
/** the formats a music track ships in: AAC for Safari, Opus for the rest */
export const MUSIC_FORMATS = ["m4a", "webm"] as const;

const FILE = "content/sounds/sounds.json";

/**
 * The checks that need the file system: every clip's converted file exists under public/sounds (both formats for a
 * track), every event with a sound is one the UI animates (a sound keyed to an event that never plays would never be
 * heard), and the size budgets hold. `size` returns a file's size in bytes, or null when it is absent.
 */
export function checkSounds(m: SoundManifest, size: (path: string) => number | null, animated: ReadonlySet<string>): ContentError[] {
  const errors: ContentError[] = [];
  let effectsBytes = 0;
  for (const [id, clip] of Object.entries(m.effects)) {
    const n = size(clip.file);
    if (n === null) errors.push({ file: FILE, path: `effects.${id}`, message: `missing file public/sounds/${clip.file}` });
    else effectsBytes += n;
  }
  let musicBytes = 0;
  for (const [id, track] of Object.entries(m.music)) {
    for (const ext of MUSIC_FORMATS) {
      const n = size(`${track.file}.${ext}`);
      if (n === null) errors.push({ file: FILE, path: `music.${id}`, message: `missing file public/sounds/${track.file}.${ext}` });
      else musicBytes += n;
    }
  }
  for (const key of Object.keys(m.events)) {
    const type = key.split(":")[0];
    if (!animated.has(type)) errors.push({ file: FILE, path: `events.${key}`, message: `event ${type} is never animated, its sound would never play` });
  }
  if (effectsBytes > EFFECTS_BUDGET) errors.push({ file: FILE, path: "effects", message: `effects total ${effectsBytes} bytes, over the ${EFFECTS_BUDGET} budget` });
  if (musicBytes > MUSIC_BUDGET) errors.push({ file: FILE, path: "music", message: `music total ${musicBytes} bytes, over the ${MUSIC_BUDGET} budget` });
  return errors;
}
