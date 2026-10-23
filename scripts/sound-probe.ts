/** Measures converted sound files with ffmpeg for check:content (loudness, true peak, loop seam). */
import { spawnSync } from "node:child_process";
import type { SoundProbe } from "../src/content/soundChecks";

/** loudness (LUFS) and true peak (dBTP) of a file or clip */
export type Measured = { lufs: number; peak: number };

export function parseEbur128(log: string): Measured | null {
  const lufs = log
    .match(/I:\s+(-?[\d.]+) LUFS/g)
    ?.pop()
    ?.match(/(-?[\d.]+) LUFS/)?.[1];
  const peak = log
    .match(/Peak:\s+(-?[\d.]+) dBFS/g)
    ?.pop()
    ?.match(/(-?[\d.]+) dBFS/)?.[1];
  return lufs === undefined || peak === undefined
    ? null
    : { lufs: Number(lufs), peak: Number(peak) };
}

/** the Overall RMS level of an astats run; silence (-inf) counts as -90 */
export function parseRms(log: string): number | null {
  const m = log
    .match(/RMS level dB:\s+(-?[\d.]+|-inf)/g)
    ?.pop()
    ?.match(/dB:\s+(\S+)/)?.[1];
  return m === undefined ? null : m === "-inf" ? -90 : Number(m);
}

export function parseDuration(log: string): number | null {
  const m = log.match(/Duration:\s+(\d+):(\d+):([\d.]+)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}

/** a mono effect plays from both speakers, so it is measured as dual mono (loudnorm's dual_mono=true), 3 LU above a bare mono measurement */
const DUAL_MONO = "pan=stereo|c0=c0|c1=c0,";

const ffmpeg = (args: string[]) =>
  spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], {
    encoding: "utf8",
  });

export function ffmpegAvailable(): boolean {
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
}

/** a probe over public/sounds; clips under 400 ms are padded with silence so ebur128 has a block to integrate */
export function ffmpegProbe(dir = "public/sounds"): SoundProbe {
  const rms = (file: string, from: number) => {
    const r = ffmpeg([
      "-ss",
      String(Math.max(0, from)),
      "-t",
      "0.2",
      "-i",
      `${dir}/${file}`,
      "-af",
      "astats=metadata=0",
      "-f",
      "null",
      "-",
    ]);
    return r.status === 0 ? parseRms(r.stderr) : null;
  };
  return {
    loudness(file) {
      const r = ffmpeg([
        "-i",
        `${dir}/${file}`,
        "-af",
        `${file.endsWith(".mp3") ? DUAL_MONO : ""}apad=whole_dur=0.5,ebur128=peak=true`,
        "-f",
        "null",
        "-",
      ]);
      return r.status === 0 ? parseEbur128(r.stderr) : null;
    },
    seam(file, loopStart, loopEnd) {
      const end = loopEnd ?? parseDuration(ffmpeg(["-i", `${dir}/${file}`]).stderr);
      if (end === null) return null;
      const a = rms(file, loopStart);
      const b = rms(file, end - 0.2);
      return a === null || b === null ? null : a - b;
    },
  };
}
