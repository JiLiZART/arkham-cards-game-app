import { describe, expect, it } from "vitest";
import { SoundManifest } from "./schema";
import { checkSounds, EFFECTS_BUDGET, MUSIC_BUDGET } from "./soundChecks";

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
