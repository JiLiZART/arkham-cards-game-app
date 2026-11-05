/** The Dunwich Legacy with Return to The Dunwich Legacy's replacement sets (campaign-return-to-the-dunwich-legacy, group 10). */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import { cardsOf } from "../../context";
import { game } from "../../kits/driver";
import { db } from "../../kits/testkit";
import { startCampaign } from "../campaign";

const ID = "the-dunwich-legacy";
const OPTION = "rtdwl-replacement-sets";
const ROLAND = "01001";
const REPLACEMENTS = [
  "beyond_the_threshold",
  "resurgent_evils",
  "erratic_fear",
  "creeping_cold",
  "secret_doors",
  "yog_sothoths_emissaries",
];

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const ea = (options: string[] = []) =>
  game({
    scenario: "extracurricular-activity",
    investigators: [ROLAND],
    extra: { campaignId: ID, options },
  });
/** the sets the scenario's cards come from, each once */
const setsIn = (r: ReturnType<typeof game>) =>
  new Set(cardsOf(r.state).flatMap((c) => db.cards[c.code]?.encounterSet ?? []));

describe("The Dunwich Legacy's replacement sets option", () => {
  it("is declared on the base campaign with the bookmark's six pairs", () => {
    expect(db.campaigns[ID].options).toEqual([
      {
        id: OPTION,
        labelKey: "campaign.option.rtdwl-replacement-sets",
        replaceSets: {
          beyond_the_threshold: "the_beyond",
          resurgent_evils: "ancient_evils",
          erratic_fear: "striking_fear",
          creeping_cold: "chilling_cold",
          secret_doors: "locked_doors",
          yog_sothoths_emissaries: "agents_of_yog",
        },
        addSets: [],
      },
    ]);
  });

  it("on: Extracurricular Activity gathers the four replacements of its sets, none of the sets they replace", () => {
    const sets = setsIn(ea([OPTION]));
    for (const s of [
      "beyond_the_threshold",
      "resurgent_evils",
      "secret_doors",
      "yog_sothoths_emissaries",
    ])
      expect(sets.has(s), s).toBe(true);
    for (const s of ["the_beyond", "ancient_evils", "locked_doors", "agents_of_yog"])
      expect(sets.has(s), s).toBe(false);
  });

  it("off: the base sets, no card of the six replacement sets", () => {
    const sets = setsIn(ea());
    expect(sets.has("the_beyond")).toBe(true);
    for (const s of REPLACEMENTS) expect(sets.has(s), s).toBe(false);
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
