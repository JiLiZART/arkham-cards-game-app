/**
 * The bot (`src/engine/bot.ts`) plays each of Return to The Dunwich Legacy's 8 scenarios (campaign-return-to-the-dunwich-legacy
 * task 12.2): Roland Banks and Daisy Walker with their starter decks, the campaign's chaos bag. On the first seeds of
 * every scenario it plays to an end, and the engine must never refuse one of its choices. On the seeds below it reaches
 * the printed resolution named. Same seed, same game: the seeds were found by playing seeds 1 to 250 with this bot (the
 * scenarios not won on Standard: to 700, then 1 to 250 on Easy).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { botChoice } from "../bot";
import { createGame, dispatch, type Result } from "../index";
import { db, deckCodes } from "../kits/testkit";
import type { Difficulty } from "../../content/schema";

const CAMPAIGN = "return-to-the-dunwich-legacy";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

function playOut(scenarioId: string, seed: number, difficulty: Difficulty = "standard"): Result {
  let r = createGame(db, {
    campaignId: CAMPAIGN,
    scenarioId,
    difficulty,
    seed,
    campaignLog: {},
    chaosBag: [...(db.campaigns[CAMPAIGN].chaosBags[difficulty] ?? [])],
    investigators: [
      { code: "01001", deck: deckCodes("roland-starter") },
      { code: "01002", deck: deckCodes("daisy-starter") },
    ],
  });
  for (let k = 0; r.state.pending && k < 6000; k++) {
    const p = r.state.pending;
    const res = dispatch(db, r.state, { type: "choose", inv: p.inv, option: botChoice(db, r) });
    if (res.error) throw new Error(`${scenarioId} seed ${seed}: ${res.error}`);
    r = res;
  }
  return r;
}

/**
 * A seed on which the bot reaches a resolution by the acts' objectives. Return to The Miskatonic Museum was won only on
 * Easy. Not listed: Return to The Essex County Express and Return to Lost in Time and Space (no win in seeds 1–700
 * Standard or 1–250 Easy), Return to Undimensioned and Unseen and Return to Where Doom Awaits (as
 * in the base campaign, openspec change `bot-wins-dunwich`; Easy seed 189 of Where Doom Awaits ends in R2, by the agenda).
 */
const WINS: { scenario: string; seed: number; difficulty?: Difficulty; resolution: string }[] = [
  { scenario: "return-to-extracurricular-activity", seed: 12, resolution: "R2" },
  { scenario: "return-to-the-house-always-wins", seed: 248, resolution: "R1" },
  { scenario: "return-to-the-miskatonic-museum", seed: 75, difficulty: "easy", resolution: "R1" },
  { scenario: "return-to-blood-on-the-altar", seed: 186, resolution: "R3" },
];

describe("the bot plays each Return to Dunwich scenario to its end", () => {
  for (const id of db.campaigns[CAMPAIGN].scenarios)
    for (const seed of [1, 2])
      it(`${id} seed ${seed}`, () => {
        const r = playOut(id, seed);
        expect(r.state.phase).toBe("ended");
        expect(r.state.resolution).toBeTruthy();
      });
});

describe("the bot reaches a resolution in each Return to Dunwich scenario", () => {
  for (const { scenario, seed, difficulty, resolution } of WINS)
    it(`${scenario} seed ${seed}${difficulty ? ` (${difficulty})` : ""}: ${resolution}`, () => {
      const r = playOut(scenario, seed, difficulty);
      expect(r.state.phase).toBe("ended");
      expect(r.state.resolution).toBe(resolution);
    });
});
