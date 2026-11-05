/**
 * The Dunwich Legacy's flow walked end to end (campaign-the-dunwich-legacy task 9.2): the prologue, the 8 scenarios in
 * order, Armitage's Fate, The Survivors and the epilogue, whose text follows the townsfolk choice made before
 * Undimensioned and Unseen. Scenarios end at once with the resolution given; prompts take their first open answer.
 */
import { describe, expect, it } from "vitest";
import { advance, openChoices, startResolution } from "../flow";
import { startCampaign } from "../campaign";
import type { CampaignState, FlowValue } from "../types";
import { db } from "../../kits/testkit";
import { hasEntry } from "../log";

const ID = "the-dunwich-legacy";
/** the resolution each scenario ends with: the way through to the last scenario's win */
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

function answer(c: CampaignState, townsfolk: "calmed" | "warned"): FlowValue {
  const { id, step } = c.flow.waiting!;
  const active = c.investigators.filter((i) => i.status === "active").map((i) => i.code);
  switch (step.kind) {
    case "chooseOne":
      if (id === "undimensioned-and-unseen:warn_or_calm_choice") return townsfolk;
      return openChoices(db, c, step.choices)[0].id;
    case "counter":
      return step.min;
    case "investigatorChoice":
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

function walk(townsfolk: "calmed" | "warned", last = "R1") {
  let c = startCampaign(db, {
    campaignId: ID,
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
    if (c.flow.waiting) c = advance(db, c, answer(c, townsfolk));
    else if (c.flow.playing && c.flow.play) {
      const id = c.flow.play;
      const resolution = id === "lost-in-time-and-space" ? last : ENDS[id];
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
        defeated: [],
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
