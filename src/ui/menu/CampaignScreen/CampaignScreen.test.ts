import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { loadAllPacks } from "../../../content";
import type { CampaignState } from "../../../engine/campaign/types";
import { startCampaign } from "../../../engine/campaign/campaign";
import { db, gameStore } from "../../state/context";
import { CampaignScreen } from "./CampaignScreen";

beforeAll(async () => {
  await loadAllPacks();
  gameStore.getState().setLocale("en");
});

const campaign = (over: (c: CampaignState) => CampaignState = (c) => c) => {
  const c = startCampaign(db, {
    campaignId: "night-of-the-zealot",
    difficulty: "standard",
    seed: 1,
    investigators: [{ code: "01001", deckId: "roland-starter" }],
  });
  return over({
    ...c,
    history: [{ scenarioId: "the-gathering", resolution: "R1", xp: 0, victory: 0 }],
  });
};
const html = (c: CampaignState) => {
  gameStore.setState({ campaign: c });
  gameStore.getInitialState = gameStore.getState;
  return renderToStaticMarkup(createElement(CampaignScreen));
};

describe("the campaign screen ends at the story reader's door (campaign-story-reader 4.2)", () => {
  it("before the next scenario it shows the door, not the steps the reader will read", () => {
    const out = html(
      campaign((c) => ({
        ...c,
        flow: {
          ...c.flow,
          // as after a resolution: no scenario is being played
          play: null,
          shown: [{ story: "zzStory" }],
          waiting: {
            id: "zzAsk",
            step: {
              kind: "chooseOne",
              choices: [{ id: "a", text: "Choice A", effects: [], steps: [] }],
            },
          },
        },
      })),
    );
    expect(out).toContain('data-testid="reader-door"');
    expect(out).toContain("Next scenario: The Midnight Masks");
    expect(out).not.toContain("Choice A");
  });

  it("while a resolution is being read it shows what the flow reads, and no door", () => {
    const out = html(
      campaign((c) => ({
        ...c,
        flow: {
          ...c.flow,
          scenario: { id: "the-gathering" } as never,
          waiting: {
            id: "zzAsk",
            step: {
              kind: "chooseOne",
              choices: [{ id: "a", text: "Choice A", effects: [], steps: [] }],
            },
          },
        },
      })),
    );
    expect(out).not.toContain('data-testid="reader-door"');
    expect(out).toContain("Choice A");
  });
});
