import { describe, expect, it } from "vitest";
import { CampaignFlow } from "../src/content/schema";
import { compileFlow, type FlowSource } from "./campaignFlow";

const ids = new Map([
  ["extracurricular_activity", "extracurricular-activity"],
  ["the_house_always_wins", "the-house-always-wins"],
]);

const campaign = {
  id: "dwl",
  scenarios: ["dwl_prologue", "extracurricular_activity", "the_house_always_wins", "armitages_fate"],
  setup: ["prologue", "choose_investigators", "difficulty_choice", "save_decks"],
  steps: [
    { id: "prologue", type: "story", text: "Their hand is at your throats, yet ye see Them not…" },
    { id: "choose_investigators", type: "input", input: { type: "scenario_investigators" } },
    { id: "difficulty_choice", type: "input", input: { type: "choose_one", choices: [{ id: "easy", text: "Easy", effects: [{ type: "campaign_data", setting: "difficulty", value: "easy" }] }] } },
    { id: "save_decks", type: "input", input: { type: "save_decks", trauma: true } },
  ],
};

const extra = {
  id: "extracurricular_activity",
  steps: [
    { id: "warren_rice_kidnapped", effects: [{ type: "campaign_log", section: "campaign_notes", id: "warren_rice_kidnapped", text: "Professor Warren Rice was kidnapped." }] },
    { id: "unconscious", effects: [{ type: "campaign_log", section: "campaign_notes", id: "unconscious_for_several_hours", text: "the investigators were unconscious for several hours." }] },
    { id: "earn_1_xp", type: "input", text: "Each investigator earns experience equal to the Victory X value.", input: { type: "counter", text: "Victory display:", effects: [{ type: "earn_xp", investigator: "all", bonus: 1 }] } },
    { id: "failed_to_save_students", text: "Add 1 [tablet] token to the chaos bag.", effects: [{ type: "campaign_log", section: "campaign_notes", id: "failed_to_save_students", text: "the investigators failed to save the students." }, { type: "add_chaos_token", tokens: ["tablet"] }] },
    {
      id: "proceed_either",
      type: "branch",
      condition: {
        type: "campaign_data",
        campaign_data: "scenario_completed",
        scenario: "the_house_always_wins",
        options: [
          { boolCondition: false, steps: ["$upgrade_decks"], effects: [{ type: "campaign_data", setting: "next_scenario", scenario: "the_house_always_wins" }] },
          { boolCondition: true, effects: [{ type: "campaign_data", setting: "next_scenario", scenario: "armitages_fate" }] },
        ],
      },
    },
  ],
  resolutions: [
    { id: "no_resolution", steps: ["warren_rice_kidnapped", "earn_1_xp", "proceed_either"] },
    { id: "R4", steps: ["unconscious", "warren_rice_kidnapped", "earn_1_xp", "failed_to_save_students", "proceed_either"] },
    { id: "R9x", steps: ["warren_rice_kidnapped"] },
  ],
};

const armitage = {
  id: "armitages_fate",
  type: "interlude",
  scenario_name: "Armitage's Fate",
  setup: ["check_unconscious", "$upgrade_decks"],
  steps: [
    { id: "check_unconscious", type: "branch", condition: { type: "campaign_log", section: "campaign_notes", id: "unconscious_for_several_hours", options: [{ boolCondition: true, steps: ["fate_1", "kidnapped", "bonus_xp"] }, { boolCondition: false, steps: ["fate_2", "earn_henry"] }] } },
    { id: "fate_1", type: "story", title: "Armitage's Fate 1", text: "You are more than a little rattled." },
    { id: "fate_2", type: "story", text: "When you arrive at Dr. Armitage’s home…" },
    { id: "kidnapped", effects: [{ type: "campaign_log", section: "campaign_notes", id: "henry_armitage_kidnapped", text: "Dr. Henry Armitage was kidnapped." }] },
    { id: "bonus_xp", text: "Each investigator earns 2 bonus experience.", effects: [{ type: "earn_xp", investigator: "all", bonus: 2 }] },
    { id: "earn_henry", text: "Any one investigator may add Dr. Henry Armitage.", effects: [{ type: "add_card", investigator: "choice", card: "02040" }] },
  ],
};

const pick = {
  id: "dwl_prologue",
  type: "interlude",
  scenario_name: "Prologue",
  setup: ["intro", "scenario_choice"],
  steps: [
    { id: "intro", type: "story", text: "Dr. Henry Armitage pours himself a glass of pinot." },
    {
      id: "scenario_choice",
      type: "input",
      input: {
        type: "choose_one",
        choices: [
          { id: "1a", text: "Search for Rice", effects: [{ type: "campaign_data", setting: "next_scenario", scenario: "extracurricular_activity" }] },
          { id: "1b", text: "Talk to Morgan", effects: [{ type: "campaign_data", setting: "next_scenario", scenario: "the_house_always_wins" }] },
        ],
      },
    },
  ],
};

