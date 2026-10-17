import { cardText, t } from "../content/i18n";
import type { CardDef, DeckDef } from "../content/schema";
import { validateDeck, type DeckProblem } from "../engine/decks";
import type { ContentDb } from "../engine/types";
import { safeStorage, type Storage } from "./store";

/**
 * Deck configuration: a bounded edit of a starter deck (ops over a base deck), the pool of cards the editor offers,
 * and custom decks saved on the device. Pure over the content and a storage; the editor screen only draws it.
 */

/** the most cards a custom deck may differ from its starter by */
export const SWAP_LIMIT = 5;
export const DECKS_KEY = "ah:decks";

export type DeckOp = { op: "remove"; code: string } | { op: "add"; code: string } | { op: "weakness"; code: string | null };

const isBasicWeakness = (db: ContentDb, code: string) => db.cards[code]?.subtype === "basicweakness";

/** the loaded basic weaknesses, by name */
export const basicWeaknesses = (db: ContentDb): CardDef[] =>
  Object.values(db.cards)
    .filter((c) => c.subtype === "basicweakness" && c.type !== "investigator")
    .sort((a, b) => a.name.localeCompare(b.name));

/** level 0 assets, events and skills the investigator's deck rules allow: not signatures, weaknesses or another investigator's cards */
export function poolFor(db: ContentDb, investigator: string): CardDef[] {
  const inv = db.investigators[investigator];
  if (!inv) return [];
  const required = new Set([...inv.signatures, ...inv.weaknesses]);
  const foreign = new Set(Object.values(db.investigators).filter((i) => i.code !== inv.code).flatMap((i) => i.signatures));
  return Object.values(db.cards)
    .filter((c) => ["asset", "event", "skill"].includes(c.type) && !c.subtype && c.faction !== "mythos" && (c.xp ?? 0) === 0 && !required.has(c.code) && !foreign.has(c.code))
    .filter((c) => inv.deckOptions.some((o) => (!o.faction || o.faction.includes(c.faction)) && (!o.level || (0 >= o.level.min && 0 <= o.level.max))))
    .sort((a, b) => a.faction.localeCompare(b.faction) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
}

/** the resolved deck: the base with the ops applied in order (the base is never changed) */
export function applySwaps(db: ContentDb, base: DeckDef, ops: DeckOp[]): DeckDef {
  const cards = { ...base.cards };
  let random = base.randomBasicWeakness;
  for (const o of ops) {
    if (o.op === "remove") {
      if (!cards[o.code]) continue;
      if (cards[o.code] > 1) cards[o.code] -= 1;
      else delete cards[o.code];
    } else if (o.op === "add") cards[o.code] = (cards[o.code] ?? 0) + 1;
    else {
      for (const code of Object.keys(cards)) if (isBasicWeakness(db, code)) delete cards[code];
      if (o.code) cards[o.code] = 1;
      random = o.code === null;
    }
  }
  return { ...base, cards, randomBasicWeakness: random };
}

/** removals net of additions: how many of the base's cards are gone (a weakness change isn't a swap) */
export function swapBudget(db: ContentDb, base: DeckDef, ops: DeckOp[]): { used: number; limit: number; left: number } {
  const after = applySwaps(db, base, ops);
  let used = 0;
  for (const [code, n] of Object.entries(base.cards)) if (!isBasicWeakness(db, code)) used += Math.max(0, n - (after.cards[code] ?? 0));
  return { used, limit: SWAP_LIMIT, left: Math.max(0, SWAP_LIMIT - used) };
}

/** add an op unless it would break the swap limit */
export function addOp(db: ContentDb, base: DeckDef, ops: DeckOp[], op: DeckOp): { ok: true; ops: DeckOp[] } | { ok: false; reason: "limit" } {
  const next = [...ops, op];
  return swapBudget(db, base, next).used > SWAP_LIMIT ? { ok: false, reason: "limit" } : { ok: true, ops: next };
}

/** a problem in the player's language */
export function problemText(db: ContentDb, locale: string, p: DeckProblem): string {
  if (!p.reason) return p.message;
  const v = p.reason.vars ?? {};
  const vars: Record<string, string | number> = { ...v };
  for (const k of ["card", "inv"]) if (typeof v[k] === "string" && db.cards[v[k] as string]) vars[k] = cardText(db, v[k] as string, locale).name;
  return t(db, locale, p.reason.key, vars);
}

// ---------- custom decks, saved on the device ----------
export interface SavedDeck {
  id: string;
  name: string;
  investigator: string;
  /** the starter deck it was made from, and the edits (what the swap budget counts) */
  base: string;
  ops: DeckOp[];
  /** the resolved deck the game uses */
  deck: DeckDef;
  /** empty when the deck is valid against the loaded packs */
  problems: DeckProblem[];
}

type Stored = Omit<SavedDeck, "problems">;

function read(storage: Storage): Stored[] {
  try {
    const raw = JSON.parse(storage.getItem(DECKS_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((d) => d && typeof d.id === "string" && typeof d.name === "string" && d.deck?.cards && Array.isArray(d.ops)) : [];
  } catch {
    return [];
  }
}
function write(storage: Storage, decks: Stored[]) {
  try {
    storage.setItem(DECKS_KEY, JSON.stringify(decks));
  } catch {
    // full or private mode: the deck just won't be there next time
  }
}

/** saved decks of an investigator, each validated against the loaded packs again */
export function customDecks(db: ContentDb, investigator: string, storage: Storage = safeStorage()): SavedDeck[] {
  return read(storage)
    .filter((d) => d.investigator === investigator)
    .map((d) => ({ ...d, problems: validateDeck(db, d.deck) }));
}

let counter = 0;
const newId = () => `custom:${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** the default name: the investigator's first name and the date ("Roland · 17 Oct") */
export function defaultDeckName(db: ContentDb, investigator: string, locale: string, now = new Date()): string {
  const first = (db.cards[investigator]?.name ?? investigator).replace(/["“”]/g, "").trim().split(/\s+/)[0];
  return `${first} · ${now.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short" }).replace(/\.$/, "")}`;
}

/** save a custom deck; an invalid one is refused */
export function saveCustomDeck(db: ContentDb, storage: Storage, input: { name: string; investigator: string; base: string; ops: DeckOp[] }): SavedDeck {
  const base = db.decks[input.base];
  if (!base || base.investigator !== input.investigator) throw new Error(`deck ${input.base} is not a ${input.investigator} deck`);
  const id = newId();
  const deck: DeckDef = { ...applySwaps(db, base, input.ops), id, name: input.name, investigator: input.investigator };
  const problems = validateDeck(db, deck);
  if (problems.length) throw new Error(`invalid deck: ${problems.map((p) => p.message).join("; ")}`);
  write(storage, [...read(storage), { id, name: input.name, investigator: input.investigator, base: input.base, ops: input.ops, deck }]);
  return { id, name: input.name, investigator: input.investigator, base: input.base, ops: input.ops, deck, problems };
}

export function renameCustomDeck(storage: Storage, id: string, name: string) {
  write(storage, read(storage).map((d) => (d.id === id ? { ...d, name, deck: { ...d.deck, name } } : d)));
}

export function deleteCustomDeck(storage: Storage, id: string) {
  write(storage, read(storage).filter((d) => d.id !== id));
}
