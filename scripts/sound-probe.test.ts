import { describe, expect, it } from "vitest";
import { parseDuration, parseEbur128, parseRms } from "./sound-probe";

describe("sound-probe parsing", () => {
  it("reads integrated loudness and true peak from the ebur128 summary", () => {
    const log =
      "  Integrated loudness:\n    I:         -18.3 LUFS\n    Threshold: -28.3 LUFS\n\n  True peak:\n    Peak:       -2.1 dBFS\n";
    expect(parseEbur128(log)).toEqual({ lufs: -18.3, peak: -2.1 });
    expect(parseEbur128("nothing")).toBeNull();
  });

  it("reads the overall RMS level from astats", () => {
    expect(
      parseRms(
        "[Parsed_astats_0] Overall\n[Parsed_astats_0] RMS level dB: -24.512\n[Parsed_astats_0] Peak level dB: -3",
      ),
    ).toBe(-24.512);
    expect(parseRms("RMS level dB: -inf")).toBe(-90);
    expect(parseRms("x")).toBeNull();
  });

  it("reads a file's duration", () => {
    expect(parseDuration("  Duration: 00:01:02.50, start: 0.000000, bitrate: 96 kb/s")).toBe(62.5);
    expect(parseDuration("x")).toBeNull();
  });
});
