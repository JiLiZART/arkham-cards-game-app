import { describe, expect, it } from "vitest";
import { candidateOrder, inventory, type Slot, SLOTS } from "./sound-candidates";
import { LOOSE, PACKS, zipUrl } from "./sound-packs";

const files = (paths: string[]) => paths.map((path) => ({ path, source: "https://example.org/pack", author: "A" }));

describe("sound slots", () => {
  it("have unique ids, a place in the game and at least three sound families each", () => {
    expect(new Set(SLOTS.map((s) => s.id)).size).toBe(SLOTS.length);
    for (const s of SLOTS) {
      expect(s.where, s.id).not.toBe("");
      expect(s.patterns.length, s.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("cover music roles as music and everything else as effects", () => {
    for (const s of SLOTS) expect(s.kind === "music", s.id).toBe(s.id.startsWith("music:"));
  });
});

describe("candidateOrder", () => {
  const slot: Slot = { id: "moment:x", kind: "effect", where: "x", patterns: ["click", "tick", "pop"] };

  it("takes one file from each family in turn, so five candidates differ in character", () => {
    const f = files(["a/click1.ogg", "a/click2.ogg", "a/click3.ogg", "b/tick1.ogg", "b/tick2.ogg", "c/pop1.ogg", "c/pop2.ogg"]);
    const first3 = candidateOrder(slot, f).slice(0, 3).map((x) => x.path.replace(/\d.*/, ""));
    expect(first3.sort()).toEqual(["a/click", "b/tick", "c/pop"]);
  });

  it("lists a file once even when two families match it, and runs out gracefully", () => {
    const order = candidateOrder({ ...slot, patterns: ["click", "a/"] }, files(["a/click1.ogg", "a/click2.ogg"]));
    expect(order.map((x) => x.path).sort()).toEqual(["a/click1.ogg", "a/click2.ogg"]);
  });

  it("starts at a different place for a different slot", () => {
    const f = files(Array.from({ length: 10 }, (_, i) => `a/click${i}.ogg`));
    const a = candidateOrder({ ...slot, id: "moment:a", patterns: ["click"] }, f)[0].path;
    const b = candidateOrder({ ...slot, id: "moment:bb", patterns: ["click"] }, f)[0].path;
    expect(a).not.toBe(b);
  });
});

describe("inventory", () => {
  it("lists audio files of the packs with their provenance and skips previews and macOS metadata", () => {
    const list = (dir: string) => (dir === "kenney-casino" ? ["Audio/card-slide-1.ogg", "Preview.ogg", "__MACOSX/Audio/._card-slide-1.ogg", "readme.txt"] : []);
    const inv = inventory(list, () => false, PACKS, []);
    expect(inv.map((i) => i.path)).toEqual(["kenney-casino/Audio/card-slide-1.ogg"]);
    expect(inv[0].author).toBe("Kenney");
  });

  it("includes loose files that are on disk", () => {
    const inv = inventory(() => [], (f) => f === "victory.mp3", [], LOOSE);
    expect(inv.map((i) => i.path)).toEqual(["victory.mp3"]);
  });
});

describe("sound packs", () => {
  it("are all CC0 sources on known sites", () => {
    for (const p of [...PACKS, ...LOOSE]) expect(p.source).toMatch(/^https:\/\/(kenney\.nl|opengameart\.org)\//);
  });

  it("find a Kenney zip link on its page", () => {
    expect(zipUrl('<a href="https://kenney.nl/media/pages/assets/ui-audio/490d/kenney_ui-audio.zip">Download</a>')).toBe("https://kenney.nl/media/pages/assets/ui-audio/490d/kenney_ui-audio.zip");
    expect(zipUrl("<p>nothing</p>")).toBeNull();
  });
});
