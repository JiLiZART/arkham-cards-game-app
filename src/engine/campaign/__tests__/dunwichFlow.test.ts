/**
 * The Dunwich Legacy's flow walked end to end (campaign-the-dunwich-legacy task 9.2): the prologue, the 8 scenarios in
 * order, Armitage's Fate, The Survivors and the epilogue, whose text follows the townsfolk choice made before
 * Undimensioned and Unseen. Scenarios end at once with the resolution given; prompts take their first open answer.
 * Return to The Dunwich Legacy walks the same way (campaign-return-to-the-dunwich-legacy task 11.1): its flow is the
 * base's under the Return scenarios' ids, with Naomi O'Bannion offered before Return to Where Doom Awaits.
 */
import { describe, expect, it } from "vitest";
import { advance, openChoices, startResolution } from "../flow";
import { startCampaign } from "../campaign";
import type { CampaignState, FlowValue } from "../types";
import { db } from "../../kits/testkit";
import { hasEntry } from "../log";

const ID = "the-dunwich-legacy";
const RETURN = "return-to-the-dunwich-legacy";
/** the resolution each scenario ends with: the way through to the last scenario's win (a Return scenario by its base's id) */
const ENDS: Record<string, string> = {
  "extracurricular-activity": "R1",
  "the-house-always-wins": "R1",
  "the-miskatonic-museum": "R1",
  "essex-county-express": "R1",
  "blood-on-the-altar": "R2",
  "undimensioned-and-unseen": "R1",
  "where-doom-awaits": "R1",
  "lost-in-time-and-space": "R1",
};

const baseId = (id: string) => id.replace(/^return-to-/, "");

function answer(c: CampaignState, townsfolk: "calmed" | "warned", naomiTo?: string): FlowValue {
  const { id, step } = c.flow.waiting!;
  const active = c.investigators.filter((i) => i.status === "active").map((i) => i.code);
  switch (step.kind) {
    case "chooseOne":
      if (baseId(id) === "undimensioned-and-unseen:warn_or_calm_choice") return townsfolk;
      return openChoices(db, c, step.choices)[0].id;
    case "counter":
      return step.min;
    case "investigatorChoice":
      if (naomiTo && id === "return-to-where-doom-awaits:gain_naomi_award") return naomiTo;
      return step.optional ? null : active[0];
    case "investigator":
      return active[0];
    case "cardChoice":
      return step.codes.length ? step.codes.slice(0, step.min) : [];
    case "checklist":
      return step.choices.slice(0, step.min).map((x) => x.id);
    case "sideScenario":
      return null;
    default:
      return "continue";
  }
}

function walk(
  townsfolk: "calmed" | "warned",
  last = "R1",
  {
    campaignId = ID,
    ends = {},
    naomiTo,
    defeatedIn,
  }: {
    campaignId?: string;
    ends?: Record<string, string>;
    naomiTo?: string;
    /** the scenario (by its base id) whose end defeats the lead */
    defeatedIn?: string;
  } = {},
) {
  let c = startCampaign(db, {
    campaignId,
    difficulty: "standard",
    seed: 3,
    investigators: [{ code: "01001", deckId: "roland-starter" }],
  });
  const played: string[] = [];
  const items = new Set<string>();
  const stories = new Set<string>();
  const seen = () => {
    if (c.flow.item) items.add(c.flow.item);
    for (const s of c.flow.shown) if ("story" in s) stories.add(s.story);
  };
  for (let n = 0; n < 2000; n++) {
    seen();
    if (c.flow.waiting) c = advance(db, c, answer(c, townsfolk, naomiTo));
    else if (c.flow.playing && c.flow.play) {
      const id = c.flow.play;
      const resolution =
        baseId(id) === "lost-in-time-and-space" ? last : (ends[baseId(id)] ?? ENDS[baseId(id)]);
      played.push(id);
      c.history.push({ scenarioId: id, resolution, xp: 0, victory: 0 });
      c = startResolution(db, c, {
        id,
        resolution,
        victory: 0,
        victoryCodes: [],
        cultistsVictory: [],
        cultistsRemaining: [],
        notResigned: [c.lead],
        resigned: [],
        defeated: defeatedIn === baseId(id) ? [c.lead] : [],
      });
    } else break;
  }
  seen();
  return { c, played, items, stories };
}

