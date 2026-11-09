import { beforeAll, describe, expect, it } from "vitest";
import { loadCampaign } from "../../../content";
import { stepRefs } from "../../../content/schema";
import { startCampaign } from "../campaign";
import { type CampaignState } from "../types";
import { advance, openChoices, startResolution } from "../flow";
import { db } from "../../kits/testkit";

// every generated campaign's real flow, walked with automatic answers and scenarios that end at once: none may strand
// (an error, a prompt nobody can answer, a flow that never ends)
const ids = Object.values(db.campaigns)
  .filter((c) => c.generated)
  .map((c) => c.id);

beforeAll(async () => {
  await Promise.all(ids.map((id) => loadCampaign(id)));
});

/** the first answer the prompt accepts (the first choice whose own test passes) */
function answerFor(c: CampaignState): string | number | string[] | null {
  const st = c.flow.waiting!.step;
  const active = c.investigators.filter((i) => i.status === "active").map((i) => i.code);
  switch (st.kind) {
    case "chooseOne":
      return openChoices(db, c, st.choices)[0].id;
    case "counter":
      return st.min;
    case "investigatorChoice":
      return st.optional ? null : active[0];
    case "investigator":
      return active[0];
    case "cardChoice":
      return st.codes.length ? st.codes.slice(0, st.min) : c.investigators[0].deck.slice(0, st.min);
    case "checklist":
      return st.choices.slice(0, st.min).map((x) => x.id);
    case "sideScenario":
      return null;
    default:
      return "continue";
  }
}

describe("every generated campaign's flow", () => {
  for (const id of ids) {
    it(`${id} runs from its start to a result`, () => {
      let c = startCampaign(db, {
        campaignId: id,
        difficulty: "standard",
        seed: 5,
        investigators: [{ code: "01001", deckId: "roland-starter" }],
      });
      const played: string[] = [];
      for (let step = 0; step < 1200 && !c.result; step++) {
        if (c.flow.waiting) {
          c = advance(db, c, answerFor(c) as string);
        } else if (c.flow.playing && c.flow.play) {
          // the scenario ends at once: its first resolution, nothing earned
          const sc = db.scenarios[c.flow.play];
          const keys = Object.keys(sc.resolutions);
          const resolution = keys.find((k) => k.startsWith("R")) ?? "none";
          played.push(`${sc.id}:${resolution}`);
          c.history.push({ scenarioId: sc.id, resolution, xp: 0, victory: 0 });
          c = startResolution(db, c, {
            id: sc.id,
            resolution,
            victory: 0,
            victoryCodes: [],
            cultistsVictory: [],
            cultistsRemaining: [],
            notResigned: [c.lead],
          });
        } else
          throw new Error(
            `${id}: the flow is neither waiting nor playing (${JSON.stringify(c.flow).slice(0, 300)})`,
          );
      }
      expect(c.result, `${id} did not finish after playing ${played.join(", ")}`).not.toBeNull();
    });
  }
});

// the story reader answers the steps before a scenario (a campaign's setup, a scenario's own `before`); a deck upgrade or a
// side scenario met there is handed to the paper screen. Two guides ask for a deck upgrade at the start of a scenario
describe("the steps before a scenario (campaign-story-reader)", () => {
  it("reach a deck upgrade or a side scenario only where the guide asks one at a scenario's start", () => {
    const found: string[] = [];
    for (const [campaign, flow] of Object.entries(db.flows)) {
      const seen = new Set<string>();
      const walk = (id: string) => {
        if (seen.has(id) || !flow.steps[id]) return;
        seen.add(id);
        const st = flow.steps[id];
        if (st.kind === "upgradeDecks" || st.kind === "sideScenario")
          found.push(`${campaign}:${id}`);
        stepRefs(st).forEach(walk);
      };
      flow.setup.forEach(walk);
      Object.values(flow.before).flat().forEach(walk);
    }
    expect(found.sort()).toEqual([
      "the-innsmouth-conspiracy:the-vanishing-of-elina-harper:upgradeDecks",
      "the-scarlet-keys:marrakesh:upgradeDecks",
    ]);
  });
});
