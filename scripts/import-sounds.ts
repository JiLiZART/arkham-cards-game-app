/**
 * Converts the sounds named in content/sounds/sounds.json into the files the game ships (public/sounds): effects as
 * mono MP3, music as AAC (.m4a) and Opus (.webm). Originals are read from sounds-src/<original> (untracked); a clip
 * with no original gets a synthesised placeholder, so the game is never silent while CC0 recordings are still being
 * chosen. Usage: npm run import:sounds [-- clipId ...]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { SoundManifest } from "../src/content/schema";

export type Kind = "effect" | "aac" | "opus";

/** ffmpeg arguments for one output; `input` is the input part ("-i file" or a lavfi source) */
export function encodeArgs(kind: Kind, input: string[], out: string, trim?: [number, number]): string[] {
  const cut = trim ? ["-ss", String(trim[0]), "-to", String(trim[1])] : [];
  const codec = kind === "effect" ? ["-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "80k"] : kind === "aac" ? ["-c:a", "aac", "-b:a", "96k"] : ["-c:a", "libopus", "-b:a", "80k"];
  return ["-y", ...input, ...cut, ...codec, out];
}

/** a stand-in sound synthesised from the clip's id: a short tone or noise burst for an effect, an 8 s drone for music */
export function placeholderInput(id: string, kind: "effect" | "music"): string[] {
  // a stable pitch per id, so clips are told apart by ear
  const hash = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  if (kind === "music") {
    const f = 50 + (hash % 40);
    return ["-f", "lavfi", "-i", `sine=frequency=${f}:duration=8,tremolo=f=0.25:d=0.6,volume=0.4`];
  }
  const noisy = /rattle|shuffle|slide|steps|footstep|breath|growl|strike|hit|thud|gunshot|blade/.test(id);
  const f = 220 + (hash % 600);
  const d = /sting|swell|two-note|page|bell|chime/.test(id) ? 0.6 : 0.2;
  return noisy
    ? ["-f", "lavfi", "-i", `anoisesrc=duration=${d}:color=pink:amplitude=0.6,afade=t=out:st=0:d=${d}`]
    : ["-f", "lavfi", "-i", `sine=frequency=${f}:duration=${d},afade=t=out:st=0:d=${d},volume=0.6`];
}

function run(args: string[]) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
}

async function main() {
  const encoders = execFileSync("ffmpeg", ["-hide_banner", "-encoders"]).toString();
  for (const enc of ["libopus", "aac", "libmp3lame"]) if (!encoders.includes(` ${enc} `)) throw new Error(`ffmpeg lacks the ${enc} encoder; install one built with it (brew install ffmpeg)`);
  const m = SoundManifest.parse((await import("../content/sounds/sounds.json", { with: { type: "json" } })).default);
  const only = new Set(process.argv.slice(2));
  const wanted = (id: string) => !only.size || only.has(id);
  mkdirSync("public/sounds", { recursive: true });
  let real = 0;
  let synth = 0;
  for (const [id, c] of Object.entries(m.effects)) {
    if (!wanted(id)) continue;
    const src = c.original ? `sounds-src/${c.original}` : null;
    if (src && !existsSync(src)) throw new Error(`${id}: original ${src} not found`);
    run(encodeArgs("effect", src ? ["-i", src] : placeholderInput(id, "effect"), `public/sounds/${c.file}`, src ? c.trim : undefined));
    if (src) real++;
    else synth++;
  }
  for (const [id, t] of Object.entries(m.music)) {
    if (!wanted(id)) continue;
    const src = t.original ? `sounds-src/${t.original}` : null;
    if (src && !existsSync(src)) throw new Error(`${id}: original ${src} not found`);
    const input = src ? ["-i", src] : placeholderInput(t.file, "music");
    run(encodeArgs("aac", input, `public/sounds/${t.file}.m4a`, src ? t.trim : undefined));
    run(encodeArgs("opus", input, `public/sounds/${t.file}.webm`, src ? t.trim : undefined));
    if (src) real++;
    else synth++;
  }
  console.log(`sounds: ${real} from originals, ${synth} synthesised placeholders`);
}

if (process.argv[1]?.endsWith("import-sounds.ts")) main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