const house = { id: "the_house_always_wins", steps: [], resolutions: [] };
const source: FlowSource = { campaign, scenarios: [pick, extra, house, armitage], ids };
const compiled = () => compileFlow(source);
const stepsOf = (ids: string[], flow: CampaignFlow) => ids.map((i) => flow.steps[i]);

describe("compileFlow: the shape", () => {
  it("makes a flow the schema accepts, in the guide's order with the interludes where the guide puts them", () => {
    const { flow } = compiled();
    expect(CampaignFlow.safeParse(flow).success).toBe(true);
    expect(flow.order).toEqual(["dwl-prologue", "extracurricular-activity", "the-house-always-wins", "armitages-fate"]);
    expect(flow.interludes["armitages-fate"]).toMatchObject({ kind: "interlude", name: "Armitage's Fate" });
    expect(flow.interludes["dwl-prologue"].kind).toBe("interlude");
  });

  it("leaves out what the new-game screen already asks (investigators, difficulty, decks) and keeps the prologue story", () => {
    const { flow } = compiled();
    expect(stepsOf(flow.setup, flow).map((s) => s.kind)).toEqual(["story"]);
  });
});

describe("compileFlow: resolutions", () => {
  it("keeps every effect of a resolution, in order, with the victory-display counter as victory experience", () => {
    const { flow } = compiled();
    const r4 = stepsOf(flow.resolutions["extracurricular-activity"].R4, flow);
    const effects = r4.flatMap((s) => (s.kind === "effects" ? s.effects.map((e) => e.do + ":" + ("key" in e ? e.key : "token" in e ? e.token : "")) : []));
    expect(effects).toEqual(["record:unconscious_for_several_hours", "record:warren_rice_kidnapped", "xp:", "record:failed_to_save_students", "addChaosToken:tablet"]);
    const xp = r4.flatMap((s) => (s.kind === "effects" ? s.effects : [])).find((e) => e.do === "xp");
    expect(xp).toMatchObject({ do: "xp", victory: true, bonus: 1, who: "each" });
  });

  it("maps the no-resolution key to none and drops keys it can't name", () => {
    const { flow } = compiled();
    expect(Object.keys(flow.resolutions["extracurricular-activity"]).sort()).toEqual(["R4", "none"]);
  });

  it("shows a step's text (the rules it tells the players) before its effects", () => {
    const { flow } = compiled();
    const kinds = stepsOf(flow.resolutions["extracurricular-activity"].R4, flow).map((s) => s.kind);
    expect(kinds).toEqual(["effects", "effects", "effects", "story", "effects", "branch"]);
  });

  it("compiles the closing branch into a scenarioCompleted test with the next scenario and the deck upgrade", () => {
    const { flow } = compiled();
    const branch = stepsOf(flow.resolutions["extracurricular-activity"].none, flow).at(-1)!;
    expect(branch.kind).toBe("branch");
    if (branch.kind !== "branch") return;
    expect(branch.condition).toEqual({ kind: "scenarioCompleted", scenario: "the-house-always-wins" });
    const done = stepsOf(branch.then, flow);
    expect(done[0]).toMatchObject({ kind: "effects", effects: [{ do: "nextScenario", scenario: "armitages-fate" }] });
    const todo = stepsOf(branch.else, flow);
    expect(todo.map((s) => s.kind)).toEqual(["effects", "upgradeDecks"]);
    expect(todo[0]).toMatchObject({ effects: [{ do: "nextScenario", scenario: "the-house-always-wins" }] });
  });
});

describe("compileFlow: interludes and the prologue", () => {
  it("branches on the log, reads the stories, records the entries and gives the experience", () => {
    const { flow } = compiled();
    const steps = stepsOf(flow.interludes["armitages-fate"].steps, flow);
    expect(steps.map((s) => s.kind)).toEqual(["branch", "upgradeDecks"]);
    const b = steps[0];
    if (b.kind !== "branch") throw new Error("branch expected");
    expect(b.condition).toEqual({ kind: "logHas", id: "unconscious_for_several_hours", section: "campaign_notes" });
    expect(stepsOf(b.then, flow).map((s) => s.kind)).toEqual(["story", "effects", "story", "effects"]);
    expect(stepsOf(b.then, flow)[0]).toMatchObject({ kind: "story", title: "Armitage's Fate 1" });
    expect(stepsOf(b.else, flow).at(-1)).toMatchObject({ kind: "effects", effects: [{ do: "earnCard", code: "02040", who: "choice" }] });
  });

  it("turns the choice of the first scenario into buttons that name the next scenario", () => {
    const { flow } = compiled();
    const choice = stepsOf(flow.interludes["dwl-prologue"].steps, flow).find((s) => s.kind === "chooseOne");
    expect(choice && choice.kind === "chooseOne" && choice.choices.map((c) => c.effects)).toEqual([
      [{ do: "nextScenario", scenario: "extracurricular-activity" }],
      [{ do: "nextScenario", scenario: "the-house-always-wins" }],
    ]);
  });
});

