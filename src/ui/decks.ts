import { cardText, t } from "../content/i18n";
import type { CardDef, DeckDef, InvestigatorDef } from "../content/schema";
import { validateDeck, type DeckProblem } from "../engine/decks";
import type { ContentDb } from "../engine/types";
import { catalogCards, emptyFilters } from "./catalog/filter";
import { safeStorage, type Storage } from "./store";

/**
 * Deck building: starting points (a starter deck, a saved deck, an empty one), the pool of cards a builder offers, and
 * custom decks saved on the device. Pure over the content and a storage; the builder screen only draws it.
 */
export const DECKS_KEY = "ah:decks";

const isBasicWeakness = (db: ContentDb, code: string) =>
  db.cards[code]?.subtype === "basicweakness";

/** the loaded basic weaknesses, by name */
export const basicWeaknesses = (db: ContentDb): CardDef[] =>
  Object.values(db.cards)
    .filter((c) => c.subtype === "basicweakness" && c.type !== "investigator")
    .sort((a, b) => a.name.localeCompare(b.name));

/** a deck of only what an investigator always has: the signature cards and the weakness slot, with a random basic weakness */
export function emptyDeck(db: ContentDb, investigator: string): DeckDef {
  const inv = db.investigators[investigator];
  const cards: Record<string, number> = {};
  for (const c of [...(inv?.signatures ?? []), ...(inv?.weaknesses ?? [])])
    cards[c] = (cards[c] ?? 0) + 1;
  return {
    id: `empty:${investigator}`,
    name: "Empty",
    investigator,
    cards,
    randomBasicWeakness: true,
  };
}

/** one more or one fewer copy of a card (never below none); the cards given are not changed */
export function changeCopies(
  cards: Record<string, number>,
  code: string,
  delta: number,
): Record<string, number> {
  const out = { ...cards };
  const n = (out[code] ?? 0) + delta;
  if (n > 0) out[code] = n;
  else delete out[code];
  return out;
}

/** the deck with its basic weakness replaced by the chosen one, or by a random one (`null`) */
export function withWeakness(db: ContentDb, deck: DeckDef, code: string | null): DeckDef {
  const cards = { ...deck.cards };
  for (const c of Object.keys(cards)) if (isBasicWeakness(db, c)) delete cards[c];
  if (code) cards[code] = 1;
  return { ...deck, cards, randomBasicWeakness: code === null };
}

/** the classes an investigator's options name: the builder's list starts with them (empty when an option names none, so every class shows) */
export function optionFactions(inv: InvestigatorDef): string[] {
  const named = inv.deckOptions.filter((o) => !o.not && !o.deck_size_select && !o.faction_select);
  if (named.some((o) => !o.faction?.length)) return [];
  return [...new Set(named.flatMap((o) => o.faction ?? []))];
}

export interface PoolFilter {
  query: string;
  factions: string[];
  types: string[];
  levels: number[];
}

/**
 * The cards the builder lists for an investigator: player cards (not signatures, weaknesses, story cards or cards that
 * can't be in a deck), narrowed to the classes of their options unless the filter chooses classes, by the catalog's filter.
 */
export function builderPool(
  db: ContentDb,
  locale: string,
  investigator: string,
  f: PoolFilter,
): CardDef[] {
  const inv = db.investigators[investigator];
  if (!inv) return [];
  const required = new Set([
    ...inv.signatures,
    ...inv.weaknesses,
    ...Object.values(inv.alternatives ?? {}).flat(),
  ]);
  const foreign = new Set(
    Object.values(db.investigators)
      .filter((i) => i.code !== inv.code)
      .flatMap((i) => i.signatures),
  );
  const factions = f.factions.length ? f.factions : optionFactions(inv);
  return catalogCards(db, locale, {
    ...emptyFilters,
    tab: "player",
    factions,
    types: f.types.length ? f.types : ["asset", "event", "skill"],
    levels: f.levels,
    query: f.query,
  }).filter(
    (c) =>
      !c.subtype &&
      !c.encounterSet &&
      (c.deckLimit ?? 2) > 0 &&
      !required.has(c.code) &&
      !foreign.has(c.code),
  );
}

/** a problem in the player's language */
export function problemText(db: ContentDb, locale: string, p: DeckProblem): string {
  if (!p.reason) return p.message;
  const v = p.reason.vars ?? {};
  const vars: Record<string, string | number> = { ...v };
  for (const k of ["card", "inv"])
    if (typeof v[k] === "string" && db.cards[v[k] as string])
      vars[k] = cardText(db, v[k] as string, locale).name;
  return t(db, locale, p.reason.key, vars);
}

// ---------- custom decks, saved on the device ----------
export interface SavedDeck {
  id: string;
  name: string;
  investigator: string;
  /** the deck it was started from (a starter deck, or empty), for the record */
  base: string;
  /** the resolved deck the game uses */
  deck: DeckDef;
  /** empty when the deck is valid against the loaded packs */
  problems: DeckProblem[];
}

