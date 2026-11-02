import { describe, expect, it } from "vitest";
import { db, setup } from "../../kits/testkit";
import { recordCampaign, recordGame, replayRecording } from "../record";

describe("recording a game", () => {
  it("the bot plays a scenario to its end; replaying the choices gives the same state and events", () => {
    const rec = recordGame(db, {
      id: "gathering-roland",
      packs: [],
      setup: setup("the-gathering", ["01001"], 7),
      player: "bot",
      maxChoices: 3000,
    });
    expect(rec.snapshot.scenario.phase).toBe("ended");
    expect(rec.actions.length).toBeGreaterThan(20);
    const again = replayRecording(db, rec);
    expect(again.kind).toBe("game");
    expect(again.games[0].snapshot).toEqual(rec.snapshot);
    expect(again.games[0].events).toEqual(rec.events);
  });

  it("a recorded choice the engine now refuses stops the replay and is reported, not thrown", () => {
    const rec = recordGame(db, {
      id: "gathering-roland",
      packs: [],
      setup: setup("the-gathering", ["01001"], 7),
      player: "bot",
      maxChoices: 3000,
    });
    const broken = {
      ...rec,
      actions: [...rec.actions.slice(0, 3), { ...rec.actions[3], option: "nope" }],
    };
    const again = replayRecording(db, broken);
    expect(again.error).toMatch(/^choice 3 \(nope\): illegal option/);
    expect(again.games).toHaveLength(1);
  });

  it("the random player is seeded: the same recipe makes the same choices, and stops at its cap", () => {
    const recipe = {
      id: "masks-random",
      packs: [],
      setup: setup("the-midnight-masks", ["01002", "01005"], 3),
      player: "random" as const,
      maxChoices: 150,
    };
    const a = recordGame(db, recipe);
    expect(a.actions.length).toBeLessThanOrEqual(150);
    expect(recordGame(db, recipe).actions).toEqual(a.actions);
  });
});

describe("recording a campaign", () => {
  it("plays Night of the Zealot from its prologue past its last scenario; the replay reaches the same campaign and games", () => {
    const rec = recordCampaign(db, {
      id: "zealot-roland",
      packs: [],
      start: {
        campaignId: "night-of-the-zealot",
        difficulty: "easy",
        seed: 11,
        investigators: [{ code: "01001", deckId: "roland-starter" }],
      },
      maxChoices: 3000,
    });
    expect(rec.campaign.flow.play).toBeNull();
    expect(rec.campaign.flow.waiting).toBeNull();
    expect(rec.campaign.history.map((h) => h.scenarioId)).toEqual([
      "the-gathering",
      "the-midnight-masks",
      "the-devourer-below",
    ]);
    const again = replayRecording(db, rec);
    expect(again.campaign).toEqual(rec.campaign);
    expect(again.games.map((g) => g.snapshot)).toEqual(rec.games.map((g) => g.snapshot));
  });
});
