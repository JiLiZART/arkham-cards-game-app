import type { CardDef } from "../../content/schema";
import type { CampaignState } from "./types";
import { researchedEntry, validateDeck } from "./decks";
import { flatLog } from "./log";
import type { ContentDb } from "../world/types";

const level = (c: CardDef) => c.xp ?? 0;
const exceptional = (c: CardDef) =>
  (c.keywords ?? []).includes("exceptional") || /Exceptional/.test(c.text);
const myriad = (c: CardDef) => /Myriad/.test(c.text);
/** Adaptable: "you may swap up to two level 0 cards out of your deck in exchange for an equal number of level 0 cards" */
const ADAPTABLE = /you may swap up to two level 0 cards out of your deck/;
/** the free level 0 swaps a deck's Adaptable copies allow between two scenarios: 2 each */
export const freeSwapsOf = (db: ContentDb, deck: Record<string, number>): number =>
  Object.entries(deck).reduce(
    (n, [code, k]) => n + (ADAPTABLE.test(db.cards[code]?.text ?? "") ? 2 * k : 0),
    0,
  );

/**
 * What changing a deck costs in experience, by the campaign rules: each new card costs its level (at least 1); replacing
 * a card with a higher level of the same title costs the difference (at least 1); an Exceptional card costs double;
 * Myriad copies come together for one price. Taking cards out, signature cards and weaknesses cost nothing. Up to
 * `freeSwaps` level 0 cards that replace level 0 cards taken out cost nothing (Adaptable; by default all its copies allow).
 */
export function deckChangeCost(
  db: ContentDb,
  investigator: string,
  before: Record<string, number>,
  after: Record<string, number>,
  freeSwaps = freeSwapsOf(db, before),
): number {
  return deckChange(db, investigator, before, after, freeSwaps).cost;
}

function deckChange(
  db: ContentDb,
  investigator: string,
  before: Record<string, number>,
  after: Record<string, number>,
  freeSwaps: number,
): { cost: number; swaps: number } {
  const inv = db.investigators[investigator];
  const free = new Set([
    ...(inv?.signatures ?? []),
    ...(inv?.weaknesses ?? []),
    ...Object.values(inv?.alternatives ?? {}).flat(),
  ]);
  const isFree = (c: CardDef | undefined) =>
    !c || free.has(c.code) || !!c.subtype || !!c.encounterSet;
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
  // a deck short of its size (cards exiled) takes level 0 cards for free until it is full again (Grimoire, Exile)
  let short = Math.max(
    0,
    (inv?.deckSize ?? 0) -
      Object.entries(before).reduce((n, [code, k]) => n + (isFree(db.cards[code]) ? 0 : k), 0),
  );
  let total = 0;
  // what a level 0 card that replaces no card of its title costs: an Adaptable swap may make it free
  const swappable: number[] = [];
  for (const [title, adds] of added) {
    const olds = (removed.get(title) ?? []).sort((a, b) => level(b) - level(a));
    const news = [...adds].sort((a, b) => level(b) - level(a));
    let paidMyriad = false;
    for (const c of news) {
      const old = olds.shift();
      // a copy of a Myriad card beyond the first rides along with it
      if (!old && myriad(c)) {
        if (paidMyriad) continue;
        paidMyriad = true;
      }
      if (!old && level(c) === 0 && short > 0) {
        short--;
        continue;
      }
      const base = Math.max(1, level(c) - (old ? level(old) : 0));
      const price = exceptional(c) ? base * 2 : base;
      total += price;
      if (!old && level(c) === 0) swappable.push(price);
    }
  }
  // the level 0 cards taken out that no card of their title replaced, each of which a swap may trade for a new one
  const out = [...removed.values()].flat().filter((c) => level(c) === 0).length;
  const swaps = Math.min(freeSwaps, out, swappable.length);
  const saved = swappable
    .sort((a, b) => b - a)
    .slice(0, swaps)
    .reduce((n, x) => n + x, 0);
  return { cost: total - saved, swaps };
}

export type UpgradeResult =
  | { ok: true; campaign: CampaignState; cost: number }
  | { ok: false; reason: { key: string; vars?: Record<string, string | number> } };

const count = (codes: string[]) => {
  const out: Record<string, number> = {};
  for (const c of codes) out[c] = (out[c] ?? 0) + 1;
  return out;
};

/**
 * Spend an investigator's experience on a new version of their deck: the deck must follow the deckbuilding rules and the
 * experience must pay for it. The campaign given is never changed; the result has the new deck and the experience left.
 */
export function upgradeDeck(
  db: ContentDb,
  campaign: CampaignState,
  investigator: string,
  cards: Record<string, number>,
): UpgradeResult {
  const who = campaign.investigators.find((i) => i.code === investigator);
  if (!who) throw new Error(`${investigator} is not in this campaign`);
  const problems = validateDeck(
    db,
    { id: "upgrade", name: "upgrade", investigator, cards, randomBasicWeakness: false },
    flatLog(campaign.log),
  ).filter(
    // a deck short because cards were exiled may stay short (Grimoire, Exile)
    (p) =>
      !(
        p.reason?.key === "deck.size" &&
        who.exiled?.length &&
        Number(p.reason.vars?.n) < Number(p.reason.vars?.size)
      ),
  );
  if (problems.length)
    return {
      ok: false,
      reason: problems[0].reason ?? {
        key: "upgrade.invalid",
        vars: { message: problems[0].message },
      },
    };
  // a Researched card enters only in place of its lower-level version
  const before = count(who.deck);
  for (const [code, n] of Object.entries(cards)) {
    const c = db.cards[code];
    if (!researchedEntry(c) || n <= (before[code] ?? 0)) continue;
    const replaced = Object.keys(before).some(
      (o) =>
        o !== code &&
        db.cards[o]?.name === c.name &&
        (db.cards[o]?.xp ?? 0) < (c.xp ?? 0) &&
        (cards[o] ?? 0) < before[o],
    );
    if (!replaced)
      return { ok: false, reason: { key: "upgrade.researched", vars: { card: code } } };
  }
  // Adaptable's swaps are counted between two scenarios, however many upgrades are made there
  const after = campaign.history.length;
  const used = who.swapsUsed?.after === after ? who.swapsUsed.n : 0;
  const { cost, swaps } = deckChange(
    db,
    investigator,
    before,
    cards,
    Math.max(0, freeSwapsOf(db, before) - used),
  );
  if (cost > who.xp)
    return { ok: false, reason: { key: "upgrade.cost", vars: { need: cost, have: who.xp } } };
  const deck = Object.entries(cards).flatMap(([code, n]) => Array<string>(n).fill(code));
  return {
    ok: true,
    cost,
    campaign: {
      ...campaign,
      investigators: campaign.investigators.map((i) =>
        i.code === investigator
          ? {
              ...i,
              deck,
              xp: i.xp - cost,
              ...(swaps ? { swapsUsed: { after, n: used + swaps } } : {}),
            }
          : i,
      ),
    },
  };
}
