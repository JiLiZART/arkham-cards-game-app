import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { buildContent } from "./loader";
import { SoundManifest } from "./schema";

const clip = { file: "snap.mp3", source: "https://kenney.nl/assets/casino-audio", author: "Kenney", license: "CC0" };
const sample = {
  effects: { snap: clip, hit: { ...clip, file: "hit.mp3", gain: 0.7 } },
  music: { "bed:the-gathering": { ...clip, file: "gathering" }, fight: { ...clip, file: "fight" } },
  events: { damage: "hit", "damage:horror": "hit", token: ["snap", "hit"] },
  moments: { play: "snap" },
  traits: { fight: { Firearm: "hit" } },
  cards: { "01016": { fight: "hit" } },
};

describe("sound manifest schema", () => {
  it("accepts a manifest whose references all resolve", () => {
    expect(SoundManifest.safeParse(sample).success).toBe(true);
  });

  it("rejects any licence but CC0", () => {
    const r = SoundManifest.safeParse({ ...sample, effects: { ...sample.effects, snap: { ...clip, license: "CC-BY" } } });
    expect(r.success).toBe(false);
  });

  it("accepts none for a moment, to silence it without removing the slot", () => {
    expect(SoundManifest.safeParse({ ...sample, moments: { play: "none" } }).success).toBe(true);
    expect(SoundManifest.safeParse({ ...sample, events: { damage: "none" } }).success).toBe(false);
  });

  it("keeps a clip's gain a small mix offset", () => {
    expect(SoundManifest.safeParse({ ...sample, effects: { ...sample.effects, snap: { ...clip, gain: 1.6 } } }).success).toBe(false);
    expect(SoundManifest.safeParse({ ...sample, effects: { ...sample.effects, snap: { ...clip, gain: 0.4 } } }).success).toBe(false);
  });

  it("rejects a reference to an unknown clip", () => {
    for (const bad of [
      { ...sample, events: { damage: "nope" } },
      { ...sample, moments: { play: "nope" } },
      { ...sample, traits: { fight: { Firearm: "nope" } } },
      { ...sample, cards: { "01016": { play: "nope" } } },
    ]) {
      const r = SoundManifest.safeParse(bad);
      expect(r.success).toBe(false);
      expect(JSON.stringify(r.success ? "" : r.error.issues)).toContain("nope");
    }
  });
});

describe("sound manifest in the content db", () => {
  it("loads content/sounds/sounds.json with every event, moment and music key the game uses", () => {
    expect(db.sounds.events.attack).toBeDefined();
    expect(db.sounds.moments.play).toBeDefined();
    // the hand-written scenarios have their own bed; the generated ones (ADR-0007) play the default bed
    const generated = new Set(Object.values(db.campaigns).filter((c) => c.generated).flatMap((c) => c.scenarios));
    for (const id of Object.keys(db.scenarios).filter((x) => !generated.has(x))) expect(db.sounds.music[`bed:${id}`], id).toBeDefined();
    expect(db.sounds.music["bed:default"]).toBeDefined();
    expect(db.sounds.music.fight).toBeDefined();
    expect(db.sounds.music.tension).toBeDefined();
  });

  it("reports a bed for a scenario that does not exist", () => {
    const { errors } = buildContent({ "/content/sounds/sounds.json": { ...sample, music: { ...sample.music, "bed:nowhere": { ...clip, file: "x" } } } }, {});
    expect(errors.map((e) => e.path)).toContain("music.bed:nowhere");
  });
});
