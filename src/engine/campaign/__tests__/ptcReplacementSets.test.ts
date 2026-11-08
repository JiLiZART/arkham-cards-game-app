/** The Path to Carcosa with Return to The Path to Carcosa's replacement sets (campaign-return-to-the-path-to-carcosa, group 10). */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import { cardsOf } from "../../context";
import { game } from "../../kits/driver";
import { db } from "../../kits/testkit";
import { startCampaign } from "../campaign";

const ID = "the-path-to-carcosa";
const OPTION = "rtptc-replacement-sets";
const ROLAND = "01001";
const PAIRS = {
  delusory_evils: "ancient_evils",
  neurotic_fear: "striking_fear",
  hasturs_envoys: "agents_of_hastur",
  decaying_reality: "decay",
  maddening_delusions: "delusions",
};
const REPLACEMENTS = Object.keys(PAIRS);

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const curtainCall = (options: string[] = []) =>
  game({
    scenario: "curtain-call",
    investigators: [ROLAND],
    extra: { campaignId: ID, campaignLog: {}, options },
  });
/** the sets the scenario's cards come from, each once */
const setsIn = (r: ReturnType<typeof game>) =>
  new Set(cardsOf(r.state).flatMap((c) => db.cards[c.code]?.encounterSet ?? []));

describe("The Path to Carcosa's replacement sets option", () => {
  it("is declared on the base campaign with the bookmark's five pairs", () => {
    expect(db.campaigns[ID].options).toEqual([
      {
        id: OPTION,
        labelKey: "campaign.option.rtptc-replacement-sets",
        replaceSets: PAIRS,
        addSets: [],
      },
    ]);
  });

  it("on: Curtain Call gathers Maddening Delusions and Neurotic Fear, none of Delusions or Striking Fear", () => {
    const sets = setsIn(curtainCall([OPTION]));
    for (const s of ["maddening_delusions", "neurotic_fear"]) expect(sets.has(s), s).toBe(true);
    for (const s of ["delusions", "striking_fear"]) expect(sets.has(s), s).toBe(false);
  });

  it("off: the base sets, no card of the five replacement sets", () => {
    const sets = setsIn(curtainCall());
    expect(sets.has("delusions")).toBe(true);
    for (const s of REPLACEMENTS) expect(sets.has(s), s).toBe(false);
  });

  it("Return to The Path to Carcosa always gathers the replacement sets, never the sets they replace", () => {
    for (const id of db.campaigns["return-to-the-path-to-carcosa"].scenarios)
      for (const s of Object.values(PAIRS))
        expect(db.scenarios[id].encounterSets, `${id} ${s}`).not.toContain(s);
  });

  it("is chosen when the campaign is created and kept in its state", () => {
    const c = startCampaign(db, {
      campaignId: ID,
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
      options: [OPTION],
    });
    expect(c.options).toEqual([OPTION]);
  });
});
