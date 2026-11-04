import { describe, expect, it } from "vitest";
import { setStatus } from "../../context";
import { createGame } from "../../index";
import { inject, toTurn } from "../../kits/driver";
import { db, skipMulligans } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { scenarioFacts, scenarioSetup, startCampaign } from "../campaign";
import { test } from "../flow";

const ROLAND = "01001";
const DAISY = "01002";

describe("the scenario's resigned and defeated investigators", () => {
  it("are in the facts the flow reads, and its conditions answer from them without asking", () => {
    const c0 = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 1,
      investigators: [
        { code: ROLAND, deckId: "roland-starter" },
        { code: DAISY, deckId: "daisy-starter" },
      ],
    });
    let r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c0, 1))));
    // the statuses as they stand when a resolution with a story ends the scenario (its story keeps the facts read)
    r = inject(
      r,
      (g) => {
        setStatus(g, ROLAND, "resigned");
        setStatus(g, DAISY, "defeated", "horror");
      },
      { t: STEP.Resolution, id: "R1" },
    );
    const facts = scenarioFacts(db, r.state);
    expect(facts.resigned).toEqual([ROLAND]);
    expect(facts.defeated).toEqual([DAISY]);
    // the flow reads them while the resolution runs
    const c = { ...c0, flow: { ...c0.flow, scenario: facts } };
    expect(test(db, c, { kind: "anyResigned" })).toBe(true);
    expect(test(db, c, { kind: "anyDefeated" })).toBe(true);
    expect(test(db, c, { kind: "allResigned" })).toBe(false);
  });
});
