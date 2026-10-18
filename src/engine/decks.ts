import type { CardDef, DeckDef, DeckOption, InvestigatorDef } from "../content/schema";
import type { ContentDb } from "./types";

/** what is wrong, as a string key with its values, so the UI can say it in the player's language */
export interface DeckReason {
  key:
    | "deck.unknown" | "deck.cannot" | "deck.copies" | "deck.foreign" | "deck.notAllowed" | "deck.excluded" | "deck.optionLimit" | "deck.atLeast"
    | "deck.missing" | "deck.size" | "deck.noWeakness" | "deck.investigator"
    | "deck.choice.class" | "deck.choice.option" | "deck.choice.size" | "deck.choice.role";
  vars?: Record<string, string | number>;
}

export interface DeckProblem {
  code?: string;
  message: string;
  reason?: DeckReason;
}

/** all codes in a deck list, quantities expanded */
export function expandDeck(d: DeckDef): string[] {
  return Object.entries(d.cards).flatMap(([code, n]) => Array(n).fill(code));
}

const isWeakness = (c: CardDef) => !!c.subtype;

/**
 * Why an investigator's deck can't be built here: it needs a choice made when the deck is created (a class, an option, a
 * deck size) or a pick among role cards. Undefined when the options are all ones the validator reads.
 */
export function needsChoice(inv: InvestigatorDef): DeckReason | undefined {
  const vars = { inv: inv.code };
  for (const o of inv.deckOptions) {
    if (o.faction_select) return { key: "deck.choice.class", vars };
    if (o.option_select) return { key: "deck.choice.option", vars };
    if (o.deck_size_select) return { key: "deck.choice.size", vars };
  }
  // the same required card listed several times is a choice among role cards (Lola Hayes)
  if (new Set(inv.signatures).size < inv.signatures.length) return { key: "deck.choice.role", vars };
  return undefined;
}

const lower = (s: string) => s.toLowerCase();

/** whether a card meets every criterion an option names (a card with no experience level counts as level 0) */
function optionMatches(o: DeckOption, c: CardDef): boolean {
  if (o.permanent !== undefined && o.permanent !== /Permanent\./.test(c.text)) return false;
  if (o.faction?.length && !o.faction.includes(c.faction)) return false;
  if (o.type?.length && !o.type.includes(c.type)) return false;
  if (o.trait?.length && !o.trait.some((t) => c.traits.some((x) => lower(x) === lower(t)))) return false;
  if (o.uses?.length && !o.uses.some((u) => lower(c.uses?.type ?? "") === lower(u) || lower(c.text).includes(`${lower(u)}).`))) return false;
  // a tag, where the option names one, decides; otherwise the text patterns do
  if (o.tag?.length) {
    if (!o.tag.some((t) => c.tags?.includes(t))) return false;
  } else if (o.text?.length && !o.text.some((re) => new RegExp(re).test(c.text))) return false;
  if (o.level && !((c.xp ?? 0) >= o.level.min && (c.xp ?? 0) <= o.level.max)) return false;
  // an option that only offers a deck size admits nothing
  if (o.deck_size_select) return false;
  return true;
}

interface OptionCount {
  limit: number;
  atleast: Record<string, number>;
}

/** the first option that admits the card, as ArkhamDB reads them: a `not` option that matches shuts it out; limited options count */
function admit(options: DeckOption[], counts: OptionCount[], c: CardDef): "ok" | "excluded" | "none" {
  for (const [i, o] of options.entries()) {
    if (!optionMatches(o, c)) continue;
    if (o.not) return "excluded";
    if (o.atleast) counts[i].atleast[c.faction] = (counts[i].atleast[c.faction] ?? 0) + 1;
    if (o.limit) {
      // a full option lets the card fall through to the next, except the last one, which keeps counting (and fails at the end)
      if (i === options.length - 1 || counts[i].limit < o.limit) {
        counts[i].limit += 1;
        if (o.ignore_match) continue;
        return "ok";
      }
      continue;
    }
    if (o.ignore_match) continue;
    return "ok";
  }
  return "none";
}

const levelText = (o: DeckOption) => (o.level ? (o.level.min === o.level.max ? String(o.level.min) : `${o.level.min}–${o.level.max}`) : "0");
const sig = (p: DeckProblem) => `${p.reason?.key}:${JSON.stringify(p.reason?.vars ?? {})}`;

