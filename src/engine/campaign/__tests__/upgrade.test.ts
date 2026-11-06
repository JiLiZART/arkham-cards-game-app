import { beforeAll, describe, expect, it } from "vitest";
import { loadContentFromDisk } from "../../../content/node";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign";
import { deckChangeCost, upgradeDeck } from "../upgrade";
import { createGame } from "../../index";
import { mutate } from "../../kits/testkit";
import { PHASE } from "../../world/constants";
import type { ContentDb } from "../../world/types";

let all: ContentDb;
beforeAll(async () => {
  all = (await loadContentFromDisk()).db;
});
const roland = () => ({ ...all.decks["roland-starter"].cards });
const withCards = (base: Record<string, number>, change: Record<string, number>) => {
  const out = { ...base };
  for (const [c, n] of Object.entries(change)) {
    out[c] = (out[c] ?? 0) + n;
    if (out[c] <= 0) delete out[c];
  }
  return out;
};
const cost = (after: Record<string, number>, before = roland()) =>
  deckChangeCost(all, "01001", before, after);
const byName = (name: string, xp: number) =>
  Object.values(all.cards).find((c) => c.name === name && (c.xp ?? 0) === xp && !c.encounterSet)!;

describe("what a change to a deck costs in experience", () => {
  it("nothing for the same deck, and nothing for taking cards out", () => {
    expect(cost(roland())).toBe(0);
    expect(cost(withCards(roland(), { "01087": -2 }))).toBe(0);
  });

  it("a level 0 card swapped in costs 1 each", () => {
    const fresh = Object.values(all.cards).find(
      (c) =>
        c.faction === "guardian" &&
        c.type === "asset" &&
        (c.xp ?? 0) === 0 &&
        !roland()[c.code] &&
        !c.subtype &&
        !c.encounterSet &&
        (c.deckLimit ?? 2) >= 2 &&
        !Object.keys(roland()).some((k) => all.cards[k].name === c.name),
    )!;
    expect(cost(withCards(roland(), { [fresh.code]: 1, "01087": -1 }))).toBe(1);
    expect(cost(withCards(roland(), { [fresh.code]: 2, "01087": -2 }))).toBe(2);
  });

  it("a new card costs its level", () => {
    const l3 = Object.values(all.cards).find(
      (c) =>
        c.faction === "guardian" &&
        c.type === "asset" &&
        c.xp === 3 &&
        !c.traits.includes("Weapon") &&
        (c.keywords ?? []).indexOf("exceptional") < 0 &&
        !/Exceptional/.test(c.text) &&
        (c.deckLimit ?? 2) >= 1 &&
        !c.encounterSet,
    )!;
    expect(cost(withCards(roland(), { [l3.code]: 1, "01087": -1 }))).toBe(3);
  });

  it("replacing a card with a higher level of the same title costs the difference: .45 Automatic to level 2 is 2", () => {
    const l2 = byName(".45 Automatic", 2);
    expect(cost(withCards(roland(), { "01016": -1, [l2.code]: 1 }))).toBe(2);
  });

  it("an Exceptional card costs double", () => {
    const ex = Object.values(all.cards).find(
      (c) =>
        (c.xp ?? 0) >= 1 &&
        /Exceptional/.test(c.text) &&
        c.type === "asset" &&
        !c.encounterSet &&
        !c.subtype,
    )!;
    expect(ex).toBeDefined();
    expect(cost(withCards(roland(), { [ex.code]: 1, "01087": -1 }))).toBe(2 * ex.xp!);
  });

  it("Myriad copies come together for the price of one", () => {
    const myriad = Object.values(all.cards).find(
      (c) =>
        c.faction === "guardian" &&
        (c.deckLimit ?? 2) === 3 &&
        (c.xp ?? 0) === 0 &&
        /Myriad/.test(c.text) &&
        !c.encounterSet,
    )!;
    expect(myriad).toBeDefined();
    expect(cost(withCards(roland(), { [myriad.code]: 3, "01087": -2, "01017": -1 }))).toBe(1);
  });

  it("signature cards and weaknesses never cost", () => {
    const weak = Object.values(all.cards).find(
      (c) => c.subtype === "weakness" && c.type === "treachery",
    )!;
    expect(cost(withCards(roland(), { [weak.code]: 1 }))).toBe(0);
    expect(cost(withCards(roland(), { "01006": -1 }))).toBe(0);
  });
});

