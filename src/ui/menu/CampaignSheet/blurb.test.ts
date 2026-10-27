import { describe, expect, it } from "vitest";
import { db } from "../../../engine/testkit";
import { campaignBlurb } from "../../../content/i18n";
import { blurb } from "./blurb";

describe("blurb", () => {
  it("strips the guide's markup and splits the first paragraph from the rest", () => {
    expect(
      blurb("<fancy>June 1926</fancy> Miskatonic.\n\nSecond <i>paragraph</i>.\n\nThird."),
    ).toEqual({ lead: "June 1926 Miskatonic.", more: "Second paragraph.\n\nThird." });
  });

  it("a short prologue, an epigraph, has nothing more", () => {
    expect(
      blurb("“I’m going to burn his accursed diary…”\n–H. P. Lovecraft, “The Dunwich Horror”"),
    ).toEqual({
      lead: "“I’m going to burn his accursed diary…”\n–H. P. Lovecraft, “The Dunwich Horror”",
      more: null,
    });
  });

  it("a long single paragraph is cut at a sentence near 300 characters, the rest behind More", () => {
    const sentence = "Strange things happen in Arkham. ";
    const r = blurb(sentence.repeat(20).trim());
    expect(r.lead.length).toBeLessThanOrEqual(340);
    expect(r.lead.endsWith(".")).toBe(true);
    expect(r.more).not.toBeNull();
    expect(`${r.lead} ${r.more}`.replace(/\s+/g, " ")).toBe(sentence.repeat(20).trim());
  });

  it("nothing in, nothing out", () => {
    expect(blurb(undefined)).toEqual({ lead: "", more: null });
    expect(blurb("  ")).toEqual({ lead: "", more: null });
  });
});

describe("campaignBlurb", () => {
  it("gives the prologue and the scenario names of a campaign in the locale, before its scenarios are loaded", () => {
    const en = campaignBlurb(db, "the-dunwich-legacy", "en");
    expect(en.prologue).toMatch(/burn his accursed diary/);
    expect(en.scenarios).toHaveLength(8);
    expect(en.scenarios[0]).toBe("Extracurricular Activity");
    const ru = campaignBlurb(db, "the-dunwich-legacy", "ru");
    expect(ru.prologue).toMatch(/дневник/);
    expect(ru.scenarios[0]).toMatch(/[а-я]/i);
    expect(ru.scenarios).toHaveLength(8);
  });

  it("Night of the Zealot has them too", () => {
    expect(campaignBlurb(db, "night-of-the-zealot", "en").prologue).toMatch(/September 18, 1925/);
    expect(campaignBlurb(db, "night-of-the-zealot", "ru").scenarios).toHaveLength(3);
  });

  it("a side scenario's tile text is the first paragraph of its intro, short enough to be eager", () => {
    const en = campaignBlurb(db, "side-read-or-die", "en");
    expect(en.prologue).toBeTruthy();
    expect(en.prologue).not.toMatch(/\n\s*\n/);
    expect(campaignBlurb(db, "side-read-or-die", "ru").prologue).toMatch(/[а-я]/i);
  });
});