/** validate a deck against its investigator's deckbuilding rules */
export function validateDeck(db: ContentDb, d: DeckDef): DeckProblem[] {
  const problems: DeckProblem[] = [];
  const inv = db.investigators[d.investigator];
  if (!inv) return [{ code: d.investigator, message: `unknown investigator ${d.investigator}`, reason: { key: "deck.investigator", vars: { inv: d.investigator } } }];
  const choice = needsChoice(inv);
  if (choice) return [{ message: `${db.cards[inv.code]?.name ?? inv.code}'s deck needs a choice this builder does not offer (${choice.key})`, reason: choice }];
  const alternatives = new Set(Object.values(inv.alternatives ?? {}).flat());
  const required = new Set([...inv.signatures, ...inv.weaknesses, ...alternatives]);
  const counted: CardDef[] = [];
  const titles = new Map<string, { card: CardDef; n: number }>();
  let basicWeaknesses = 0;
  for (const [code, n] of Object.entries(d.cards)) {
    const c = db.cards[code];
    if (!c) {
      problems.push({ code, message: `unknown card ${code}`, reason: { key: "deck.unknown", vars: { card: code } } });
      continue;
    }
    if (c.type === "investigator" || c.faction === "mythos") {
      problems.push({ code, message: `${c.name} cannot be included in a deck`, reason: { key: "deck.cannot", vars: { card: code } } });
      continue;
    }
    // copies are counted by title across levels (a weakness or story card by its code)
    const title = isWeakness(c) || c.encounterSet ? c.code : c.name;
    const t = titles.get(title) ?? { card: c, n: 0 };
    t.n += n;
    t.card = (c.deckLimit ?? 2) < (t.card.deckLimit ?? 2) ? c : t.card;
    titles.set(title, t);
    if (c.subtype === "basicweakness") basicWeaknesses += n;
    if (required.has(code) || isWeakness(c)) continue;
    for (let k = 0; k < n; k++) counted.push(c);
  }
  for (const { card, n } of titles.values()) {
    const limit = card.deckLimit ?? 2;
    if (n > limit) problems.push({ code: card.code, message: `too many copies of ${card.name} (${n}, limit ${limit})`, reason: { key: "deck.copies", vars: { card: card.code, n, limit } } });
  }
  // the highest levels first, so a limited option is spent on the cards that need it least often
  counted.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0) || a.code.localeCompare(b.code));
  const counts: OptionCount[] = inv.deckOptions.map(() => ({ limit: 0, atleast: {} }));
  const reported = new Set<string>();
  for (const c of counted) {
    // "<Investigator> deck only" cards are signatures of someone else
    const foreignSignature = Object.values(db.investigators).some((i) => i.code !== inv.code && i.signatures.includes(c.code));
    const verdict = foreignSignature ? "foreign" : admit(inv.deckOptions, counts, c);
    if (verdict === "ok" || reported.has(c.code)) continue;
    reported.add(c.code);
    const level = c.xp ?? 0;
    if (verdict === "foreign") problems.push({ code: c.code, message: `${c.name} belongs to another investigator's deck`, reason: { key: "deck.foreign", vars: { card: c.code } } });
    else if (verdict === "excluded") problems.push({ code: c.code, message: `${c.name} is excluded for ${db.cards[inv.code]?.name ?? inv.code}`, reason: { key: "deck.excluded", vars: { card: c.code, inv: inv.code } } });
    else problems.push({ code: c.code, message: `${c.name} (${c.faction} ${level}) is not allowed for ${db.cards[inv.code]?.name ?? inv.code}`, reason: { key: "deck.notAllowed", vars: { card: c.code, faction: c.faction, level, inv: inv.code } } });
  }
  for (const [i, o] of inv.deckOptions.entries()) {
    if (o.limit && counts[i].limit > o.limit) problems.push({ message: o.error ?? `more than ${o.limit} cards of level ${levelText(o)} beyond the main options`, reason: { key: "deck.optionLimit", vars: { limit: o.limit, level: levelText(o) } } });
    if (o.atleast) {
      const groups = Object.values(counts[i].atleast).filter((n) => n >= o.atleast!.min).length;
      if (groups < (o.atleast.factions ?? 0)) problems.push({ message: o.error ?? `needs at least ${o.atleast.min} cards from ${o.atleast.factions} classes`, reason: { key: "deck.atLeast", vars: { min: o.atleast.min, n: o.atleast.factions } } });
    }
  }
  for (const code of inv.signatures) {
    // a signature may stand as its alternative version
    if (!d.cards[code] && !(inv.alternatives?.[code] ?? []).some((a) => d.cards[a])) problems.push({ code, message: `missing required card ${db.cards[code]?.name ?? code}`, reason: { key: "deck.missing", vars: { card: code } } });
  }
  for (const code of inv.weaknesses) if (!d.cards[code] && !(inv.alternatives?.[code] ?? []).some((a) => d.cards[a])) problems.push({ code, message: `missing required card ${db.cards[code]?.name ?? code}`, reason: { key: "deck.missing", vars: { card: code } } });
  if (counted.length !== inv.deckSize) problems.push({ message: `deck has ${counted.length} cards, needs ${inv.deckSize} (not counting signatures and weaknesses)`, reason: { key: "deck.size", vars: { n: counted.length, size: inv.deckSize } } });
  if (basicWeaknesses === 0 && !d.randomBasicWeakness) problems.push({ message: "deck needs a basic weakness (or randomBasicWeakness: true)", reason: { key: "deck.noWeakness" } });
  return problems;
}

/** what a single card can't change: the deck's size, its required cards and its weakness */
const NOT_ABOUT_ONE_CARD = new Set(["deck.size", "deck.missing", "deck.noWeakness"]);

/**
 * Why one more copy of a card can't go into the deck, or null when it can: the first problem adding it brings that the
 * deck did not have before (the size and the required cards are the builder's to show, not a reason for this card).
 */
export function whyNot(db: ContentDb, deck: DeckDef, code: string): DeckReason | null {
  const before = new Set(validateDeck(db, deck).map(sig));
  const after = validateDeck(db, { ...deck, cards: { ...deck.cards, [code]: (deck.cards[code] ?? 0) + 1 } });
  return after.find((p) => p.reason && !NOT_ABOUT_ONE_CARD.has(p.reason.key) && !before.has(sig(p)))?.reason ?? null;
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
