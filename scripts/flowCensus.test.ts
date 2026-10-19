import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CampaignDef, CampaignFlow, type FlowCondition } from "../src/content/schema";

// the committed output of `npm run import:campaigns`: every generated campaign's flow, counted, so a change to the
// compiler (or to what the guides give) shows as a number that moved
const DIR = "content/campaigns-generated";
const read = (id: string, file: string) => JSON.parse(readFileSync(`${DIR}/${id}/${file}`, "utf8"));
const ids = readdirSync(DIR);
const flows = ids.map((id) => ({ id, flow: CampaignFlow.parse(read(id, "flow.json")) }));

const unsupportedTests = (c: FlowCondition): number => (c.kind === "unsupported" ? 1 : c.kind === "not" ? unsupportedTests(c.condition) : c.kind === "all" || c.kind === "any" ? c.conditions.reduce((n, x) => n + unsupportedTests(x), 0) : 0);

describe("the generated flows", () => {
  it("are one per generated campaign, each valid", () => {
    expect(ids.length).toBe(36);
    expect(flows.length).toBe(36);
  });

  it("hold the interludes, the resolutions and the prompts the guides give, and as many as can't be offered as the census says", () => {
    const steps = flows.flatMap((f) => Object.values(f.flow.steps));
    expect(flows.reduce((n, f) => n + Object.keys(f.flow.interludes).length, 0)).toBe(123);
    expect(flows.reduce((n, f) => n + Object.values(f.flow.resolutions).reduce((m, r) => m + Object.keys(r).length, 0), 0)).toBe(590);
    expect(steps.filter((s) => s.kind === "unsupported").length).toBe(173);
    expect(steps.reduce((n, s) => n + (s.kind === "branch" ? unsupportedTests(s.condition) : 0), 0)).toBe(199);
    expect(steps.filter((s) => s.kind === "upgradeDecks").length).toBe(164);
  });

  it("list their scenario reference cards in the campaign's order, the interludes marked, as the picker needs", () => {
    const dwl = CampaignDef.parse(read("the-dunwich-legacy", "campaign.json"));
    expect(dwl.cards.map((c) => c.scenario)).toEqual(flows.find((f) => f.id === "the-dunwich-legacy")!.flow.order);
    expect(dwl.cards.filter((c) => c.interlude).map((c) => c.name)).toEqual(["Prologue", "Armitage's Fate", "The Survivors", "Epilogue"]);
    expect(dwl.cards.find((c) => c.scenario === "extracurricular-activity")?.code).toBe("02041");
    expect(dwl.logSections.map((s) => s.id)).toEqual(["campaign_notes", "sacrificed"]);
  });

  it("start Dunwich with its prologue, which names the first scenario to play", () => {
    const { flow } = flows.find((f) => f.id === "the-dunwich-legacy")!;
    expect(flow.order[0]).toBe("dwl-prologue");
    const choose = flow.interludes["dwl-prologue"].steps.map((s) => flow.steps[s]).find((s) => s.kind === "chooseOne");
    expect(choose && choose.kind === "chooseOne" && choose.choices.flatMap((c) => c.effects).map((e) => ("scenario" in e ? e.scenario : ""))).toEqual(["extracurricular-activity", "the-house-always-wins"]);
  });

  it("branch Armitage's Fate on whether the investigators were unconscious", () => {
    const { flow } = flows.find((f) => f.id === "the-dunwich-legacy")!;
    const first = flow.steps[flow.interludes["armitages-fate"].steps[0]];
    expect(first).toMatchObject({ kind: "branch", condition: { kind: "logHas", id: "unconscious_for_several_hours" } });
  });

  it("keep Extracurricular Activity's Resolution 4 with its records, experience and token", () => {
    const { flow } = flows.find((f) => f.id === "the-dunwich-legacy")!;
    const effects = flow.resolutions["extracurricular-activity"].R4.map((s) => flow.steps[s]).flatMap((s) => (s.kind === "effects" ? s.effects : []));
    expect(effects.map((e) => e.do)).toEqual(expect.arrayContaining(["record", "xp", "addChaosToken"]));
    expect(effects.filter((e) => e.do === "record").map((e) => (e as { key: string }).key)).toEqual(expect.arrayContaining(["unconscious_for_several_hours", "warren_rice_kidnapped", "failed_to_save_students"]));
  });

  it("play Carcosa's scenarios the guide leaves to the players in the file's order after the listed ones", () => {
    const { flow } = flows.find((f) => f.id === "the-path-to-carcosa")!;
    expect(flow.order.slice(0, 3)).toEqual(["ptc-prologue", "curtain-call", "the-last-king"]);
    expect(flow.order).toEqual(expect.arrayContaining(["echoes-of-the-past", "the-unspeakable-oath", "the-pallid-mask", "dim-carcosa"]));
  });

  it("send Fortune and Folly's checkpoint to a scenario that exists", () => {
    const { flow } = flows.find((f) => f.id === "fortune-and-folly")!;
    expect(Object.keys(flow.interludes)).toContain("fortune-and-folly-checkpoint");
  });

  it("count Carcosa's doubt and conviction in sections of their own", () => {
    const carcosa = CampaignDef.parse(read("the-path-to-carcosa", "campaign.json"));
    expect(carcosa.logSections.some((s) => s.kind === "count")).toBe(true);
    const { flow } = flows.find((f) => f.id === "the-path-to-carcosa")!;
    expect(Object.values(flow.steps).some((s) => s.kind === "effects" && s.effects.some((e) => e.do === "count"))).toBe(true);
  });
});
