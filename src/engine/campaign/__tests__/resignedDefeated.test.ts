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

  it("a condition on the defeated reads only their decks (The Essex County Express's Investigator Defeat)", () => {
    const c0 = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 1,
      investigators: [
        { code: ROLAND, deckId: "roland-starter" },
        { code: DAISY, deckId: "daisy-starter" },
      ],
    });
    const r = inject(
      toTurn(skipMulligans(createGame(db, scenarioSetup(db, c0, 1)))),
      (g) => setStatus(g, DAISY, "defeated", "damage"),
      { t: STEP.Resolution, id: "R1" },
    );
    const c = { ...c0, flow: { ...c0.flow, scenario: scenarioFacts(db, r.state) } };
    const rolands = c0.investigators.find((i) => i.code === ROLAND)!.deck[0];
    const daisys = c0.investigators.find((i) => i.code === DAISY)!.deck[0];
    expect(test(db, c, { kind: "hasCard", card: daisys, inv: "defeated" })).toBe(true);
    expect(test(db, c, { kind: "hasCard", card: rolands, inv: "defeated" })).toBe(
      c0.investigators.find((i) => i.code === DAISY)!.deck.includes(rolands),
    );
    expect(test(db, c, { kind: "hasCard", card: rolands, inv: "any" })).toBe(true);
  });
});
