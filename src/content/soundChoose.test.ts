import { describe, expect, it } from "vitest";
import { SoundCandidates, SoundManifest } from "./schema";
import { chooseSound, chooseSounds, clipAt, clipIdOf } from "./soundChoose";

const clip = { file: "slide.mp3", source: "https://kenney.nl/x", author: "Kenney", license: "CC0" };
const manifest = () =>
  SoundManifest.parse({
    effects: {
      slide: clip,
      snap: { ...clip, file: "snap.mp3" },
      "event-token-0": { ...clip, file: "event-token-0.mp3" },
    },
    music: { fight: { ...clip, file: "fight" }, "bed:default": { ...clip, file: "bed" } },
    events: { token: ["event-token-0", "snap"], doom: "snap" },
    moments: { draw: "slide", play: "snap" },
    traits: { play: { Firearm: "snap" } },
    cards: { "01016": { fight: "snap" } },
  });
const cand = (n: number) => ({
  original: `kenney-casino/Audio/c${n}.ogg`,
  preview: `moment-draw/${n}.mp3`,
  source: `https://opengameart.org/content/c${n}`,
  author: `Author${n}`,
  license: "CC0",
  description: `c${n}`,
  sha256: "b".repeat(64),
});
const pool = Array.from({ length: 12 }, (_, i) => cand(i + 1));
const slots = (...ids: string[]) =>
  SoundCandidates.parse({
    slots: Object.fromEntries(
      ids.map((id) => [
        id,
        { kind: id.startsWith("music:") ? "music" : "effect", where: "w", candidates: pool },
      ]),
    ),
  });
const all = slots(
  "moment:draw",
  "moment:play",
  "event:doom",
  "event:token.0",
  "event:token.1",
  "trait:play:Firearm",
  "card:01016:fight",
  "music:fight",
  "moment:newOne",
);

describe("clipIdOf", () => {
  it("makes a stable file-safe id from a slot", () => {
    expect(clipIdOf("moment:draw")).toBe("moment-draw");
    expect(clipIdOf("event:damage:horror")).toBe("event-damage-horror");
    expect(clipIdOf("event:token.1")).toBe("event-token-1");
  });
});

describe("chooseSound", () => {
  it("points a moment at a new clip carrying the candidate's provenance and original, and drops the clip nothing uses now", () => {
    const r = chooseSound(manifest(), all, { slot: "moment:draw", candidate: 2 });
    expect(r.manifest.moments.draw).toBe("moment-draw");
    expect(r.manifest.effects["moment-draw"]).toMatchObject({
      file: "moment-draw.mp3",
      source: "https://opengameart.org/content/c3",
      author: "Author3",
      license: "CC0",
      original: "kenney-casino/Audio/c3.ogg",
      trim: [0, 4],
    });
    expect(r.manifest.effects.slide).toBeUndefined();
    expect(r.importIds).toEqual(["moment-draw"]);
    expect(r.removedFiles).toEqual(["slide.mp3"]);
  });

  it("keeps a clip that something else still uses", () => {
    const r = chooseSound(manifest(), all, { slot: "event:doom", candidate: 0 });
    expect(r.manifest.effects.snap).toBeDefined();
    expect(r.removedFiles).toEqual([]);
  });

  it("changes one layer of a layered event, and removes a layer on none", () => {
    expect(
      chooseSound(manifest(), all, { slot: "event:token.1", candidate: 1 }).manifest.events.token,
    ).toEqual(["event-token-0", "event-token-1"]);
    expect(
      chooseSound(manifest(), all, { slot: "event:token.0", candidate: "none" }).manifest.events
        .token,
    ).toEqual(["snap"]);
  });

  it("sets a trait, a card and a music track in their own place; a track gets a loop and a music file stem", () => {
    expect(
      chooseSound(manifest(), all, { slot: "trait:play:Firearm", candidate: 0 }).manifest.traits
        .play?.Firearm,
    ).toBe("trait-play-Firearm");
    expect(
      chooseSound(manifest(), all, { slot: "card:01016:fight", candidate: 0 }).manifest.cards[
        "01016"
      ]?.fight,
    ).toBe("card-01016-fight");
    const r = chooseSound(manifest(), all, { slot: "music:fight", candidate: 0 });
    expect(r.manifest.music.fight).toMatchObject({
      file: "music-fight",
      loop: true,
      original: "kenney-casino/Audio/c1.ogg",
      trim: [0, 300],
    });
    expect(r.importIds).toEqual(["fight"]);
    expect(r.removedFiles).toEqual(["fight.m4a", "fight.webm"]);
  });

  it("silences a moment with none (the slot stays) and leaves everything alone on current", () => {
    expect(
      chooseSound(manifest(), all, { slot: "moment:draw", candidate: "none" }).manifest.moments
        .draw,
    ).toBe("none");
    const same = chooseSound(manifest(), all, { slot: "moment:draw", candidate: "current" });
    expect(same.manifest).toEqual(manifest());
    expect(same.importIds).toEqual([]);
  });

  it("adds a moment the manifest has no entry for yet", () => {
    expect(
      chooseSound(manifest(), all, { slot: "moment:newOne", candidate: 0 }).manifest.moments.newOne,
    ).toBe("moment-newOne");
  });

  it("refuses a slot with no candidates, a candidate out of range, and none for a music track", () => {
    expect(() => chooseSound(manifest(), all, { slot: "moment:nope", candidate: 0 })).toThrow(
      /slot/,
    );
    expect(() => chooseSound(manifest(), all, { slot: "moment:draw", candidate: 12 })).toThrow(
      /candidate/,
    );
    expect(() => chooseSound(manifest(), all, { slot: "music:fight", candidate: "none" })).toThrow(
      /music/,
    );
  });

  it("refuses a candidate that is not CC0 (the candidates file must not be able to smuggle one in)", () => {
    const bad = JSON.parse(JSON.stringify(all));
    bad.slots["moment:draw"].candidates[0].license = "CC-BY";
    expect(() => chooseSound(manifest(), bad, { slot: "moment:draw", candidate: 0 })).toThrow(
      /CC0/,
    );
  });
});

