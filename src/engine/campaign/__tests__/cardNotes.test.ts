/**
 * A scenario's notes in the campaign log (campaign-the-dunwich-legacy task 9.1): card lists (`cards:<section>:<id>`), counts
 * (`count:<section>:<id>`) and the tokens added for the campaign. The flow's `removeListed` is tested with the scenario
 * (bloodOnTheAltar.test.ts).
 */
import { describe, expect, it } from "vitest";
import { createGame } from "../../index";
import { inject, toTurn } from "../../kits/driver";
import { db, skipMulligans } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { campaignTokens, cardsEntry, countEntry } from "../../world/flags";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign";
import { test } from "../flow";

const ROLAND = "01001";

const begin = () =>
  startCampaign(db, {
    campaignId: "night-of-the-zealot",
    difficulty: "standard",
    seed: 1,
    investigators: [{ code: ROLAND, deckId: "roland-starter" }],
  });

describe("card-list notes", () => {
  it("a list the scenario wrote is in the log's section as it ends, and the flow's logCards reads it", () => {
    const c0 = begin();
    const r = inject(
      toTurn(skipMulligans(createGame(db, scenarioSetup(db, c0, 1)))),
      (g) => cardsEntry.set(g, ["sacrificed", "sacrificed"], ["02040", "02217"]),
      { t: STEP.Resolution, id: "R1" },
    );
    const c = applyScenarioEnd(db, c0, r.state);
    expect(c.log.sacrificed.cards.sacrificed).toEqual(["02040", "02217"]);
    expect(
      test(db, c, { kind: "logCards", id: "sacrificed", section: "sacrificed", card: "02040" }),
    ).toBe(true);
    expect(
      test(db, c, { kind: "logCards", id: "sacrificed", section: "sacrificed", card: "02218" }),
    ).toBe(false);
  });

  it("a count the scenario wrote adds to the log's count, and tokens added for the campaign stay in its bag", () => {
    const c0 = begin();
    const r = inject(
      toTurn(skipMulligans(createGame(db, scenarioSetup(db, c0, 1)))),
      (g) => {
        countEntry.set(g, ["campaign_notes", "broodEscaped"], 2);
        campaignTokens.set(g, ["tablet"]);
      },
      { t: STEP.Resolution, id: "R1" },
    );
    const c = applyScenarioEnd(db, c0, r.state);
    expect(c.log.campaign_notes.counts.broodEscaped).toBe(2);
    expect(
      test(db, c, { kind: "logCount", id: "broodEscaped", section: "campaign_notes", min: 2 }),
    ).toBe(true);
    expect(c.chaosBag.filter((t) => t === "tablet").length).toBe(
      c0.chaosBag.filter((t) => t === "tablet").length + 1,
    );
  });
});
