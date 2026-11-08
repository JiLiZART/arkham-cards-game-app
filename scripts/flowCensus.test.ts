import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CampaignDef, CampaignFlow, type FlowCondition } from "../src/content/schema";

// the committed output of `npm run import:campaigns`: every generated campaign's flow, counted, so a change to the
// compiler (or to what the guides give) shows as a number that moved
const DIR = "content/campaigns-generated";
// The Dunwich Legacy and The Path to Carcosa were generated, then moved to the hand-written campaigns
// (campaign-the-dunwich-legacy, campaign-the-path-to-carcosa): their files there started as the importer's output
const HAND = new Set(["the-dunwich-legacy", "the-path-to-carcosa"]);
const read = (id: string, file: string) =>
  JSON.parse(
    readFileSync(HAND.has(id) ? `content/campaigns/${id}/${file}` : `${DIR}/${id}/${file}`, "utf8"),
  );
// folders only: a stray file there (a Finder .DS_Store) is not a campaign
const ids = readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const flows = ids.map((id) => ({ id, flow: CampaignFlow.parse(read(id, "flow.json")) }));
const dunwich = {
  id: "the-dunwich-legacy",
  flow: CampaignFlow.parse(read("the-dunwich-legacy", "flow.json")),
};
const carcosa = {
  id: "the-path-to-carcosa",
  flow: CampaignFlow.parse(read("the-path-to-carcosa", "flow.json")),
};

const unsupportedTests = (c: FlowCondition): number =>
  c.kind === "unsupported"
    ? 1
    : c.kind === "not"
      ? unsupportedTests(c.condition)
      : c.kind === "all" || c.kind === "any"
        ? c.conditions.reduce((n, x) => n + unsupportedTests(x), 0)
        : 0;

