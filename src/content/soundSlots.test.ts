import { describe, expect, it } from "vitest";
import { SoundManifest } from "./schema";
import { slotsOf } from "./soundSlots";

const clip = { file: "a.mp3", source: "https://kenney.nl/x", author: "K", license: "CC0" };

describe("slotsOf", () => {
  it("names every event, moment, trait, card and music role, and numbers the clips of a layered event", () => {
    const m = SoundManifest.parse({
      effects: { a: clip },
      music: { fight: { ...clip, file: "fight" }, "bed:default": { ...clip, file: "bed" } },
      events: { damage: "a", "damage:horror": "a", token: ["a", "a"] },
      moments: { draw: "a" },
      traits: { play: { Firearm: "a" } },
      cards: { "01016": { fight: "a" } },
    });
    expect(slotsOf(m)).toEqual([
      "event:damage",
      "event:damage:horror",
      "event:token.0",
      "event:token.1",
      "moment:draw",
      "trait:play:Firearm",
      "card:01016:fight",
      "music:fight",
      "music:bed:default",
    ]);
  });
});
