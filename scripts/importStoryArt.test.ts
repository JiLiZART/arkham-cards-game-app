import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STORY, storyArgs, storyManifest, storyOut, type StoryEntry } from "./importStoryArt";

const hasMagick = (() => {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("the story art table (campaign-story-reader 5.1)", () => {
  it("names each painting's scenario, edition and page once", () => {
    const ids = STORY.map((e) => e.scenario);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of STORY) {
      expect(e.pdf).toMatch(/\.pdf$/);
      expect(e.page).toBeGreaterThan(0);
      expect(e.file).toMatch(/\.webp$/);
    }
    expect(ids).toEqual(
      expect.arrayContaining(["the-gathering", "the-midnight-masks", "the-devourer-below"]),
    );
  });

  it("the manifest records each painting's source, as the UI reads it", () => {
    const m = storyManifest(STORY);
    expect(m.scenarios["the-gathering"]).toEqual({
      file: "the-gathering.webp",
      campaign: "night-of-the-zealot",
      pdf: "01 Night of the Zealot.pdf",
      page: 8,
    });
    expect(storyOut(STORY[0])).toBe("public/art/story/night-of-the-zealot/the-gathering.webp");
  });

  it("builds the magick call: slices stacked, cropped, margin keyed from every corner, resized", () => {
    const e: StoryEntry = {
      campaign: "c",
      scenario: "s",
      pdf: "x.pdf",
      page: 1,
      file: "s.webp",
      crop: "100x200+10+20",
      erase: ["1,2,3,4"],
      fade: 30,
      width: 500,
    };
    const args = storyArgs(e, ["a.jpg", "b.jpg"], "out.webp");
    expect(args.slice(0, 4)).toEqual(["a.jpg", "b.jpg", "-append", "+repage"]);
    expect(args).toContain("100x200+10+20");
    expect(args).toContain("rectangle 1,2 3,4");
    expect(args.filter((a) => a.endsWith("floodfill"))).toHaveLength(4);
    expect(args).toContain("100x30");
    expect(args.slice(-6)).toEqual(["-resize", "500x", "-strip", "-quality", "82", "out.webp"]);
  });

  it("a fade without a crop is refused", () => {
    expect(() =>
      storyArgs({ ...STORY[1], fade: 10, crop: undefined }, ["a.jpg"], "o.webp"),
    ).toThrow(/needs a crop/);
  });

  it.skipIf(!hasMagick)("keys the white margin to transparency and keeps the painting", () => {
    const dir = mkdtempSync(join(tmpdir(), "story-test-"));
    try {
      const src = join(dir, "s.png");
      const out = join(dir, "o.png");
      // white page, a dark painting in the middle with a white speck of highlight inside it
      execFileSync("magick", [
        "-size",
        "200x120",
        "xc:white",
        "-fill",
        "#334",
        "-draw",
        "circle 100,60 100,15",
        "-fill",
        "white",
        "-draw",
        "circle 100,60 100,54",
        src,
      ]);
      execFileSync("magick", storyArgs({ ...STORY[1], width: 200 }, [src], out));
      const px = (x: number, y: number) =>
        execFileSync("magick", [out, "-format", `%[fx:p{${x},${y}}.a]`, "info:"]).toString();
      expect(Number(px(0, 0))).toBe(0);
      expect(Number(px(199, 119))).toBe(0);
      expect(Number(px(100, 30))).toBe(1);
      // a highlight inside the painting is not connected to the margin: it stays
      expect(Number(px(100, 60))).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
