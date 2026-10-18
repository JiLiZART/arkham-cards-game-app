import { beforeAll, describe, expect, it } from "vitest";
import { loadContentFromDisk } from "../content/node";
import { startCampaign } from "./campaign";
import { deckChangeCost, upgradeDeck } from "./upgrade";
import type { ContentDb } from "./types";

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
const cost = (after: Record<string, number>, before = roland()) => deckChangeCost(all, "01001", before, after);
const byName = (name: string, xp: number) => Object.values(all.cards).find((c) => c.name === name && (c.xp ?? 0) === xp && !c.encounterSet)!;

describe("what a change to a deck costs in experience", () => {
  it("nothing for the same deck, and nothing for taking cards out", () => {
    expect(cost(roland())).toBe(0);
    expect(cost(withCards(roland(), { "01087": -2 }))).toBe(0);
  });

  it("a level 0 card swapped in costs 1 each", () => {
    const fresh = Object.values(all.cards).find((c) => c.faction === "guardian" && c.type === "asset" && (c.xp ?? 0) === 0 && !roland()[c.code] && !c.subtype && !c.encounterSet && (c.deckLimit ?? 2) >= 2 && !Object.keys(roland()).some((k) => all.cards[k].name === c.name))!;
    expect(cost(withCards(roland(), { [fresh.code]: 1, "01087": -1 }))).toBe(1);
    expect(cost(withCards(roland(), { [fresh.code]: 2, "01087": -2 }))).toBe(2);
  });

  it("a new card costs its level", () => {
    const l3 = Object.values(all.cards).find((c) => c.faction === "guardian" && c.type === "asset" && c.xp === 3 && !c.traits.includes("Weapon") && (c.keywords ?? []).indexOf("exceptional") < 0 && !/Exceptional/.test(c.text) && (c.deckLimit ?? 2) >= 1 && !c.encounterSet)!;
    expect(cost(withCards(roland(), { [l3.code]: 1, "01087": -1 }))).toBe(3);
  });

  it("replacing a card with a higher level of the same title costs the difference: .45 Automatic to level 2 is 2", () => {
    const l2 = byName(".45 Automatic", 2);
    expect(cost(withCards(roland(), { "01016": -1, [l2.code]: 1 }))).toBe(2);
  });

  it("an Exceptional card costs double", () => {
    const ex = Object.values(all.cards).find((c) => (c.xp ?? 0) >= 1 && /Exceptional/.test(c.text) && c.type === "asset" && !c.encounterSet && !c.subtype)!;
    expect(ex).toBeDefined();
    expect(cost(withCards(roland(), { [ex.code]: 1, "01087": -1 }))).toBe(2 * ex.xp!);
  });

  it("Myriad copies come together for the price of one", () => {
    const myriad = Object.values(all.cards).find((c) => c.faction === "guardian" && (c.deckLimit ?? 2) === 3 && (c.xp ?? 0) === 0 && /Myriad/.test(c.text) && !c.encounterSet)!;
    expect(myriad).toBeDefined();
    expect(cost(withCards(roland(), { [myriad.code]: 3, "01087": -2, "01017": -1 }))).toBe(1);
  });

  it("signature cards and weaknesses never cost", () => {
    const weak = Object.values(all.cards).find((c) => c.subtype === "weakness" && c.type === "treachery")!;
    expect(cost(withCards(roland(), { [weak.code]: 1 }))).toBe(0);
    expect(cost(withCards(roland(), { "01006": -1 }, ))).toBe(0);
  });
});

describe("spending experience on a campaign's deck", () => {
  const campaign = (xp: number) => {
    const c = startCampaign(all, { campaignId: "night-of-the-zealot", difficulty: "standard", seed: 1, investigators: [{ code: "01001", deckId: "roland-starter" }] });
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
