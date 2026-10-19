import { describe, expect, it } from "vitest";
import { SoundManifest } from "../src/content/schema";
import { replaceCredits, soundCredits } from "./sound-credits";

const clip = (source: string, author: string, file = "a.mp3") => ({ file, source, author, license: "CC0" });
const m = SoundManifest.parse({
  effects: { a: clip("https://kenney.nl/assets/impact-sounds", "Kenney"), b: clip("https://opengameart.org/content/3-pop-sounds", "wubitog"), c: clip("https://kenney.nl/assets/impact-sounds", "Kenney") },
  music: { fight: clip("https://opengameart.org/content/horde-war-drums-loop", "William Hector", "fight") },
  events: {},
  moments: {},
});

describe("soundCredits", () => {
  it("lists every source the manifest uses once, named after its page, with the sites it comes from", () => {
    expect(soundCredits(m)).toBe(
      [
        "All sounds are CC0 (public domain), from Kenney and OpenGameArt:",
        "",
        "- [impact sounds](https://kenney.nl/assets/impact-sounds) by Kenney (CC0)",
        "- [3 pop sounds](https://opengameart.org/content/3-pop-sounds) by wubitog (CC0)",
        "- [horde war drums loop](https://opengameart.org/content/horde-war-drums-loop) by William Hector (CC0)",
      ].join("\n"),
    );
  });
});

describe("replaceCredits", () => {
  it("replaces the body of the Sound credits section and nothing else", () => {
    const readme = "# X\n\n## Sound credits\n\nold\n- [a](b)\n\n## Icon credits\n\nicons\n";
    expect(replaceCredits(readme, "new")).toBe("# X\n\n## Sound credits\n\nnew\n\n## Icon credits\n\nicons\n");
  });

  it("refuses a README without the section", () => {
    expect(() => replaceCredits("# X\n", "new")).toThrow(/Sound credits/);
  });
});
