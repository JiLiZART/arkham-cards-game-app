import { describe, expect, it } from "vitest";
import { createGame } from "../../index";
import { inPlay, inject, toTurn } from "../../kits/driver";
import { db, gOf, skipMulligans } from "../../kits/testkit";
import { card } from "../../context";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";
import { applyScenarioEnd, scenarioFacts, scenarioSetup, startCampaign } from "../campaign";
import { deckChangeCost } from "../upgrade";

const ROLAND = "01001";
const AMMO = "01026"; // Extra Ammunition (level 1), exiled for the test
const MACHETE = "01020"; // level 0

const count = (codes: string[]) => {
  const out: Record<string, number> = {};
  for (const c of codes) out[c] = (out[c] ?? 0) + 1;
  return out;
};

describe("Exile", () => {
  it("an exiled card leaves the game and the campaign deck; buying it back costs its level, a level 0 card nothing while the deck is short", () => {
    const c0 = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
    });
    // Extra Ammunition is in the campaign deck, and in play
    const c1 = {
      ...c0,
      investigators: c0.investigators.map((i) => ({
        ...i,
        deck: [...i.deck.filter((x) => x !== MACHETE), AMMO],
      })),
    };
    let ammo = "";
    let r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c1, 1))));
    r = inject(r, (g) => void (ammo = inPlay(g, ROLAND, AMMO)));
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "exile" },
      ctx: { source: ammo, you: ROLAND },
    });
    expect(card(gOf(r), ammo).zone).toBe(ZONE.Removed);
    r = inject(r, () => {}, { t: STEP.Resolution, id: "R1" });
    expect(scenarioFacts(db, r.state).exiled).toEqual({ [ROLAND]: [AMMO] });

    const c = applyScenarioEnd(db, c1, r.state);
    const roland = c.investigators[0];
    expect(roland.deck.filter((x) => x === AMMO)).toHaveLength(0);
    expect(roland.exiled).toEqual([AMMO]);

    const before = count(roland.deck);
    expect(deckChangeCost(db, ROLAND, before, { ...before, [AMMO]: 1 })).toBe(1);
    expect(
      deckChangeCost(db, ROLAND, before, { ...before, [MACHETE]: (before[MACHETE] ?? 0) + 1 }),
    ).toBe(0);
  });
});