describe("the generated flows", () => {
  it("are one per generated campaign, each valid", () => {
    expect(ids.length).toBe(33); // Curse of the Rougarou now imports (its setup names no location); The Dunwich Legacy, The Path to Carcosa and their Return-to boxes are hand-written
    expect(flows.length).toBe(33);
  });

  it("hold the interludes, the resolutions and the prompts the guides give, and as many as can't be offered as the census says", () => {
    const steps = flows.flatMap((f) => Object.values(f.flow.steps));
    expect(flows.reduce((n, f) => n + Object.keys(f.flow.interludes).length, 0)).toBe(63); // only the interludes a flow reaches (no side flow carries another campaign's)
    expect(
      flows.reduce(
        (n, f) =>
          n + Object.values(f.flow.resolutions).reduce((m, r) => m + Object.keys(r).length, 0),
        0,
      ),
    ).toBe(417); // hidden resolutions are tails, not endings; a defeated/resigned pair is one none
    expect(steps.filter((s) => s.kind === "unsupported").length).toBe(152); // guide inputs the engine lacks: campaign links, supplies, partners, investigator choices
    expect(
      steps.reduce((n, s) => n + (s.kind === "branch" ? unsupportedTests(s.condition) : 0), 0),
    ).toBe(388); // The Scarlet Keys' $embark compiled per scenario (127); with the scenarios' own setup steps (flow.before) and the version check (always true)
    expect(steps.filter((s) => s.kind === "upgradeDecks").length).toBe(126);
  });

  it("list their scenario reference cards in the campaign's order, the interludes marked, as the picker needs", () => {
    const dwl = CampaignDef.parse(read("the-dunwich-legacy", "campaign.json"));
    expect(dwl.cards.map((c) => c.scenario)).toEqual(dunwich.flow.order);
    expect(dwl.cards.filter((c) => c.interlude).map((c) => c.name)).toEqual([
      "Prologue",
      "Armitage's Fate",
      "The Survivors",
      "Epilogue",
    ]);
    expect(dwl.cards.find((c) => c.scenario === "extracurricular-activity")).toMatchObject({
      code: "02041",
      agenda: "02042",
    });
    // every scenario of every campaign has its chapter art: its first agenda and first act, as its scenario file names them
    for (const { id } of [...flows, dunwich]) {
      const c = CampaignDef.parse(read(id, "campaign.json"));
      for (const ch of c.cards.filter((x) => !x.interlude)) {
        const sc = read(id, `scenarios/${ch.scenario}.json`);
        expect([ch.agenda, ch.act], `${id} ${ch.scenario}`).toEqual([sc.agendas[0], sc.acts[0]]);
      }
    }
    expect(dwl.logSections.map((s) => s.id)).toEqual(["campaign_notes", "sacrificed"]);
  });

  it("give every campaign a cover: the first agenda of the first scenario played", () => {
    for (const { id, flow } of flows) {
      const c = CampaignDef.parse(read(id, "campaign.json"));
      const first = flow.order.find((x) => c.scenarios.includes(x))!;
      expect(c.cover, id).toBe(read(id, `scenarios/${first}.json`).agendas[0]);
    }
    expect(CampaignDef.parse(read("the-dunwich-legacy", "campaign.json")).cover).toBe("02042");
  });

  it("start Dunwich with its prologue, which names the first scenario to play", () => {
    const { flow } = dunwich;
    expect(flow.order[0]).toBe("dwl-prologue");
    const choose = flow.interludes["dwl-prologue"].steps
      .map((s) => flow.steps[s])
      .find((s) => s.kind === "chooseOne");
    expect(
      choose &&
        choose.kind === "chooseOne" &&
        choose.choices.flatMap((c) => c.effects).map((e) => ("scenario" in e ? e.scenario : "")),
    ).toEqual(["extracurricular-activity", "the-house-always-wins"]);
  });

  it("branch Armitage's Fate on whether the investigators were unconscious", () => {
    const { flow } = dunwich;
    const first = flow.steps[flow.interludes["armitages-fate"].steps[0]];
    expect(first).toMatchObject({
      kind: "branch",
      condition: { kind: "logHas", id: "unconsciousForSeveralHours" },
    });
  });

  it("keep Extracurricular Activity's Resolution 4 with its records, experience and token", () => {
    const { flow } = dunwich;
    const effects = flow.resolutions["extracurricular-activity"].R4.map(
      (s) => flow.steps[s],
    ).flatMap((s) => (s.kind === "effects" ? s.effects : []));
    expect(effects.map((e) => e.do)).toEqual(
      expect.arrayContaining(["record", "xp", "addChaosToken"]),
    );
    expect(effects.filter((e) => e.do === "record").map((e) => (e as { key: string }).key)).toEqual(
      expect.arrayContaining([
        "unconsciousForSeveralHours",
        "warrenRiceKidnapped",
        "failedToSaveStudents",
      ]),
    );
  });

  it("play Carcosa's scenarios the guide leaves to the players in the file's order after the listed ones", () => {
    const { flow } = carcosa;
    expect(flow.order.slice(0, 3)).toEqual(["ptc-prologue", "curtain-call", "the-last-king"]);
    expect(flow.order).toEqual(
      expect.arrayContaining([
        "echoes-of-the-past",
        "the-unspeakable-oath",
        "the-pallid-mask",
        "dim-carcosa",
      ]),
    );
  });

  it("send Fortune and Folly's checkpoint to a scenario that exists", () => {
    const { flow } = flows.find((f) => f.id === "fortune-and-folly")!;
    expect(Object.keys(flow.interludes)).toContain("fortune-and-folly-checkpoint");
  });

  it("count Carcosa's doubt and conviction in sections of their own", () => {
    const def = CampaignDef.parse(read("the-path-to-carcosa", "campaign.json"));
    expect(def.logSections.some((s) => s.kind === "count")).toBe(true);
    const { flow } = carcosa;
    expect(
      Object.values(flow.steps).some(
        (s) => s.kind === "effects" && s.effects.some((e) => e.do === "count"),
      ),
    ).toBe(true);
  });
});
