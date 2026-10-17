import { describe, expect, it } from "vitest";
import { encodeArgs, placeholderInput } from "./import-sounds";

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
});
