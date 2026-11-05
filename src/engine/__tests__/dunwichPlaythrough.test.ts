/**
 * A bot plays each of The Dunwich Legacy's 8 scenarios to its end (campaign-the-dunwich-legacy task 11.3): random legal
 * choices, leaning toward investigating, fighting and spending clues, from the campaign's own standard bag. The engine
 * must never answer a choice with an error, and every game must end. This bot loses (no resolution); the scripted
 * scenario tests play each resolution.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { createGame, dispatch, type Result } from "../index";
import { db, deckCodes } from "../kits/testkit";
import { next } from "../world/rng";

const CAMPAIGN = "the-dunwich-legacy";

beforeAll(async () => {
  await loadPack("dwl");
});

/** what moves a scenario on: clues found and spent, the act advanced, enemies fought, not resigning */
const GOAL = /investigate|advance|clue|fight/i;

function playOut(scenarioId: string, seed: number): Result {
  let r = createGame(db, {
    campaignId: CAMPAIGN,
    scenarioId,
    difficulty: "standard",
    seed,
    campaignLog: {},
    chaosBag: [...db.campaigns[CAMPAIGN].chaosBags.standard!],
    investigators: [
      { code: "01001", deck: deckCodes("roland-starter") },
      { code: "01002", deck: deckCodes("daisy-starter") },
    ],
  });
  const rng = { rng: seed * 7919 };
  for (let k = 0; r.state.pending && k < 40000; k++) {
    const p = r.state.pending;
    const goal = p.options.filter((o) => GOAL.test(o.label));
    const end = p.options.find((o) => o.label === "End turn");
    const roll = next(rng);
    const o =
      goal.length && roll < 0.7
        ? goal[Math.floor(next(rng) * goal.length)]
        : end && roll < 0.85
          ? end
          : p.options[Math.floor(next(rng) * p.options.length)];
    const res = dispatch(db, r.state, { type: "choose", inv: p.inv, option: o.id });
    if (res.error) throw new Error(`${scenarioId} seed ${seed}: ${res.error}`);
    r = res;
  }
  return r;
}

describe("a bot plays each Dunwich scenario to its end", () => {
  for (const id of db.campaigns[CAMPAIGN].scenarios)
    for (const seed of [1, 2, 3])
      it(`${id} seed ${seed}`, () => {
        const r = playOut(id, seed);
        expect(r.state.phase).toBe("ended");
        expect(r.state.resolution).toBeTruthy();
      });
});
