import { describe, expect, it } from "vitest";
import { encodeArgs, levelFilter, measureFilter, placeholderInput, TARGETS } from "./import-sounds";

describe("import-sounds", () => {
  it("encodes an effect to mono MP3, trimmed when the manifest says so", () => {
    const args = encodeArgs("effect", ["-i", "src/snap.wav"], "public/sounds/snap.mp3", [0.5, 1.2]);
    expect(args).toEqual(["-y", "-i", "src/snap.wav", "-ss", "0.5", "-to", "1.2", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "80k", "public/sounds/snap.mp3"]);
  });

  it("encodes a track to AAC and to Opus, keeping stereo", () => {
    expect(encodeArgs("aac", ["-i", "src/bed.wav"], "public/sounds/bed.m4a")).toEqual(["-y", "-i", "src/bed.wav", "-c:a", "aac", "-b:a", "96k", "public/sounds/bed.m4a"]);
    expect(encodeArgs("opus", ["-i", "src/bed.wav"], "public/sounds/bed.webm")).toEqual(["-y", "-i", "src/bed.wav", "-c:a", "libopus", "-b:a", "80k", "public/sounds/bed.webm"]);
  });

  it("synthesises a placeholder from the clip id, short for effects and a loop for music", () => {
    expect(placeholderInput("snap", "effect").join(" ")).toMatch(/lavfi/);
    expect(placeholderInput("snap", "effect").join(" ")).toMatch(/duration=0\.\d/);
    expect(placeholderInput("bed-gathering", "music").join(" ")).toMatch(/duration=8/);
  });

  it("puts the loudness filter before the codec when one is given", () => {
    const args = encodeArgs("effect", ["-i", "a.wav"], "a.mp3", undefined, "loudnorm=I=-18");
    expect(args.slice(args.indexOf("-af"), args.indexOf("-af") + 2)).toEqual(["-af", "loudnorm=I=-18"]);
    expect(args.indexOf("-af")).toBeLessThan(args.indexOf("-c:a"));
  });

  it("measures an effect as dual mono and a track as it is, both with the R128 meter", () => {
    expect(measureFilter("effect")).toBe("aformat=channel_layouts=mono,pan=stereo|c0=c0|c1=c0,apad=whole_dur=0.5,ebur128=peak=true");
    expect(measureFilter("music")).toMatch(/^silenceremove=.*areverse,apad=whole_dur=0.5,ebur128=peak=true$/);
    expect(TARGETS.effect.lufs).toBe(-18);
  });

  it("levels a sustained clip to the target loudness", () => {
    expect(levelFilter("effect", { lufs: -27.1, peak: -12 })).toBe("aformat=channel_layouts=mono,volume=9.1dB");
    expect(levelFilter("music", { lufs: -20, peak: -6 })).toMatch(/^silenceremove=.*areverse,volume=-3dB$/);
  });

  it("stops a transient at the peak ceiling instead of reaching the target", () => {
    expect(levelFilter("effect", { lufs: -29, peak: -3 })).toBe("aformat=channel_layouts=mono,volume=1dB");
  });
});