describe("The Dunwich Legacy's flow", () => {
  for (const townsfolk of ["calmed", "warned"] as const) {
    it(`runs from the prologue through 8 scenarios and both interludes to the epilogue (${townsfolk} the townsfolk)`, () => {
      const { c, played, items, stories } = walk(townsfolk);
      expect(played).toEqual(db.campaigns[ID].scenarios);
      for (const item of ["dwl-prologue", "armitages-fate", "dwl-interlude2", "dwl-epilogue"])
        expect(items, item).toContain(item);
      expect(c.result).toBe("win");
      expect(c.flow.waiting).toBeNull();
      expect(hasEntry(c.log, `${townsfolk}Townsfolk`)).toBe(true);
      expect(stories.has("dwl-epilogue:epilogue_1")).toBe(townsfolk === "calmed");
      expect(stories.has("dwl-epilogue:epilogue_2")).toBe(townsfolk === "warned");
    });
  }

  it("Lost in Time and Space's R3 kills everyone and still wins the campaign, the epilogue read first", () => {
    const { c, stories } = walk("calmed", "R3");
    expect(c.investigators.every((i) => i.status === "killed")).toBe(true);
    expect(c.result).toBe("win");
    expect(stories.has("dwl-epilogue:epilogue_1")).toBe(true);
  });
});

describe("Return to The Dunwich Legacy's flow", () => {
  const ret = (townsfolk: "calmed" | "warned" = "calmed", last = "R1", o = {}) =>
    walk(townsfolk, last, { campaignId: RETURN, ...o });

  for (const townsfolk of ["calmed", "warned"] as const) {
    it(`runs from the prologue through the 8 Return scenarios and both interludes to the epilogue (${townsfolk})`, () => {
      const { c, played, items, stories } = ret(townsfolk);
      expect(played).toEqual(db.campaigns[RETURN].scenarios);
      expect(played.map(baseId)).toEqual(db.campaigns[ID].scenarios);
      for (const item of ["dwl-prologue", "armitages-fate", "dwl-interlude2", "dwl-epilogue"])
        expect(items, item).toContain(item);
      expect(c.result).toBe("win");
      expect(c.flow.waiting).toBeNull();
      expect(hasEntry(c.log, `${townsfolk}Townsfolk`)).toBe(true);
      expect(stories.has("dwl-epilogue:epilogue_1")).toBe(townsfolk === "calmed");
      expect(stories.has("dwl-epilogue:epilogue_2")).toBe(townsfolk === "warned");
    });
  }

  it("Return to Lost in Time and Space's R3 kills everyone and still wins the campaign", () => {
    const { c, stories } = ret("calmed", "R3");
    expect(c.investigators.every((i) => i.status === "killed")).toBe(true);
    expect(c.result).toBe("win");
    expect(stories.has("dwl-epilogue:epilogue_1")).toBe(true);
  });

  it("no resolution in Return to Lost in Time and Space reads the act reached: short of act 4 the campaign is lost", () => {
    const { c } = ret("calmed", "none");
    expect(c.result).toBe("lose");
  });

  it("Naomi has your back: before Return to Where Doom Awaits the lead may give Naomi O'Bannion to an investigator", () => {
    const naomi = "51052";
    const taken = ret("calmed", "R1", {
      ends: { "the-house-always-wins": "R3" },
      naomiTo: "01001",
    });
    expect(hasEntry(taken.c.log, "naomiHasBack")).toBe(true);
    expect(taken.c.investigators[0].deck).toContain(naomi);
    const declined = ret("calmed", "R1", { ends: { "the-house-always-wins": "R3" } });
    expect(declined.c.investigators[0].deck).not.toContain(naomi);
    // without her, no offer
    expect(ret().c.flow.answers.some((a) => a.step.endsWith("gain_naomi_award"))).toBe(false);
    expect(declined.c.flow.answers.some((a) => a.step.endsWith("gain_naomi_award"))).toBe(true);
  });

  it("an investigator defeated in Return to The Essex County Express is lost across space and time", () => {
    const { c } = ret("calmed", "R1", { defeatedIn: "essex-county-express" });
    expect(c.investigators[0].deck).toContain("02178");
  });
});