describe("clipAt", () => {
  it("finds the clip each kind of slot uses now, or null", () => {
    const m = manifest();
    expect(clipAt(m, "moment:draw")).toBe("slide");
    expect(clipAt(m, "event:token.1")).toBe("snap");
    expect(clipAt(m, "event:doom")).toBe("snap");
    expect(clipAt(m, "trait:play:Firearm")).toBe("snap");
    expect(clipAt(m, "card:01016:fight")).toBe("snap");
    expect(clipAt(m, "music:fight")).toBe("fight");
    expect(clipAt(m, "moment:newOne")).toBeNull();
    expect(clipAt(m, "music:nope")).toBeNull();
  });
});

describe("chooseSounds", () => {
  it("applies every slot's choice in one go, the last for a slot winning, and imports each new clip once", () => {
    const r = chooseSounds(manifest(), all, [
      { slot: "moment:draw", candidate: 1 },
      { slot: "event:doom", candidate: 3 },
      { slot: "moment:play", candidate: "current" },
      { slot: "moment:draw", candidate: 7 },
      { slot: "music:fight", candidate: 0 },
    ]);
    expect(r.manifest.effects["moment-draw"].original).toBe("kenney-casino/Audio/c8.ogg");
    expect(r.manifest.events.doom).toBe("event-doom");
    expect(r.manifest.moments.play).toBe("snap");
    expect(r.importIds.sort()).toEqual(["event-doom", "fight", "moment-draw"]);
  });

  it("removes only the files no clip of the final manifest uses", () => {
    // snap is used by play, token, Firearm and the .45: replacing doom alone keeps it, slide goes with draw
    const r = chooseSounds(manifest(), all, [
      { slot: "moment:draw", candidate: 0 },
      { slot: "event:doom", candidate: 0 },
    ]);
    expect(r.removedFiles).toEqual(["slide.mp3"]);
  });

  it("refuses the whole batch when one choice is wrong, changing nothing", () => {
    expect(() =>
      chooseSounds(manifest(), all, [
        { slot: "moment:draw", candidate: 0 },
        { slot: "moment:nope", candidate: 0 },
      ]),
    ).toThrow(/moment:nope/);
  });
});