describe("spending experience on a campaign's deck", () => {
  const campaign = (xp: number) => {
    const c = startCampaign(all, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: "01001", deckId: "roland-starter" }],
    });
    c.investigators[0].xp = xp;
    return c;
  };
  const upgraded = () => {
    const l2 = byName(".45 Automatic", 2);
    const deck = withCards(roland(), { "01016": -1, [l2.code]: 1 });
    return { l2, deck };
  };

  it("an affordable upgrade spends the experience and replaces the card in the deck", () => {
    const { l2, deck } = upgraded();
    const r = upgradeDeck(all, campaign(5), "01001", deck);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cost).toBe(2);
    expect(r.campaign.investigators[0].xp).toBe(3);
    expect(r.campaign.investigators[0].deck).toContain(l2.code);
    expect(r.campaign.investigators[0].deck).not.toContain("01016");
  });

  it("accepts an upgrade after The Gathering's R1: Lita Chantler, a story asset, doesn't count toward deck size", () => {
    const c = campaign(5);
    const ended = mutate(createGame(all, scenarioSetup(all, c, 1)), (game) => {
      game.s.phase = PHASE.Ended;
      game.s.resolution = "R1";
      game.s.pending = null;
    }).state;
    const after = applyScenarioEnd(all, c, ended);
    const deck: Record<string, number> = {};
    for (const code of after.investigators[0].deck) deck[code] = (deck[code] ?? 0) + 1;
    expect(deck["01117"]).toBe(1);
    after.investigators[0].xp = 5;
    const l2 = byName(".45 Automatic", 2);
    expect(
      upgradeDeck(all, after, "01001", withCards(deck, { "01016": -1, [l2.code]: 1 })),
    ).toMatchObject({ ok: true, cost: 2 });
  });

  it("refuses what the experience can't pay, naming what is needed", () => {
    const { deck } = upgraded();
    const r = upgradeDeck(all, campaign(1), "01001", deck);
    expect(r).toEqual({ ok: false, reason: { key: "upgrade.cost", vars: { need: 2, have: 1 } } });
  });

  it("refuses a deck that breaks the rules, and the campaign is not changed", () => {
    const c = campaign(9);
    const before = structuredClone(c);
    const r = upgradeDeck(all, c, "01001", withCards(roland(), { "01016": 1 }));
    expect(r.ok).toBe(false);
    expect(c).toEqual(before);
  });

  it("keeps the weakness the campaign drew when the deck is the campaign's own", () => {
    const c = campaign(5);
    const own: Record<string, number> = {};
    for (const code of c.investigators[0].deck) own[code] = (own[code] ?? 0) + 1;
    const r = upgradeDeck(all, c, "01001", own);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cost).toBe(0);
  });
});

describe("Adaptable: two free level 0 swaps between scenarios", () => {
  const ADAPTABLE = "02110";
  const skids = () => {
    const c = startCampaign(all, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: "01003", deckId: "skids-starter" }],
    });
    c.investigators[0].deck.push(ADAPTABLE);
    return c;
  };
  const own = (deck: string[]) => {
    const out: Record<string, number> = {};
    for (const code of deck) out[code] = (out[code] ?? 0) + 1;
    return out;
  };
  /** n level 0 cards of the deck out, n new level 0 rogue cards of other titles in */
  const swap = (deck: Record<string, number>, n: number) => {
    const inv = all.investigators["01003"];
    const outs = Object.keys(deck)
      .filter((code) => {
        const c = all.cards[code];
        return (c.xp ?? 0) === 0 && !c.subtype && !inv.signatures.includes(code);
      })
      .slice(0, n);
    const titles = new Set(Object.keys(deck).map((code) => all.cards[code].name));
    const ins = Object.values(all.cards)
      .filter(
        (c) =>
          c.faction === "rogue" &&
          c.type === "event" &&
          (c.xp ?? 0) === 0 &&
          !c.subtype &&
          !c.encounterSet &&
          !c.factions &&
          !/Exceptional|Myriad|Limit|Permanent/.test(c.text) &&
          !titles.has(c.name),
      )
      .slice(0, n);
    return withCards(deck, {
      ...Object.fromEntries(outs.map((code) => [code, -1])),
      ...Object.fromEntries(ins.map((c) => [c.code, 1])),
    });
  };

  it("costs nothing for up to two level 0 cards swapped for level 0 cards, 1 for a third", () => {
    const before = own(skids().investigators[0].deck);
    expect(deckChangeCost(all, "01003", before, swap(before, 2))).toBe(0);
    expect(deckChangeCost(all, "01003", before, swap(before, 3))).toBe(1);
    const without = withCards(before, { [ADAPTABLE]: -1 });
    expect(deckChangeCost(all, "01003", without, swap(without, 2))).toBe(2);
  });

  it("counts the swaps between two scenarios across upgrades; the next scenario gives two more", () => {
    let c = skids();
    const first = upgradeDeck(all, c, "01003", swap(own(c.investigators[0].deck), 2));
    expect(first).toMatchObject({ ok: true, cost: 0 });
    if (!first.ok) return;
    c = first.campaign;
    expect(c.investigators[0].swapsUsed).toEqual({ after: 0, n: 2 });
    // a third swap before the next scenario costs experience Skids doesn't have
    expect(upgradeDeck(all, c, "01003", swap(own(c.investigators[0].deck), 1))).toMatchObject({
      ok: false,
      reason: { key: "upgrade.cost" },
    });
    const later = {
      ...c,
      history: [{ scenarioId: "the-gathering", resolution: "R1", xp: 0, victory: 0 }],
    };
    expect(upgradeDeck(all, later, "01003", swap(own(c.investigators[0].deck), 1))).toMatchObject({
      ok: true,
      cost: 0,
    });
  });
});
