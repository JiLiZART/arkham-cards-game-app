import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { checkFlow } from "./flowChecks";
import { CampaignDef, CampaignFlow } from "./schema";

const campaign = CampaignDef.parse({
  id: "c",
  name: "C",
  scenarios: ["a", "b"],
  chaosBags: { standard: ["0"] },
  logSections: [
    { id: "campaign_notes", kind: "entries", label: "Notes" },
    { id: "doubt", kind: "count", label: "Doubt" },
  ],
});
const flow = (over: object = {}) =>
  CampaignFlow.parse({
    setup: ["intro"],
    order: ["a", "mid", "b"],
    interludes: { mid: { kind: "interlude", steps: ["check"] } },
    resolutions: { a: { R1: ["done"] } },
    steps: {
      intro: { kind: "story", text: "x" },
      check: {
        kind: "branch",
        condition: { kind: "logCount", id: "doubt", section: "doubt", min: 1 },
        then: ["done"],
        else: [],
      },
      done: {
        kind: "effects",
        effects: [
          { do: "count", id: "doubt", section: "doubt", op: "add", value: 1 },
          { do: "nextScenario", scenario: "b" },
        ],
      },
    },
    ...over,
  });
const run = (f = flow(), c = campaign) =>
  checkFlow({ ...db, campaigns: { ...db.campaigns, c }, flows: { ...db.flows, c: f } }, "c").map(
    (e) => `${e.path}: ${e.message}`,
  );

describe("checkFlow", () => {
  it("passes a flow whose steps are all reached, whose scenarios, sections and cards exist", () => {
    expect(run()).toEqual([]);
  });

  it("reports a step nothing leads to", () => {
    const f = flow({ steps: { ...flow().steps, lost: { kind: "story", text: "never read" } } });
    expect(run(f).join("\n")).toMatch(/steps\.lost.*unreachable/);
  });

  it("reports an order that names a scenario or interlude that isn't there, and a scenario missing from the order", () => {
    expect(run(flow({ order: ["a", "ghost", "b"] })).join("\n")).toMatch(/order.*ghost/);
    expect(
      run(
        flow({
          order: ["a", "mid"],
          steps: { ...flow().steps, done: { kind: "effects", effects: [] } },
        }),
      ).join("\n"),
    ).toMatch(/scenario b is not in the order/);
  });

  it("lets a scenario outside the order be played when a step sends play to it", () => {
    expect(run(flow({ order: ["a", "mid"] }))).toEqual([]);
  });

  it("lets a step send play to an interlude", () => {
    const f = flow({
      steps: {
        ...flow().steps,
        done: {
          kind: "effects",
          effects: [
            { do: "nextScenario", scenario: "mid" },
            { do: "skipScenario", scenario: "mid" },
          ],
        },
      },
    });
    expect(run(f)).toEqual([]);
  });

  it("reports a next, skip, replay or completed scenario the campaign doesn't have", () => {
    const f = flow({
      steps: {
        ...flow().steps,
        done: { kind: "effects", effects: [{ do: "nextScenario", scenario: "zzz" }] },
      },
    });
    expect(run(f).join("\n")).toMatch(/zzz/);
    const g = flow({
      steps: {
        ...flow().steps,
        check: {
          kind: "branch",
          condition: { kind: "scenarioCompleted", scenario: "yyy" },
          then: ["done"],
          else: [],
        },
      },
    });
    expect(run(g).join("\n")).toMatch(/yyy/);
  });

  it("reports a log section the campaign doesn't define, in a test or an effect", () => {
    const f = flow({
      steps: {
        ...flow().steps,
        check: {
          kind: "branch",
          condition: { kind: "logHas", id: "x", section: "nowhere" },
          then: ["done"],
          else: [],
        },
      },
    });
    expect(run(f).join("\n")).toMatch(/section nowhere/);
    const g = flow({
      steps: {
        ...flow().steps,
        done: {
          kind: "effects",
          effects: [{ do: "record", key: "x", section: "elsewhere", value: true }],
        },
      },
    });
    expect(run(g).join("\n")).toMatch(/section elsewhere/);
  });

  it("allows the notes and hidden sections without declaring them", () => {
    const f = flow({
      steps: {
        ...flow().steps,
        done: {
          kind: "effects",
          effects: [
            { do: "record", key: "x", section: "hidden", value: true },
            { do: "record", key: "y", section: "campaign_notes", value: true },
          ],
        },
      },
    });
    expect(run(f)).toEqual([]);
  });

  it("reports a card that doesn't exist, but not an input's card", () => {
    const f = flow({
      steps: {
        ...flow().steps,
        done: {
          kind: "effects",
          effects: [
            { do: "earnCard", code: "99999", who: "choice" },
            { do: "removeCard", code: "$input" },
          ],
        },
      },
    });
    const out = run(f).join("\n");
    expect(out).toMatch(/99999/);
    expect(out).not.toMatch(/\$input/);
  });

  it("reports a resolution of a scenario the campaign doesn't have", () => {
    expect(run(flow({ resolutions: { nope: { R1: ["done"] } } })).join("\n")).toMatch(
      /resolutions\.nope/,
    );
  });
});
