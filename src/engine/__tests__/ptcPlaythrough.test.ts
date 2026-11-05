/**
 * The bot (`src/engine/bot.ts`) plays The Path to Carcosa's scenarios (campaign-the-path-to-carcosa tasks 2.6–9.6):
 * Roland Banks and Daisy Walker with their starter decks, the campaign's chaos bag, an empty campaign log unless said.
 * The engine must never refuse one of its choices, and each game ends: that is what this test checks, on seeds 1–3.
 *
 * The bot wins none of the eight. The seeds searched (for the bot work, openspec/changes/bot-wins-dunwich), and why
 * it loses:
 * - Curtain Call: Standard 1–150, Easy 1–120. On act 3 the Lobby is the act's named place; the bot spends its turns on
 *   the Lobby's draw and never fights The Man in the Pallid Mask there to open its resign.
 * - The Last King: Standard 1–40. No objective the bot reads ("get out of this awful place"): it never resigns, and
 *   every game ends with everyone defeated, Resolution 2.
 * - Echoes of the Past: Standard 1–40. The doom on the Cultists ends it with agenda 3b, Resolution 4, by round 5–7; a
 *   few with everyone defeated.
 * - The Unspeakable Oath: Standard 1–40. Agenda 3b defeats everyone before act 4 opens the Garden's resign (no
 *   resolution).
 * - A Phantom of Truth: Standard 1–40, with Doubt ahead and with Conviction ahead. The Byakhee and The Organist defeat
 *   both investigators by round 4–11, before agenda 3b.
 * - The Pallid Mask: Standard 1–40. The bot doesn't seek the Tomb of Shadows among the bottom five Catacombs; Specter
 *   of Death (agenda 1b) or agenda 2b defeats everyone (no resolution).
 * - Black Stars Rise: Standard and Easy 1–40. The bot spends its clues on the agendas' group ability and never pays the
 *   Abbey Church's 3 clues per investigator, so the Chapel and the Abbey Tower never enter play (an act 3 opened in 15
 *   of the 40 games, unreachable); most games end with both investigators defeated by round 4–9 (no resolution, which
 *   is Resolution 3), a few with agenda 3a or 3c's Resolution 3.
 * - Dim Carcosa: Standard and Easy 1–40, act 2 v.I, v.II and v.III. Horror no longer defeats; every game ends with both
 *   investigators defeated by damage by round 4–16 (no resolution: Resolution 4 or 5).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { botChoice } from "../bot";
import { createGame, dispatch, type Result } from "../index";
import { db, deckCodes } from "../kits/testkit";

const CAMPAIGN = "the-path-to-carcosa";

beforeAll(async () => {
  await loadPack("ptc");
});

function playOut(scenarioId: string, seed: number): Result {
  let r = createGame(db, {
    campaignId: CAMPAIGN,
    scenarioId,
    difficulty: "standard",
    seed,
    campaignLog: {},
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

describe("the bot plays The Path to Carcosa's scenarios to their end", () => {
  for (const id of [
    "curtain-call",
    "the-last-king",
    "echoes-of-the-past",
    "the-unspeakable-oath",
    "a-phantom-of-truth",
    "the-pallid-mask",
    "black-stars-rise",
    "dim-carcosa",
  ])
    for (const seed of [1, 2, 3])
      it(`${id} seed ${seed}`, () => {
        const r = playOut(id, seed);
        expect(r.state.phase).toBe("ended");
        expect(r.state.resolution).toBeTruthy();
      });
});
