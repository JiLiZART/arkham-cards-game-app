/**
 * The bot (`src/engine/bot.ts`) plays each of Return to The Path to Carcosa's 8 scenarios (campaign-return-to-the-path-to-carcosa
 * task 12.2): Roland Banks and Daisy Walker with their starter decks, the campaign's chaos bag, an empty campaign log
 * unless said. The engine must never refuse one of its choices, and each game ends: that is what this test checks, on
 * seeds 1–2 (Return to The Unspeakable Oath and Return to A Phantom of Truth also with Doubt ahead: act 2 v. IV and the
 * Doubt acts).
 *
 * As in the base campaign (`ptcPlaythrough.test.ts`, openspec change `bot-wins-dunwich`) the bot wins none of the
 * eight, so no winning seed is pinned. Searched: Standard 1–60 and Easy 1–40 each, and Doubt ahead Standard 1–40 for
 * the two scenarios that read it; every game ended, none refused:
 * - Return to Curtain Call, Return to The Pallid Mask, Return to The Unspeakable Oath, Return to Dim Carcosa: no
 *   resolution in every game (everyone defeated).
 * - Return to The Last King: Resolution 2 in every game (everyone defeated; the bot never resigns).
 * - Return to Echoes of the Past: Resolution 4 (agenda 3b) in almost every game, the rest no resolution.
 * - Return to A Phantom of Truth: no resolution, a few Resolution 3 (agenda 3b).
 * - Return to Black Stars Rise: no resolution, some Resolution 3 (an agenda's end).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { botChoice } from "../bot";
import { createGame, dispatch, type Result } from "../index";
import { db, deckCodes } from "../kits/testkit";

const CAMPAIGN = "return-to-the-path-to-carcosa";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

function playOut(scenarioId: string, seed: number, campaignLog: Record<string, unknown>): Result {
  let r = createGame(db, {
    campaignId: CAMPAIGN,
    scenarioId,
    difficulty: "standard",
    seed,
    campaignLog,
    chaosBag: [...(db.campaigns[CAMPAIGN].chaosBags.standard ?? [])],
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

const RUNS: [string, Record<string, unknown>][] = [
  ...db.campaigns[CAMPAIGN].scenarios.map((id): [string, Record<string, unknown>] => [id, {}]),
  ["return-to-the-unspeakable-oath", { doubt: 1 }],
  ["return-to-a-phantom-of-truth", { doubt: 1 }],
];

describe("the bot plays each Return to The Path to Carcosa scenario to its end", () => {
  for (const [id, log] of RUNS)
    for (const seed of [1, 2])
      it(`${id}${Object.keys(log).length ? " (Doubt ahead)" : ""} seed ${seed}`, () => {
        const r = playOut(id, seed, log);
        expect(r.state.phase).toBe("ended");
        expect(r.state.resolution).toBeTruthy();
      });
});
