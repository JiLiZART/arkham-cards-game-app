import { describe, expect, it } from "vitest";
import { SoundCandidates, SoundManifest } from "./schema";
import { checkCandidates, checkLoudness, checkMoments, checkSounds, EFFECTS_BUDGET, MUSIC_BUDGET, type SoundProbe } from "./soundChecks";

const clip = { file: "snap.mp3", source: "https://kenney.nl/assets/casino-audio", author: "Kenney", license: "CC0" };
const manifest = SoundManifest.parse({
  effects: { snap: clip },
  music: { fight: { ...clip, file: "fight" } },
  events: { attack: "snap" },
  moments: { play: "snap" },
});
const animated = new Set(["attack", "damage"]);
/** file sizes by path under public/sounds, null when absent */
const sizes = (s: Record<string, number | null>) => (path: string) => s[path] ?? null;

describe("checkSounds", () => {
  it("passes when every file exists, every event is animated and the budgets hold", () => {
    expect(checkSounds(manifest, sizes({ "snap.mp3": 10_000, "fight.m4a": 1_000_000, "fight.webm": 900_000 }), animated)).toEqual([]);
  });

  it("reports a missing effect file and a missing music format", () => {
    const errors = checkSounds(manifest, sizes({ "fight.m4a": 1 }), animated);
    expect(errors.map((e) => e.path)).toEqual(expect.arrayContaining(["effects.snap", "music.fight"]));
    expect(errors.map((e) => e.message).join(" ")).toContain("fight.webm");
  });

  it("reports an event with no animation (its sound would never play)", () => {
    const m = SoundManifest.parse({ ...manifest, events: { attack: "snap", resource: "snap", "damage:horror": "snap" } });
    const errors = checkSounds(m, sizes({ "snap.mp3": 1, "fight.m4a": 1, "fight.webm": 1 }), animated);
    expect(errors.map((e) => e.path)).toEqual(["events.resource"]);
  });

  it("reports the budgets", () => {
    const errors = checkSounds(manifest, sizes({ "snap.mp3": EFFECTS_BUDGET + 1, "fight.m4a": MUSIC_BUDGET, "fight.webm": 1 }), animated);
    expect(errors.map((e) => e.path).sort()).toEqual(["effects", "music"]);
  });
});

describe("checkLoudness", () => {
  const probe = (p: Partial<SoundProbe>): SoundProbe => ({ loudness: () => ({ lufs: -18, peak: -3 }), seam: () => 1, ...p });

  it("passes effects at the target and loops whose ends match", () => {
    expect(checkLoudness(manifest, probe({ loudness: (f) => (f === "snap.mp3" ? { lufs: -18.5, peak: -2 } : { lufs: -23, peak: -2 }) }))).toEqual([]);
  });

  it("reports a track more than 2 LU above -23", () => {
    expect(checkLoudness(manifest, probe({ loudness: (f) => (f === "snap.mp3" ? { lufs: -18, peak: -3 } : { lufs: -18, peak: -3 }) })).map((e) => e.path)).toEqual(["music.fight"]);
  });

  it("accepts a quiet transient whose peak sits at the ceiling, but not a quiet sustained clip", () => {
    const held = checkLoudness(manifest, probe({ loudness: (f) => (f === "snap.mp3" ? { lufs: -24, peak: -2 } : { lufs: -23, peak: -6 }) }));
    expect(held).toEqual([]);
    const quiet = checkLoudness(manifest, probe({ loudness: (f) => (f === "snap.mp3" ? { lufs: -24, peak: -9 } : { lufs: -23, peak: -6 }) }));
    expect(quiet.map((e) => e.path)).toEqual(["effects.snap"]);
  });

  it("reports an effect louder than the target by more than the tolerance", () => {
    expect(checkLoudness(manifest, probe({ loudness: (f) => (f === "snap.mp3" ? { lufs: -14, peak: -3 } : { lufs: -23, peak: -3 }) })).map((e) => e.path)).toEqual(["effects.snap"]);
  });

  it("reports a peak at or above -1 dBTP", () => {
    const errors = checkLoudness(manifest, probe({ loudness: (f) => ({ lufs: f === "snap.mp3" ? -18 : -23, peak: 0 }) }));
    expect(errors.map((e) => e.message).join(" ")).toContain("peak");
  });

  it("reports a loop whose start and end differ by more than 6 dB", () => {
    const errors = checkLoudness(manifest, probe({ loudness: (f) => ({ lufs: f === "snap.mp3" ? -18 : -23, peak: -3 }), seam: () => 9 }));
    expect(errors.map((e) => e.path)).toEqual(["music.fight"]);
    expect(errors[0].message).toContain("seam");
  });

  it("skips a file the probe cannot read (the missing-file check reports it)", () => {
    expect(checkLoudness(manifest, probe({ loudness: () => null, seam: () => null }))).toEqual([]);
  });
});

describe("checkCandidates", () => {
  const entry = (n: number) => ({ original: `kenney/a${n}.ogg`, preview: `x/${n}.mp3`, source: "https://kenney.nl/assets/x", author: "Kenney", license: "CC0", description: `a${n}`, sha256: "a".repeat(64) });
  const slot = { kind: "effect" as const, where: "w", candidates: [1, 2, 3, 4, 5].map(entry) };
  const all = SoundCandidates.parse({ slots: { "event:attack": slot, "moment:play": slot, "music:fight": { ...slot, kind: "music" } } });

  it("passes when every slot of the manifest has candidates", () => {
    expect(checkCandidates(manifest, all)).toEqual([]);
  });

  it("reports a slot of the manifest with no candidates, and a required slot the manifest lacks", () => {
    const some = SoundCandidates.parse({ slots: { "event:attack": slot } });
    expect(checkCandidates(manifest, some).map((e) => e.path)).toEqual(["moment:play", "music:fight"]);
    expect(checkCandidates(manifest, all, ["moment:newOne"]).map((e) => e.path)).toEqual(["moment:newOne"]);
  });

  it("is a schema error to have other than five candidates or a licence other than CC0", () => {
    expect(SoundCandidates.safeParse({ slots: { a: { ...slot, candidates: [entry(1)] } } }).success).toBe(false);
    expect(SoundCandidates.safeParse({ slots: { a: { ...slot, candidates: slot.candidates.map((c) => ({ ...c, license: "CC-BY" })) } } }).success).toBe(false);
  });
});

describe("checkMoments", () => {
  it("passes when the manifest's moments are exactly the list", () => {
    expect(checkMoments(manifest, ["play"])).toEqual([]);
  });

  it("reports a manifest moment the code never plays and a listed moment with no value", () => {
    const errors = checkMoments(manifest, ["play", "draw"]);
    expect(errors.map((e) => e.path)).toEqual(["moments.draw"]);
    expect(checkMoments(manifest, []).map((e) => e.path)).toEqual(["moments.play"]);
  });
});
