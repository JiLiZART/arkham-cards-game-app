import type { CardDef } from "../content/schema";
import type { CampaignState } from "./campaign";
import { validateDeck } from "./decks";
import type { ContentDb } from "./types";

const level = (c: CardDef) => c.xp ?? 0;
const exceptional = (c: CardDef) => (c.keywords ?? []).includes("exceptional") || /Exceptional/.test(c.text);
const myriad = (c: CardDef) => /Myriad/.test(c.text);

/**
 * What changing a deck costs in experience, by the campaign rules: each new card costs its level (at least 1); replacing
 * a card with a higher level of the same title costs the difference (at least 1); an Exceptional card costs double;
 * Myriad copies come together for one price. Taking cards out, signature cards and weaknesses cost nothing.
 */
export function deckChangeCost(db: ContentDb, investigator: string, before: Record<string, number>, after: Record<string, number>): number {
  const inv = db.investigators[investigator];
  const free = new Set([...(inv?.signatures ?? []), ...(inv?.weaknesses ?? []), ...Object.values(inv?.alternatives ?? {}).flat()]);
  const isFree = (c: CardDef | undefined) => !c || free.has(c.code) || !!c.subtype || !!c.encounterSet;
  const added = new Map<string, CardDef[]>();
  const removed = new Map<string, CardDef[]>();
  const push = (m: Map<string, CardDef[]>, c: CardDef, n: number) => {
    for (let k = 0; k < n; k++) m.set(c.name, [...(m.get(c.name) ?? []), c]);
  };
  for (const code of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const c = db.cards[code];
    if (isFree(c)) continue;
    const diff = (after[code] ?? 0) - (before[code] ?? 0);
    if (diff > 0) push(added, c, diff);
    else if (diff < 0) push(removed, c, -diff);
  }
  let total = 0;
  for (const [title, adds] of added) {
    const olds = [...(removed.get(title) ?? [])].sort((a, b) => level(b) - level(a));
    const news = [...adds].sort((a, b) => level(b) - level(a));
    let paidMyriad = false;
    for (const c of news) {
      const old = olds.shift();
      // a copy of a Myriad card beyond the first rides along with it
      if (!old && myriad(c)) {
        if (paidMyriad) continue;
        paidMyriad = true;
      }
      const base = Math.max(1, level(c) - (old ? level(old) : 0));
      total += exceptional(c) ? base * 2 : base;
    }
  }
  return total;
}

export type UpgradeResult = { ok: true; campaign: CampaignState; cost: number } | { ok: false; reason: { key: string; vars?: Record<string, string | number> } };

const count = (codes: string[]) => {
  const out: Record<string, number> = {};
  for (const c of codes) out[c] = (out[c] ?? 0) + 1;
  return out;
};

/**
 * Spend an investigator's experience on a new version of their deck: the deck must follow the deckbuilding rules and the
 * experience must pay for it. The campaign given is never changed; the result has the new deck and the experience left.
 */
export function upgradeDeck(db: ContentDb, campaign: CampaignState, investigator: string, cards: Record<string, number>): UpgradeResult {
  const who = campaign.investigators.find((i) => i.code === investigator);
  if (!who) throw new Error(`${investigator} is not in this campaign`);
  const problems = validateDeck(db, { id: "upgrade", name: "upgrade", investigator, cards, randomBasicWeakness: false });
  if (problems.length) return { ok: false, reason: problems[0].reason ?? { key: "upgrade.invalid", vars: { message: problems[0].message } } };
  const cost = deckChangeCost(db, investigator, count(who.deck), cards);
  if (cost > who.xp) return { ok: false, reason: { key: "upgrade.cost", vars: { need: cost, have: who.xp } } };
  const deck = Object.entries(cards).flatMap(([code, n]) => Array<string>(n).fill(code));
  return { ok: true, cost, campaign: { ...campaign, investigators: campaign.investigators.map((i) => (i.code === investigator ? { ...i, deck, xp: i.xp - cost } : i)) } };
}
