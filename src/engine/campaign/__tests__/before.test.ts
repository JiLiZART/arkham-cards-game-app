import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../kits/testkit";
import { startCampaign } from "../campaign";
import { advance, openChoices } from "../flow";

const NOTZ = "night-of-the-zealot";
const saved = db.flows[NOTZ];
afterEach(() => {
  db.flows[NOTZ] = saved;
});
const start = () =>
  startCampaign(db, {
    campaignId: NOTZ,
    difficulty: "hard",
    seed: 1,
    investigators: [{ code: "01001", deckId: "roland-starter" }],
  });
const count = (bag: string[], t: string) => bag.filter((x) => x === t).length;

describe("a scenario's own setup steps (flow.before)", () => {
  it("run when the order reaches the scenario, before it is offered to play", () => {
    const plain = start();
    db.flows[NOTZ] = {
      ...saved,
      before: { "the-gathering": ["zzBefore"] },
      steps: {
        ...saved.steps,
        zzBefore: { kind: "effects", effects: [{ do: "addChaosToken", token: "-4" }] },
      },
    };
    const c = start();
    expect(c.flow.waiting?.step).toMatchObject({ kind: "play", scenario: "the-gathering" });
    expect(count(c.chaosBag, "-4")).toBe(count(plain.chaosBag, "-4") + 1);
  });

  it("a scenario without them is offered at once, with nothing shown", () => {
    const c = start();
    expect(c.flow.waiting?.step).toMatchObject({ kind: "play", scenario: "the-gathering" });
    expect(c.flow.shown).toEqual([]);
  });
});

describe("The Essex County Express's difficulty token (a generated campaign's flow.before)", () => {
  it("a Hard Dunwich campaign has the −4 in its bag when the order reaches Essex", async () => {
    const { loadCampaign, loadPack } = await import("../../../content");
    await loadPack("dwl");
    await loadCampaign("the-dunwich-legacy");
    const c0 = startCampaign(db, {
      campaignId: "the-dunwich-legacy",
      difficulty: "hard",
      seed: 1,
      investigators: [{ code: "01001", deckId: "roland-starter" }],
    });
    // the order jumps to Essex, as a "next scenario" step would send it
    const at = advance(db, {
      ...c0,
      flow: {
        ...c0.flow,
        waiting: null,
        play: null,
        queue: [],
        shown: [],
        override: "essex-county-express",
      },
    });
    expect(at.flow.waiting?.step).toMatchObject({ kind: "play", scenario: "essex-county-express" });
    expect(count(at.chaosBag, "-4")).toBe(count(c0.chaosBag, "-4") + 1);
  });
});

describe("a choice none of whose answers qualifies", () => {
  it("offers every answer rather than leaving the campaign with nothing to choose", () => {
    const never = { kind: "logHas" as const, id: "zzNever", section: "campaign_notes" };
    db.flows[NOTZ] = {
      ...saved,
      setup: ["zzAsk", ...saved.setup],
      steps: {
        ...saved.steps,
        zzAsk: {
          kind: "chooseOne",
          text: "Where first?",
          choices: [
            { id: "a", text: "A", steps: [], effects: [], when: never },
            { id: "b", text: "B", steps: [], effects: [], when: never },
          ],
        },
      },
    };
    const c = start();
    expect(c.flow.waiting?.id).toBe("zzAsk");
    const step = c.flow.waiting!.step;
    expect(step.kind === "chooseOne" && openChoices(db, c, step.choices).map((x) => x.id)).toEqual([
      "a",
      "b",
    ]);
    expect(() => advance(db, c, "b")).not.toThrow();
  });
});