describe("compileFlow: the log", () => {
  it("collects the labels the guide gives its entries", () => {
    const { logLabels } = compiled();
    expect(logLabels.warren_rice_kidnapped).toBe("Professor Warren Rice was kidnapped.");
    expect(logLabels.henry_armitage_kidnapped).toBe("Dr. Henry Armitage was kidnapped.");
  });
});

describe("compileFlow: what the game can't offer", () => {
  const withInputs = (inputs: object[], conds: object[] = []): FlowSource => ({
    campaign: { id: "x", scenarios: ["inter"], setup: [], steps: [] },
    scenarios: [{ id: "inter", type: "interlude", scenario_name: "Inter", setup: [...inputs, ...conds].map((s: any) => s.id), steps: [...inputs, ...conds] }],
    ids: new Map(),
  });

  it("compiles a prompt it can't offer as the guide's text with no outcome, and counts it by kind", () => {
    const r = compileFlow(withInputs([{ id: "link", type: "input", text: "Send a message", input: { type: "send_campaign_link", id: "a", prompt: "p", decision: [] } }]));
    expect(Object.values(r.flow.steps)).toEqual([expect.objectContaining({ kind: "unsupported", name: "send_campaign_link", text: "Send a message" })]);
    expect(r.unsupported).toEqual({ "input:send_campaign_link": 1 });
  });

  it("compiles a test it can't make into one that takes the guide's answer, and counts it", () => {
    const r = compileFlow(withInputs([{ id: "s", type: "story", text: "Mia." }], [{ id: "partner", type: "branch", condition: { type: "partner_status", partner: "x", status: "mia", options: [{ boolCondition: true, steps: ["s"] }] } }]));
    const b = r.flow.steps["inter:partner"];
    expect(b).toMatchObject({ kind: "branch", condition: { kind: "unsupported", name: "partner_status", take: false } });
    expect(r.unsupported).toEqual({ "condition:partner_status": 1 });
  });

  it("counts the effects it leaves out", () => {
    const r = compileFlow({ ...withInputs([{ id: "e", effects: [{ type: "gain_supplies", investigator: "all", section: "s", supplies: "x" }] }]) });
    expect(r.unsupported).toEqual({ "effect:gain_supplies": 1 });
  });
});

describe("compileFlow: tests that lead nowhere", () => {
  it("are not steps (everything they would do is something the game doesn't offer)", () => {
    const r = compileFlow({
      campaign: { id: "x", scenarios: ["inter"], setup: [], steps: [] },
      scenarios: [{ id: "inter", type: "interlude", scenario_name: "I", setup: ["b"], steps: [{ id: "b", type: "branch", condition: { type: "partner_status", options: [{ boolCondition: true, steps: [] }] } }] }],
      ids: new Map(),
    });
    expect(Object.keys(r.flow.steps)).toEqual([]);
  });
});

