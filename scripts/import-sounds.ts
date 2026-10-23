/**
 * Converts the sounds named in content/sounds/sounds.json into the files the game ships (public/sounds): effects as
 * mono MP3, music as AAC (.m4a) and Opus (.webm), each loudness-normalised in two passes (ADR-0009). Originals are read from sounds-src/<original> (untracked); a clip
 * with no original gets a synthesised placeholder, so the game is never silent while CC0 recordings are still being
 * chosen. Usage: npm run import:sounds [-- clipId ...]; with --candidates, builds the five candidates per slot instead (build-candidates.ts)
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { SoundManifest } from "../src/content/schema";
import { type Measured, parseEbur128 } from "./sound-probe";

export type Kind = "effect" | "aac" | "opus";

/** ffmpeg arguments for one output; `input` is the input part ("-i file" or a lavfi source) */
export function encodeArgs(
  kind: Kind,
  input: string[],
  out: string,
  trim?: [number, number],
  filter?: string,
): string[] {
  const cut = trim ? ["-ss", String(trim[0]), "-to", String(trim[1])] : [];
  const codec =
    kind === "effect"
      ? ["-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "80k"]
      : kind === "aac"
        ? ["-c:a", "aac", "-b:a", "96k"]
        : ["-c:a", "libopus", "-b:a", "80k"];
  return ["-y", ...input, ...cut, ...(filter ? ["-af", filter] : []), ...codec, out];
}

/** fixed levels (ADR-0009): integrated LUFS to reach, and the true-peak ceiling (under -1 dBTP once the encoder overshoots) */
export const TARGETS = {
  effect: { lufs: -18, ceiling: -2 },
  music: { lufs: -23, ceiling: -2 },
} as const;

/** a looped track must not start or end in silence, or the loop pumps: cut both ends back to the first sound */
const TRIM_SILENCE =
  "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,";

/**
 * What an effect is measured and levelled as: mono, the way it ships, played from both speakers (dual mono, 3 LU above
 * a bare mono reading). A late downmix would add up to 6 dB of peak.
 */
const prefix = (category: keyof typeof TARGETS) =>
  category === "effect" ? "aformat=channel_layouts=mono,pan=stereo|c0=c0|c1=c0," : TRIM_SILENCE;
/** the downmix alone, for the level filter (the output stays mono) */
const downmix = (category: keyof typeof TARGETS) =>
  category === "effect" ? "aformat=channel_layouts=mono," : TRIM_SILENCE;

/** the measuring pass: the same EBU R128 meter the content check uses; a clip under 400 ms is padded so it has a block */
export function measureFilter(category: keyof typeof TARGETS): string {
  return `${prefix(category)}apad=whole_dur=0.5,ebur128=peak=true`;
}

/**
 * The gain that brings the measured clip to the target loudness, or only as far as its peak may go when it is a
 * transient (a click can't reach -18 LUFS under the ceiling without a limiter squashing it, so it is peak-normalised).
 */
export function levelFilter(category: keyof typeof TARGETS, measured: Measured): string {
  const t = TARGETS[category];
  const gain = Math.min(t.lufs - measured.lufs, t.ceiling - measured.peak);
  return `${downmix(category)}volume=${Math.round(gain * 100) / 100}dB`;
}

/** measure the (trimmed) clip; clips under 400 ms are padded with silence for the measurement only */
export function measure(
  category: keyof typeof TARGETS,
  input: string[],
  trim?: [number, number],
): Measured {
  const cut = trim ? ["-ss", String(trim[0]), "-to", String(trim[1])] : [];
  const r = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-y",
      ...input,
      ...cut,
      "-af",
      measureFilter(category),
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(`ffmpeg failed measuring loudness:\n${r.stderr}`);
  const m = parseEbur128(r.stderr);
  if (!m) throw new Error("no loudness measurement in ffmpeg's output");
  return m;
}

/** a stand-in sound synthesised from the clip's id: a short tone or noise burst for an effect, an 8 s drone for music */
export function placeholderInput(id: string, kind: "effect" | "music"): string[] {
  // a stable pitch per id, so clips are told apart by ear
  const hash = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  if (kind === "music") {
    const f = 50 + (hash % 40);
    return ["-f", "lavfi", "-i", `sine=frequency=${f}:duration=8,tremolo=f=0.25:d=0.6,volume=0.4`];
  }
  const noisy =
    /rattle|shuffle|slide|steps|footstep|breath|growl|strike|hit|thud|gunshot|blade/.test(id);
  const f = 220 + (hash % 600);
  const d = /sting|swell|two-note|page|bell|chime/.test(id) ? 0.6 : 0.2;
  return noisy
    ? [
        "-f",
        "lavfi",
        "-i",
        `anoisesrc=duration=${d}:color=pink:amplitude=0.6,afade=t=out:st=0:d=${d}`,
      ]
    : ["-f", "lavfi", "-i", `sine=frequency=${f}:duration=${d},afade=t=out:st=0:d=${d},volume=0.6`];
}

export function run(args: string[]) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], {
    stdio: "inherit",
  });
}

async function main() {
  if (process.argv.includes("--candidates")) {
    const { buildCandidates } = await import("./build-candidates");
    await buildCandidates();
    return;
  }
  const encoders = execFileSync("ffmpeg", ["-hide_banner", "-encoders"]).toString();
  for (const enc of ["libopus", "aac", "libmp3lame"])
    if (!encoders.includes(` ${enc} `))
      throw new Error(
        `ffmpeg lacks the ${enc} encoder; install one built with it (brew install ffmpeg)`,
      );
  const m = SoundManifest.parse(
    (await import("../content/sounds/sounds.json", { with: { type: "json" } })).default,
  );
  const only = new Set(process.argv.slice(2));
  const wanted = (id: string) => !only.size || only.has(id);
  mkdirSync("public/sounds", { recursive: true });
  let real = 0;
  let synth = 0;
  for (const [id, c] of Object.entries(m.effects)) {
    if (!wanted(id)) continue;
    const src = c.original ? `sounds-src/${c.original}` : null;
    if (src && !existsSync(src)) throw new Error(`${id}: original ${src} not found`);
    const input = src ? ["-i", src] : placeholderInput(id, "effect");
    const trim = src ? c.trim : undefined;
    run(
      encodeArgs(
        "effect",
        input,
        `public/sounds/${c.file}`,
        trim,
        levelFilter("effect", measure("effect", input, trim)),
      ),
    );
    if (src) real++;
    else synth++;
  }
  for (const [id, t] of Object.entries(m.music)) {
    if (!wanted(id)) continue;
    const src = t.original ? `sounds-src/${t.original}` : null;
    if (src && !existsSync(src)) throw new Error(`${id}: original ${src} not found`);
    const input = src ? ["-i", src] : placeholderInput(t.file, "music");
    const trim = src ? t.trim : undefined;
    const filter = levelFilter("music", measure("music", input, trim));
    run(encodeArgs("aac", input, `public/sounds/${t.file}.m4a`, trim, filter));
    run(encodeArgs("opus", input, `public/sounds/${t.file}.webm`, trim, filter));
    if (src) real++;
    else synth++;
  }
  console.log(`sounds: ${real} from originals, ${synth} synthesised placeholders`);
}

if (process.argv[1]?.endsWith("import-sounds.ts"))
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
