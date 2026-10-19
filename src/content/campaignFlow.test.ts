import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { flowOf, resolutionSteps } from "./flow";
import { CampaignDef, CampaignFlow, FlowCondition, FlowEffect } from "./schema";

const flow = (over: Record<string, unknown> = {}) => ({
  setup: ["intro"],
  order: ["extracurricular", "armitage"],
  interludes: { armitage: { kind: "interlude", name: "Armitage's Fate", steps: ["check"] } },
  resolutions: { extracurricular: { R1: ["rescued"], none: ["lost"] } },
  steps: {
    intro: { kind: "story", text: "Their hand is at your throats" },
    check: { kind: "branch", condition: { kind: "logHas", id: "unconscious" }, then: ["rescued"], else: ["lost"] },
    rescued: { kind: "effects", effects: [{ do: "record", key: "rescued" }] },
    lost: { kind: "story", text: "Lost." },
  },
  ...over,
});

describe("CampaignFlow", () => {
  it("accepts a flow whose references all resolve", () => {
    expect(CampaignFlow.safeParse(flow()).success).toBe(true);
  });

  it("refuses a step that names a step that doesn't exist", () => {
    const bad = flow({ steps: { ...flow().steps, check: { kind: "branch", condition: { kind: "logHas", id: "x" }, then: ["nope"], else: [] } } });
    const r = CampaignFlow.safeParse(bad);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.success ? "" : r.error.issues)).toContain("nope");
  });

  it("refuses a setup, an interlude or a resolution naming a missing step", () => {
    for (const bad of [flow({ setup: ["gone"] }), flow({ interludes: { armitage: { kind: "interlude", steps: ["gone"] } } }), flow({ resolutions: { extracurricular: { R1: ["gone"] } } })]) {
      expect(CampaignFlow.safeParse(bad).success).toBe(false);
    }
  });

  it("follows the steps inside a choice, a counter's effects and a nested branch", () => {
    const steps = {
      ...flow().steps,
      pick: { kind: "chooseOne", text: "Who?", choices: [{ id: "a", text: "A", effects: [], steps: ["ghost"] }] },
    };
    expect(CampaignFlow.safeParse(flow({ steps })).success).toBe(false);
  });

  it("refuses a step without a kind and an unknown kind", () => {
    expect(CampaignFlow.safeParse(flow({ steps: { intro: { text: "x" } } })).success).toBe(false);
    expect(CampaignFlow.safeParse(flow({ steps: { intro: { kind: "dance" } } })).success).toBe(false);
  });
});

describe("FlowCondition", () => {
  it("reads the log, the campaign data and combines", () => {
    const ok = [
      { kind: "logHas", id: "x" },
      { kind: "logHas", id: "x", section: "campaign_notes" },
      { kind: "logCrossedOut", id: "x" },
      { kind: "logCount", id: "doubt", min: 1 },
      { kind: "logCards", id: "interrogated", card: "01138" },
      { kind: "investigatorCount", id: "xp", inv: "any", min: 2 },
      { kind: "scenarioCompleted", scenario: "the-gathering", resolution: "R1" },
      { kind: "difficulty", is: ["hard", "expert"] },
      { kind: "playerCount", min: 3 },
      { kind: "hasCard", card: "01016", inv: "any" },
      { kind: "not", condition: { kind: "logHas", id: "x" } },
      { kind: "all", conditions: [{ kind: "logHas", id: "x" }, { kind: "any", conditions: [{ kind: "playerCount", max: 2 }] }] },
      { kind: "unsupported", name: "partner_status", take: false },
    ];
    for (const c of ok) expect(FlowCondition.safeParse(c).success, JSON.stringify(c)).toBe(true);
  });

  it("refuses an unknown kind and an unknown field", () => {
    expect(FlowCondition.safeParse({ kind: "weather" }).success).toBe(false);
    expect(FlowCondition.safeParse({ kind: "logHas", id: "x", colour: "red" }).success).toBe(false);
  });
});

