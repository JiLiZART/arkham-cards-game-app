import { afterEach, describe, expect, it } from "vitest";
import { cardsOf } from "../../context";
import { game } from "../../kits/driver";
import { db } from "../../kits/testkit";
import { scenarioSetup, startCampaign } from "../campaign";

const ROLAND = "01001";
const NOTZ = "night-of-the-zealot";
// The Gathering gathers ancient_evils and rats; these swap ancient_evils for agents_of_hastur and add agents_of_yog
const OPTION = {
  id: "zz-sets",
  labelKey: "campaign.option.zz",
  replaceSets: { agents_of_hastur: "ancient_evils" },
  addSets: ["agents_of_yog"],
};
const saved = db.campaigns[NOTZ].options;
afterEach(() => {
  db.campaigns[NOTZ].options = saved;
});
const inDeck = (r: ReturnType<typeof game>, code: string) =>
  cardsOf(r.state).filter((c) => c.code === code && c.zone === "encounterDeck").length;

describe("campaign options: a Return-to box's sets in its base campaign", () => {
  it("with the option on, the replacement set and the added set are gathered, the replaced one isn't", () => {
    db.campaigns[NOTZ].options = [OPTION];
    const r = game({ investigators: [ROLAND], extra: { options: ["zz-sets"] } });
    expect(inDeck(r, "01175")).toBe(2); // Screeching Byakhee, agents_of_hastur
    expect(inDeck(r, "01177")).toBe(2); // Yithian Observer, agents_of_yog
    expect(inDeck(r, "01166")).toBe(0); // Ancient Evils, replaced
  });

  it("with the option off, the scenario's own sets only", () => {
    db.campaigns[NOTZ].options = [OPTION];
    const r = game({ investigators: [ROLAND] });
    expect(inDeck(r, "01166")).toBe(3);
    expect(inDeck(r, "01175")).toBe(0);
    expect(inDeck(r, "01177")).toBe(0);
  });

  it("a replacement set the scenario already lists is gathered once", () => {
    db.campaigns[NOTZ].options = [
      { ...OPTION, replaceSets: { rats: "ancient_evils" }, addSets: [] },
    ];
    const r = game({ investigators: [ROLAND], extra: { options: ["zz-sets"] } });
    expect(inDeck(r, "01159")).toBe(3); // Swarm of Rats: three copies, not six
    expect(inDeck(r, "01166")).toBe(0);
  });

  it("is chosen when the campaign starts, kept in its state, and handed to each scenario", () => {
    db.campaigns[NOTZ].options = [OPTION];
    const c = startCampaign(db, {
      campaignId: NOTZ,
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
      options: ["zz-sets", "not-declared"],
    });
    expect(c.options).toEqual(["zz-sets"]);
    expect(scenarioSetup(db, c, 1).options).toEqual(["zz-sets"]);
  });
});
