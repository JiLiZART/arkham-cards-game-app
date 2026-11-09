/** Yig's Fury counted from the scenario's record (engine-tfa-supplies-vengeance-exploration 3.3). */
import { describe, expect, it } from "vitest";
import { CampaignDef, CampaignFlow } from "../../../content/schema";
import { startCampaign } from "../campaign";
import { logCount } from "../log";
import { startResolution } from "../flow";
import { db as base } from "../../kits/testkit";

const ROLAND = "01001";
const GATHERING = "the-gathering";
const NOTZ = base.campaigns["night-of-the-zealot"];

const db = {
  ...base,
  campaigns: {
    ...base.campaigns,
    t: CampaignDef.parse({
      id: "t",
      name: "T",
      scenarios: NOTZ.scenarios,
      chaosBags: NOTZ.chaosBags,
    }),
  },
  flows: {
    ...base.flows,
    t: CampaignFlow.parse({
      setup: [],
      order: [GATHERING],
      resolutions: { [GATHERING]: { R1: ["fury", "watches"] } },
      steps: {
        fury: {
          kind: "effects",
          effects: [
            { do: "count", id: "yigs_fury", section: "yigs_fury", op: "add", value: "vengeance" },
          ],
        },
        watches: {
          kind: "effects",
          effects: [{ do: "recordCards", key: "jungle_watches", source: "vengeanceInVictory" }],
        },
      },
    }),
  },
};

describe("Yig's Fury (3.3)", () => {
  it("a count step reads the vengeance the scenario left in the victory display, and the cards are listed", () => {
    const c0 = startCampaign(db, {
      campaignId: "t",
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
    });
    const c = startResolution(db, c0, {
      id: GATHERING,
      resolution: "R1",
      victory: 0,
      victoryCodes: ["04078", "04079"],
      vengeance: 3,
      vengeanceCodes: ["04078", "04079"],
      cultistsVictory: [],
      cultistsRemaining: [],
      notResigned: [ROLAND],
    });
    expect(logCount(c.log, "yigs_fury", "yigs_fury")).toBe(3);
    expect(c.log.campaign_notes.cards.jungle_watches).toEqual(["04078", "04079"]);
  });
});