describe("compileFlow: conditions", () => {
  const one = (condition: object, extraSteps: object[] = []): FlowSource => ({
    campaign: { id: "x", scenarios: ["inter"], setup: [], steps: [] },
    scenarios: [{ id: "inter", type: "interlude", scenario_name: "I", setup: ["b"], steps: [{ id: "b", type: "branch", condition }, { id: "a", type: "story", text: "A" }, { id: "c", type: "story", text: "C" }, ...extraSteps] }],
    ids: new Map(),
  });

  it("switches a count into a chain of tests, with the guide's default last", () => {
    const r = compileFlow(
      one({ type: "campaign_log_count", section: "doubt", id: "doubt", options: [{ numCondition: 0, steps: ["a"] }, { numCondition: 1, steps: ["c"] }], default_option: { steps: ["a", "c"] } }),
    );
    const b = r.flow.steps["inter:b"];
    expect(b).toMatchObject({ kind: "branch", condition: { kind: "logCount", id: "doubt", section: "doubt", min: 0, max: 0 } });
    if (b.kind !== "branch") return;
    const next = r.flow.steps[b.else[0]];
    expect(next).toMatchObject({ kind: "branch", condition: { kind: "logCount", min: 1, max: 1 } });
    if (next.kind !== "branch") return;
    expect(next.else.map((i) => r.flow.steps[i].kind)).toEqual(["story", "story"]);
  });

  it("reads a difficulty switch, a player-count switch and a multi test", () => {
    const d = compileFlow(one({ type: "campaign_data", campaign_data: "difficulty", options: [{ condition: "hard", steps: ["a"] }, { condition: "expert", steps: ["a"] }] }));
    expect(d.flow.steps["inter:b"]).toMatchObject({ condition: { kind: "difficulty", is: ["hard"] } });
    const p = compileFlow(one({ type: "scenario_data", scenario_data: "player_count", options: [{ numCondition: 1, steps: ["a"] }] }));
    expect(p.flow.steps["inter:b"]).toMatchObject({ condition: { kind: "playerCount", min: 1, max: 1 } });
    const m = compileFlow(one({ type: "multi", count: 2, conditions: [{ type: "campaign_log", section: "s", id: "x", options: [] }, { type: "campaign_log", section: "s", id: "y", options: [] }], options: [{ boolCondition: true, steps: ["a"] }, { boolCondition: false, steps: ["c"] }] }));
    expect(m.flow.steps["inter:b"]).toMatchObject({ condition: { kind: "all", conditions: [{ kind: "logHas", id: "x" }, { kind: "logHas", id: "y" }] } });
  });

  it("an option's own effects run before its steps", () => {
    const r = compileFlow(one({ type: "campaign_log", section: "s", id: "x", options: [{ boolCondition: true, effects: [{ type: "campaign_log", section: "s", id: "z", text: "Z" }], steps: ["a"] }] }));
    const b = r.flow.steps["inter:b"];
    if (b.kind !== "branch") throw new Error("branch");
    expect(b.then.map((i) => r.flow.steps[i].kind)).toEqual(["effects", "story"]);
  });
});

describe("compileFlow: effects", () => {
  const fx = (effects: object[]) => {
    const r = compileFlow({ campaign: { id: "x", scenarios: ["inter"], setup: [], steps: [] }, scenarios: [{ id: "inter", type: "interlude", scenario_name: "I", setup: ["e"], steps: [{ id: "e", effects }] }], ids });
    const st = r.flow.steps["inter:e"];
    return st?.kind === "effects" ? st.effects : [];
  };

  it("maps counts, card lists, trauma, tokens and the order of play", () => {
    expect(
      fx([
        { type: "campaign_log_count", section: "doubt", id: "doubt", operation: "add", value: 1 },
        { type: "campaign_log_count", section: "s", id: "n", operation: "set", value: 3 },
        { type: "campaign_log_cards", section: "sacrificed", id: "sacrificed", cards: true, codes: ["02040"] },
        { type: "trauma", investigator: "all", mental: 1 },
        { type: "trauma", investigator: "lead_investigator", physical: 1, mental: 1 },
        { type: "add_chaos_token", tokens: ["skull", "-2"] },
        { type: "remove_chaos_token", tokens: ["cultist"] },
        { type: "campaign_data", setting: "skip_scenario", scenario: "the_house_always_wins" },
        { type: "campaign_data", setting: "replay_scenario", scenario: "extracurricular_activity" },
        { type: "remove_card", investigator: "all", card: "01000" },
      ]),
    ).toEqual([
      { do: "count", id: "doubt", section: "doubt", op: "add", value: 1 },
      { do: "count", id: "n", section: "s", op: "set", value: 3 },
      { do: "listCards", id: "sacrificed", section: "sacrificed", codes: ["02040"], remove: false },
      { do: "trauma", who: "each", physical: 0, mental: 1 },
      { do: "trauma", who: "lead", physical: 1, mental: 1 },
      { do: "addChaosToken", token: "skull" },
      { do: "addChaosToken", token: "-2" },
      { do: "removeChaosToken", token: "cultist" },
      { do: "skipScenario", scenario: "the-house-always-wins" },
      { do: "replayScenario", scenario: "extracurricular-activity" },
      { do: "removeCard", code: "01000", who: "each" },
    ]);
  });

  it("crosses out and erases log entries, and keeps hidden ones in the hidden section", () => {
    expect(fx([{ type: "campaign_log", section: "s", id: "a", cross_out: true }, { type: "campaign_log", section: "s", id: "b", remove: true }, { type: "campaign_log", hidden: true, section: "hidden", id: "c", text: "dummy" }])).toEqual([
      { do: "crossOut", key: "a", section: "s" },
      { do: "crossOut", key: "b", section: "s", erase: true },
      { do: "record", key: "c", section: "hidden", value: true },
    ]);
  });
});
