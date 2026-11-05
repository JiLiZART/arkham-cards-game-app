/**
 * The bot (`src/engine/bot.ts`) plays each of The Dunwich Legacy's 8 scenarios (campaign-the-dunwich-legacy task
 * 11.3): Roland Banks and Daisy Walker with their starter decks, the campaign's chaos bag. It plays toward the act
 * objectives the cards print; on the seeds below it reaches the printed resolution named, and on the first seeds of
 * every scenario it plays to an end. The engine must never refuse one of its choices. Same seed, same game: the seeds
 * were found by playing seeds 1 to 250 (Essex County Express, Blood on the Altar and Lost in Time and Space: to 700)
 * with this bot.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { botChoice } from "../bot";
import { createGame, dispatch, type Result } from "../index";
import { db, deckCodes } from "../kits/testkit";
import type { Difficulty } from "../../content/schema";

const CAMPAIGN = "the-dunwich-legacy";

beforeAll(async () => {
  await loadPack("dwl");
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
 * A seed on which the bot reaches a resolution by the acts' objectives. Blood on the Altar was won only on Easy. Not
 * listed: Undimensioned and Unseen (act 2 asks every Brood of Yog-Sothoth defeated, by Esoteric Formula alone) and
 * Where Doom Awaits (Sentinel Peak, then clues spent there, with Seth Bishop): no seed of 1–250 won them, Easy either.
 */
const WINS: { scenario: string; seed: number; difficulty?: Difficulty; resolution: string }[] = [
  { scenario: "extracurricular-activity", seed: 48, resolution: "R2" },
  { scenario: "the-house-always-wins", seed: 172, resolution: "R1" },
  { scenario: "the-miskatonic-museum", seed: 114, resolution: "R1" },
  { scenario: "essex-county-express", seed: 367, resolution: "R1" },
  { scenario: "blood-on-the-altar", seed: 164, difficulty: "easy", resolution: "R1" },
  { scenario: "lost-in-time-and-space", seed: 389, resolution: "R1" },
];

describe("the bot plays each Dunwich scenario to its end", () => {
  for (const id of db.campaigns[CAMPAIGN].scenarios)
    for (const seed of [1, 2])
      it(`${id} seed ${seed}`, () => {
        const r = playOut(id, seed);
        expect(r.state.phase).toBe("ended");
        expect(r.state.resolution).toBeTruthy();
      });
});

describe("the bot reaches a resolution in each Dunwich scenario", () => {
  for (const { scenario, seed, difficulty, resolution } of WINS)
    it(`${scenario} seed ${seed}${difficulty ? ` (${difficulty})` : ""}: ${resolution}`, () => {
      const r = playOut(scenario, seed, difficulty);
      expect(r.state.phase).toBe("ended");
      expect(r.state.resolution).toBe(resolution);
    });
});
