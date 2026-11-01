/**
 * The store's records and piles, for the core alone (ADR-0022, ADR-0023). Everything else reads through the views
 * `card` and `inv` return and writes through the core's setters; the boundary test keeps imports of this module to
 * the core (test files may build state with it).
 *
 * State-level functions (`...In`, taking anything with a `world`) serve code that holds a state; the engine-context
 * ones (taking `g`) are for the core's own writes.
 */
import type { G } from "./core";
import type {
  CardInst,
  GameState,
  InstId,
  InvId,
  InvRecord,
  InvState,
  PileName,
  World,
  Zone,
} from "./types";

type HasWorld = { world: World };

export const newWorld = (): World => ({
  entities: [],
  tables: { card: {}, investigator: {} },
  piles: {},
});

// ---------- cards ----------
/** a card's record in a state (a record lookup, as indexing was: undefined at runtime for an id the game doesn't have) */
export const cardRecIn = (s: HasWorld, id: InstId): CardInst => s.world.tables.card[id];
export const cardRecIfIn = (s: HasWorld, id: InstId | null | undefined): CardInst | undefined =>
  id ? s.world.tables.card[id] : undefined;
export const cardRec = (g: G, id: InstId): CardInst => {
  const c = g.s.world.tables.card[id];
  if (!c) throw new Error(`no card instance ${id}`);
  return c;
};
export const cardRecIf = (g: G, id: InstId | null | undefined): CardInst | undefined =>
  cardRecIfIn(g.s, id);
/**
 * every card record, in creation order: the card table's own order, which is the entity list's (a card is added to both
 * together and never removed; a test holds the two equal). `Object.values` is much faster than looking each entity up.
 */
export const allCardRecsIn = (s: HasWorld): CardInst[] => Object.values(s.world.tables.card);
export const allCardRecs = (g: G): CardInst[] => allCardRecsIn(g.s);

/** a copy of a state with more cards in it (or some replaced), for fixtures; the state given is not changed */
export function withCardsIn(s: GameState, cards: Record<InstId, CardInst>): GameState {
  const card = { ...s.world.tables.card, ...cards };
  const added = Object.keys(cards).filter((id) => !(id in s.world.tables.card));
  return {
    ...s,
    world: {
      ...s.world,
      entities: [...s.world.entities, ...added],
      tables: { ...s.world.tables, card },
    },
  };
}

// ---------- investigators ----------
export const invRecIn = (s: HasWorld, id: InvId): InvRecord => s.world.tables.investigator[id];
export const invRec = (g: G, id: InvId): InvRecord => {
  const i = g.s.world.tables.investigator[id];
  if (!i) throw new Error(`no investigator ${id}`);
  return i;
};
export const invRecIf = (g: G, id: InvId | null | undefined): InvRecord | undefined =>
  id ? g.s.world.tables.investigator[id] : undefined;
/** every investigator record, in the order they joined */
export const allInvRecs = (g: G): InvRecord[] => Object.values(g.s.world.tables.investigator);

/**
 * An investigator as a full mutable record, piles included, for tests that build or change state directly: the live view,
 * typed as the whole `InvState` (undefined at runtime for an id the game doesn't have, as indexing was).
 */
export const invStateIn = (s: HasWorld, id: InvId): InvState => invViewIn(s, id) as InvState;
/** every investigator as a full mutable record, in turn order */
export const allInvStatesIn = (s: HasWorld & { order: InvId[] }): InvState[] =>
  s.order.map((i) => invStateIn(s, i));

// ---------- piles ----------
/** the zones whose cards sit in a pile named by the zone and the owner */
export const PILED_ZONES: Zone[] = [
  "deck",
  "hand",
  "discard",
  "encounterDeck",
  "encounterDiscard",
  "actDeck",
  "agendaDeck",
];

/**
 * The pile a card in this zone sits in, or null when the zone has none (or the pile needs an owner the card doesn't
 * have). A side deck's name isn't in the zone: those piles are found by the `sideDeck:` prefix.
 */
export function pileKey(zone: Zone, owner: InvId | null): PileName | null {
  switch (zone) {
    case "deck":
    case "hand":
    case "discard":
      return owner ? `${zone}:${owner}` : null;
    case "encounterDeck":
    case "encounterDiscard":
    case "actDeck":
    case "agendaDeck":
      return zone;
    default:
      return null;
  }
}

const EMPTY: readonly InstId[] = Object.freeze([]);
/** a pile as it is; an empty one for a pile the game hasn't made, which this doesn't create */
export const pileRead = (s: HasWorld, name: PileName): readonly InstId[] =>
  s.world.piles[name] ?? EMPTY;
/** a pile to change: made when the game doesn't have it yet */
export const pileRecIn = (s: HasWorld, name: PileName): InstId[] => (s.world.piles[name] ??= []);
export const pileRec = (g: G, name: PileName): InstId[] => pileRecIn(g.s, name);
/** the names of the piles that begin with a prefix (`sideDeck:`, `hand:`) */
export const pilesNamed = (s: HasWorld, prefix: string): PileName[] =>
  (Object.keys(s.world.piles) as PileName[]).filter((n) => n.startsWith(prefix));

// ---------- live investigator views ----------
type Fields = Record<keyof InvRecord, true>;
/** every field of an investigator's record; the compiler checks the list is whole */
const RECORD_FIELDS = Object.keys({
  id: true,
  cardId: true,
  name: true,
  location: true,
  damage: true,
  horror: true,
  clues: true,
  resources: true,
  actionsLeft: true,
  restrictedActions: true,
  actionsThisRound: true,
  actionsTaken: true,
  defeatedHealth: true,
  status: true,
  defeatedBy: true,
  turnDone: true,
  physicalTrauma: true,
  mentalTrauma: true,
  player: true,
} satisfies Fields) as (keyof InvRecord)[];
const PILE_FIELDS = ["deck", "hand", "discard"] as const;

const views = new WeakMap<InvRecord, { world: World; view: InvState }>();

/**
 * An investigator as one object whose fields and piles always show the current record and piles: getters over the
 * record, and over the pile map for `deck`, `hand` and `discard` (assigning one replaces the pile's contents in place).
 * One per record and world, so a view held across a change stays right. Not stored: states hold records only.
 */
export function invViewIn(s: HasWorld, id: InvId): InvState | undefined {
  const rec = s.world.tables.investigator[id];
  if (!rec) return undefined;
  const hit = views.get(rec);
  if (hit && hit.world === s.world) return hit.view;
  const world = s.world;
  const view = {} as InvState;
  for (const key of RECORD_FIELDS)
    Object.defineProperty(view, key, {
      enumerable: true,
      get: () => rec[key],
      set: (v) => void ((rec as Record<string, unknown>)[key] = v),
    });
  for (const kind of PILE_FIELDS)
    Object.defineProperty(view, kind, {
      enumerable: true,
      get: () => (world.piles[`${kind}:${id}`] ??= []),
      set: (ids: InstId[]) =>
        void (world.piles[`${kind}:${id}`] ??= []).splice(0, Infinity, ...ids),
    });
  views.set(rec, { world, view });
  return view;
}