describe("FlowEffect", () => {
  it("keeps the effects a resolution always had, and adds the campaign's own", () => {
    const ok = [
      { do: "record", key: "houseBurned" },
      { do: "record", key: "x", section: "campaign_notes", text: "Something happened." },
      { do: "xp", bonus: 2, who: "input" },
      { do: "earnCard", code: "02040", who: "choice" },
      { do: "count", id: "doubt", op: "add", value: 1 },
      { do: "count", id: "supplies", op: "add", value: "input" },
      { do: "listCards", id: "sacrificed", codes: ["02040"] },
      { do: "investigatorCount", id: "xp", who: "input", op: "add", value: 1 },
      { do: "removeChaosToken", token: "cultist" },
      { do: "replaceCard", old: "01016", new: "01016", who: "each" },
      { do: "nextScenario", scenario: "the-house-always-wins" },
      { do: "skipScenario", scenario: "armitages-fate" },
      { do: "replayScenario", scenario: "the-gathering" },
      { do: "setData", key: "version", value: 2 },
    ];
    for (const e of ok) expect(FlowEffect.safeParse(e).success, JSON.stringify(e)).toBe(true);
  });

  it("refuses an unknown effect", () => {
    expect(FlowEffect.safeParse({ do: "teleport" }).success).toBe(false);
  });
});

describe("CampaignDef additions", () => {
  const base = { id: "c", name: "C", scenarios: ["a"], chaosBags: { standard: ["0"] } };
  it("defaults to no log sections and no card list", () => {
    const r = CampaignDef.parse(base);
    expect(r.logSections).toEqual([]);
    expect(r.cards).toEqual([]);
  });

  it("takes log sections of each kind and the scenario cards with interludes marked", () => {
    const r = CampaignDef.safeParse({
      ...base,
      logSections: [
        { id: "campaign_notes", kind: "entries", label: "Campaign Notes" },
        { id: "doubt", kind: "count", label: "Doubt" },
      ],
      cards: [{ scenario: "a", code: "02041" }, { scenario: "dwl-interlude", interlude: true }],
    });
    expect(r.success).toBe(true);
  });

  it("refuses a log section of an unknown kind", () => {
    expect(CampaignDef.safeParse({ ...base, logSections: [{ id: "x", kind: "magic", label: "X" }] }).success).toBe(false);
  });
});

describe("flows in the content", () => {
  it("Night of the Zealot's hand-written flow plays its three scenarios in order and declares the notes section", () => {
    const f = flowOf(db, "night-of-the-zealot");
    expect(f.order).toEqual(["the-gathering", "the-midnight-masks", "the-devourer-below"]);
    expect(db.campaigns["night-of-the-zealot"].logSections.map((x) => x.id)).toEqual(["campaign_notes"]);
  });

  it("a campaign with no flow file plays its scenarios in the campaign's order, with nothing between them", () => {
    const f = flowOf({ ...db, flows: {} }, "night-of-the-zealot");
    expect(f).toMatchObject({ setup: [], order: ["the-gathering", "the-midnight-masks", "the-devourer-below"], interludes: {}, resolutions: {}, steps: {} });
  });

  it("refuses a campaign that doesn't exist", () => {
    expect(() => flowOf(db, "nope")).toThrow(/unknown campaign/);
  });
});

describe("resolutionSteps", () => {
  it("turns a hand-written resolution's effects into one effects step, in the order they are written", () => {
    const { ids, steps } = resolutionSteps(db, "night-of-the-zealot", "the-gathering", "R1");
    expect(ids).toEqual(["res:the-gathering:R1"]);
    const st = steps[ids[0]];
    expect(st.kind).toBe("effects");
    expect(st.kind === "effects" && st.effects.map((e) => e.do)).toEqual(["record", "earnCard", "trauma", "xp"]);
  });

  it("uses the flow's own steps for a resolution it lists", () => {
    const withFlow = {
      ...db,
      flows: { "night-of-the-zealot": { setup: [], order: ["the-gathering"], interludes: {}, resolutions: { "the-gathering": { R1: ["a"] } }, steps: { a: { kind: "story" as const, text: "x", bullets: [] } } } },
    };
    const r = resolutionSteps(withFlow, "night-of-the-zealot", "the-gathering", "R1");
    expect(r.ids).toEqual(["a"]);
    expect(r.steps.a.kind).toBe("story");
  });

  it("falls back to the none resolution for one the scenario doesn't have", () => {
    expect(resolutionSteps(db, "night-of-the-zealot", "the-gathering", "R9").ids).toEqual(["res:the-gathering:none"]);
  });
});
