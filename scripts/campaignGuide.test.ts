import { describe, expect, it } from "vitest";
import { actsAndAgendas, chaosBag, introLead, prologueOf, codesByName, isOfficial, kebab, layoutOf, resolutionEffects, tokenEffects } from "./campaignGuide";

describe("chaosBag", () => {
  it("renames the guide's tokens and drops the ones the engine doesn't know", () => {
    expect(chaosBag(["+1", "0", "-2", "skull", "elder_thing", "auto_fail", "elder_sign", "frost", "frost"])).toEqual({
      bag: ["+1", "0", "-2", "skull", "elderThing", "autoFail", "elderSign"],
      dropped: ["frost"],
    });
  });
});

describe("layoutOf", () => {
  it("places each code by row and column, strips _back, and connects orthogonal neighbours", () => {
    const r = layoutOf([
      ["02050_back", "blank", "02056_back"],
      ["02049_back", "02051_back", "woods"],
    ]);
    expect(r.layout).toEqual({ "02050": [0, 0], "02056": [2, 0], "02049": [0, 1], "02051": [1, 1] });
    expect(r.connections).toEqual([
      ["02050", "02049"],
      ["02049", "02051"],
    ]);
    expect(r.codes).toEqual(["02050", "02056", "02049", "02051"]);
  });
});

describe("codesByName", () => {
  const pool = [
    { code: "02048", name: "Miskatonic Quad" },
    { code: "02052", name: "Dormitories" },
    { code: "02055", name: "Alchemy Labs" },
    { code: "02060", name: "Alchemical Concoction" },
    { code: "02057", name: "Faculty Offices" },
    { code: "02058", name: "Faculty Offices" },
  ];
  it("finds the cards named in a sentence, longest names first, in the order they appear", () => {
    expect(codesByName("Set the following cards aside, out of play: Alchemical Concoction, Dormitories, and Alchemy Labs.", pool)).toEqual(["02060", "02052", "02055"]);
  });
  it("a name two cards share gives both", () => {
    expect(codesByName("Put Faculty Offices into play.", pool)).toEqual(["02057", "02058"]);
  });
});

describe("tokenEffects", () => {
  it("reads each symbol's modifier from the reference card; X becomes -2 and is reported", () => {
    const r = tokenEffects("Easy / Standard\n[skull]: -1. If you fail, discard.\n[cultist] [tablet]: -4. Take 1 horror.\n[elder_thing]: -X. X is the cost.");
    expect(r.effects).toEqual({ skull: { modifier: -1 }, cultist: { modifier: -4 }, tablet: { modifier: -4 }, elderThing: { modifier: -2 } });
    expect(r.approximated).toEqual(["elderThing"]);
  });
  it("no text gives no effects", () => {
    expect(tokenEffects(undefined)).toEqual({ effects: {}, approximated: [] });
  });
});

describe("actsAndAgendas", () => {
  it("takes the scenario set's acts and agendas in stage order, one per stage", () => {
    const cards = [
      { code: "02046", type: "act", stage: 3, set: "s" },
      { code: "02044", type: "act", stage: 1, set: "s" },
      { code: "02045", type: "act", stage: 2, set: "s" },
      { code: "02045b", type: "act", stage: 2, set: "s" },
      { code: "02042", type: "agenda", stage: 1, set: "s" },
      { code: "02043", type: "agenda", stage: 2, set: "s" },
      { code: "09999", type: "act", stage: 1, set: "other" },
    ];
    expect(actsAndAgendas(cards, "s")).toEqual({ acts: ["02044", "02045", "02046"], agendas: ["02042", "02043"] });
  });
});

describe("resolutionEffects", () => {
  const steps = {
    rescued: { id: "rescued", text: "record that…", effects: [{ type: "campaign_log", section: "campaign_notes", id: "warren_rice_rescued", text: "the investigators rescued Professor Warren Rice." }] },
    earn_rice: { id: "earn_rice", effects: [{ type: "add_card", investigator: "choice", card: "02061" }] },
    guilt: { id: "guilt", effects: [{ type: "add_chaos_token", tokens: ["tablet", "frost"] }] },
    earn_xp: { id: "earn_xp", type: "input", input: { type: "counter", effects: [{ type: "earn_xp", investigator: "all", bonus: 1 }] } },
    hurt: { id: "hurt", effects: [{ type: "trauma", investigator: "lead_investigator", physical: 1 }] },
    madness: { id: "madness", effects: [{ type: "add_weakness", investigator: "all", weakness_traits: ["Madness"] }] },
    gone: { id: "gone", effects: [{ type: "remove_card", card: "02140" }] },
  };
  it("maps log records, earned cards, chaos tokens, experience, trauma, weaknesses and removed cards; collects the log labels", () => {
    const r = resolutionEffects(["rescued", "earn_rice", "guilt", "earn_xp", "hurt", "madness", "gone", "$upgrade_decks", "missing"], steps);
    expect(r.effects).toEqual([
      { do: "record", key: "warren_rice_rescued", value: true },
      { do: "earnCard", code: "02061", who: "choice" },
      { do: "addChaosToken", token: "tablet" },
      { do: "xp", victory: true, bonus: 1, who: "each" },
      { do: "trauma", who: "lead", physical: 1, mental: 0 },
      { do: "addWeakness", trait: "Madness" },
      { do: "removeCard", code: "02140" },
    ]);
    expect(r.labels).toEqual({ warren_rice_rescued: "the investigators rescued Professor Warren Rice." });
  });
  it("a resolution without an experience step still gives the victory display's experience", () => {
    expect(resolutionEffects([], {}).effects).toEqual([{ do: "xp", victory: true, bonus: 0, who: "each" }]);
  });
});

describe("prologueOf", () => {
  const campaign = {
    setup: ["prologue", "choose_investigators"],
    steps: [
      { id: "prologue", type: "story", text: "“I’m going to burn his accursed diary…”\n–H. P. Lovecraft" },
      { id: "choose_investigators", type: "input", text: "Choose investigators" },
    ],
  };
  it("is the campaign's first story step, its markup removed", () => {
    expect(prologueOf(campaign)).toBe("“I’m going to burn his accursed diary…”\n–H. P. Lovecraft");
    expect(prologueOf({ ...campaign, steps: [{ id: "prologue", type: "story", text: "<i>Friday</i>, September 18." }] })).toBe("Friday, September 18.");
  });
  it("is nothing when the campaign has no story step", () => {
    expect(prologueOf({ setup: ["a"], steps: [{ id: "a", type: "input", text: "x" }] })).toBeUndefined();
    expect(prologueOf({})).toBeUndefined();
  });
});

describe("introLead", () => {
  it("is the first paragraph, markup removed; nothing for no intro", () => {
    expect(introLead("<fancy>April 15</fancy> Something.\n\nSecond paragraph.")).toBe("April 15 Something.");
    expect(introLead(undefined)).toBeUndefined();
    expect(introLead("  ")).toBeUndefined();
  });
});

describe("isOfficial and kebab", () => {
  it("fan-made campaigns and the unofficial Return to Innsmouth are not official", () => {
    expect(isOfficial("dwl")).toBe(true);
    expect(isOfficial("zaw")).toBe(false);
    expect(isOfficial("rttic")).toBe(false);
  });
  it("guide ids become file ids", () => {
    expect(kebab("extracurricular_activity")).toBe("extracurricular-activity");
  });
});