type Stored = Omit<SavedDeck, "problems">;

function read(storage: Storage): Stored[] {
  try {
    const raw = JSON.parse(storage.getItem(DECKS_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter(
          (d) => d && typeof d.id === "string" && typeof d.name === "string" && d.deck?.cards,
        )
      : [];
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
export function customDecks(
  db: ContentDb,
  investigator: string,
  storage: Storage = safeStorage(),
): SavedDeck[] {
  return read(storage)
    .filter((d) => d.investigator === investigator)
    .map((d) => ({ ...d, problems: validateDeck(db, d.deck) }));
}

let counter = 0;
const newId = () =>
  `custom:${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** the default name: the investigator's first name and the date ("Roland · 17 Oct") */
export function defaultDeckName(
  db: ContentDb,
  investigator: string,
  locale: string,
  now = new Date(),
): string {
  const first = (db.cards[investigator]?.name ?? investigator)
    .replace(/["“”]/g, "")
    .trim()
    .split(/\s+/)[0];
  return `${first} · ${now.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short" }).replace(/\.$/, "")}`;
}

/** save a custom deck; an invalid one is refused */
export function saveCustomDeck(
  db: ContentDb,
  storage: Storage,
  input: {
    name: string;
    investigator: string;
    base: string;
    cards: Record<string, number>;
    randomBasicWeakness: boolean;
  },
): SavedDeck {
  const id = newId();
  const deck: DeckDef = {
    id,
    name: input.name,
    investigator: input.investigator,
    cards: input.cards,
    randomBasicWeakness: input.randomBasicWeakness,
  };
  const problems = validateDeck(db, deck);
  if (problems.length)
    throw new Error(`invalid deck: ${problems.map((p) => p.message).join("; ")}`);
  write(storage, [
    ...read(storage),
    { id, name: input.name, investigator: input.investigator, base: input.base, deck },
  ]);
  return {
    id,
    name: input.name,
    investigator: input.investigator,
    base: input.base,
    deck,
    problems,
  };
}

export function renameCustomDeck(storage: Storage, id: string, name: string) {
  write(
    storage,
    read(storage).map((d) => (d.id === id ? { ...d, name, deck: { ...d.deck, name } } : d)),
  );
}

export function deleteCustomDeck(storage: Storage, id: string) {
  write(
    storage,
    read(storage).filter((d) => d.id !== id),
  );
}

/** one copy of `out` taken out and one of `into` put in (the cards given are not changed) */
export const replaceCard = (
  cards: Record<string, number>,
  out: string,
  into: string,
): Record<string, number> => changeCopies(changeCopies(cards, out, -1), into, 1);

export interface DeckTab {
  id: string;
  name: string;
  kind: "starter" | "custom";
  deck: DeckDef;
  problems: DeckProblem[];
}

/** the deck step's tabs for an investigator: their starter decks, then their saved decks (an unfinished one too, with its problems) */
export function deckTabs(
  db: ContentDb,
  investigator: string,
  storage: Storage = safeStorage(),
): DeckTab[] {
  const starters = Object.values(db.decks).filter((d) => d.investigator === investigator);
  return [
    ...starters.map((d) => ({
      id: d.id,
      name: d.name,
      kind: "starter" as const,
      deck: d,
      problems: validateDeck(db, d),
    })),
    ...customDecks(db, investigator, storage).map((d) => ({
      id: d.id,
      name: d.name,
      kind: "custom" as const,
      deck: d.deck,
      problems: d.problems,
    })),
  ];
}

/**
 * Keep an edit of a deck: a saved deck is changed in place; a starter deck (or a new one) is never changed, the edit
 * becomes a new saved deck named after the investigator and the date. Saved as it stands, valid or not, so an unfinished
 * deck stays as a tab with its problems. Returns the saved deck's id.
 */
export function editDeck(
  db: ContentDb,
  storage: Storage,
  investigator: string,
  from: DeckDef,
  cards: Record<string, number>,
  locale: string,
  randomBasicWeakness = from.randomBasicWeakness,
): string {
  const all = read(storage);
  const mine = all.find((d) => d.id === from.id);
  if (mine) {
    write(
      storage,
      all.map((d) =>
        d.id === from.id ? { ...d, deck: { ...d.deck, cards, randomBasicWeakness } } : d,
      ),
    );
    return from.id;
  }
  const id = newId();
  // a second deck of the same day gets a number: "Roland · 19 Oct (2)"
  const taken = new Set(all.filter((d) => d.investigator === investigator).map((d) => d.name));
  const plain = defaultDeckName(db, investigator, locale);
  let name = plain;
  for (let k = 2; taken.has(name); k++) name = `${plain} (${k})`;
  write(storage, [
    ...all,
    {
      id,
      name,
      investigator,
      base: from.id,
      deck: { id, name, investigator, cards, randomBasicWeakness },
    },
  ]);
  return id;
}
