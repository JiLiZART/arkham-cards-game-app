import type { CardDef, DeckDef } from "../content/schema";
import type { ContentDb } from "./types";

export interface DeckProblem {
  code?: string;
  message: string;
}

/** all codes in a deck list, quantities expanded */
export function expandDeck(d: DeckDef): string[] {
  return Object.entries(d.cards).flatMap(([code, n]) => Array(n).fill(code));
}

const isWeakness = (c: CardDef) => !!c.subtype;

/** validate a deck against its investigator's deckbuilding rules */
export function validateDeck(db: ContentDb, d: DeckDef): DeckProblem[] {
  const problems: DeckProblem[] = [];
  const inv = db.investigators[d.investigator];
  if (!inv) return [{ code: d.investigator, message: `unknown investigator ${d.investigator}` }];
  const required = new Set([...inv.signatures, ...inv.weaknesses]);
  let size = 0;
  let basicWeaknesses = 0;
  for (const [code, n] of Object.entries(d.cards)) {
    const c = db.cards[code];
    if (!c) {
      problems.push({ code, message: `unknown card ${code}` });
      continue;
    }
    if (c.type === "investigator" || c.faction === "mythos") {
      problems.push({ code, message: `${c.name} cannot be included in a deck` });
      continue;
    }
    const limit = c.deckLimit ?? 2;
    if (n > limit) problems.push({ code, message: `too many copies of ${c.name} (${n}, limit ${limit})` });
    if (c.subtype === "basicweakness") basicWeaknesses += n;
    if (required.has(code) || isWeakness(c)) continue;
    // "<Investigator> deck only" cards are signatures of someone else
    const foreignSignature = Object.values(db.investigators).some((i) => i.code !== inv.code && i.signatures.includes(code));
    if (foreignSignature) {
      problems.push({ code, message: `${c.name} belongs to another investigator's deck` });
      continue;
    }
    const level = c.xp ?? 0;
    const allowed = inv.deckOptions.some((o) => (!o.faction || o.faction.includes(c.faction)) && (!o.level || (level >= o.level.min && level <= o.level.max)));
    if (!allowed) problems.push({ code, message: `${c.name} (${c.faction} ${level}) is not allowed for ${db.cards[inv.code].name}` });
    size += n;
  }
  for (const code of required) if (!d.cards[code]) problems.push({ code, message: `missing required card ${db.cards[code]?.name ?? code}` });
  if (size !== inv.deckSize) problems.push({ message: `deck has ${size} cards, needs ${inv.deckSize} (not counting signatures and weaknesses)` });
  if (basicWeaknesses === 0 && !d.randomBasicWeakness) problems.push({ message: "deck needs a basic weakness (or randomBasicWeakness: true)" });
  return problems;
}

/** convert an ArkhamDB deck export ({investigator_code, slots, name}) into our deck format */
export function fromArkhamDb(json: { name?: string; investigator_code: string; slots: Record<string, number>; id?: number | string }): DeckDef {
  const cards: Record<string, number> = {};
  let random = false;
  for (const [code, n] of Object.entries(json.slots)) {
    if (code === "01000") random = true; // ArkhamDB's "random basic weakness" placeholder
    else cards[code] = n;
  }
  return {
    id: `arkhamdb-${json.id ?? json.investigator_code}`,
    name: json.name ?? "Imported deck",
    investigator: json.investigator_code,
    cards,
    randomBasicWeakness: random,
  };
}
