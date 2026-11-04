/**
 * The store's records and piles, for the core alone (ADR-0022, ADR-0023). Everything else reads through the views
 * `card` and `inv` return and writes through the core's setters; the boundary test keeps imports of this module to
 * the core (test files may build state with it).
 *
 * State-level functions (`...In`, taking anything with a `world`) serve code that holds a state; the engine-context
 * ones (taking `g`) are for the core's own writes.
 */
import type {
  CardIdentity,
  GameContext,
  CardInst,
  CardTables,
  GameState,
  InstId,
  InvId,
  InvRecord,
  InvState,
  PileName,
  World,
  Zone,
} from "./types";
import { ZONE } from "./constants";

type HasWorld = { world: World };

export const newWorld = (): World => ({
  entities: [],
  tables: {
    card: {},
    investigator: {},
    zone: {},
    owner: {},
    controller: {},
    exhausted: {},
    revealed: {},
    damage: {},
    horror: {},
    clues: {},
    doom: {},
    uses: {},
    resources: {},
    location: {},
    engagedWith: {},
    attachedTo: {},
    noReady: {},
    surge: {},
    dying: {},
    costMod: {},
    tokens: {},
    aside: {},
    xp: {},
    hunch: {},
    hunchRevealed: {},
    attacked: {},
    noAttack: {},
    cell: {},
    links: {},
    oneWay: {},
  },
  piles: {},
});

// ---------- cards ----------
type CardField = keyof CardTables;
/** the value a field has when its table has no entry for a card (a zone has no default: every card has one) */
const CARD_DEFAULT: { [F in CardField]: unknown } = {
  zone: undefined,
  owner: null,
  controller: null,
  exhausted: false,
  revealed: false,
  damage: 0,
  horror: 0,
  clues: 0,
  doom: 0,
  uses: 0,
  resources: 0,
  location: null,
  engagedWith: null,
  attachedTo: null,
};
const CARD_FIELDS = Object.keys(CARD_DEFAULT) as CardField[];

/**
 * A card as one object whose fields always show the tables: an accessor per field that reads its table (the default
 * for an absent entry) and writes it (deleting the entry for the default). The accessors sit on the prototype, so
 * making a view is cheap; `toJSON` gives the whole record. One per card and world (see `viewOf`). Not stored.
 */
class CardLiveBase {
  readonly id: InstId;
  #w: World;
  constructor(w: World, id: InstId) {
    this.#w = w;
    this.id = id;
  }
  toJSON(): CardInst {
    return cardData(this.#w, this.id);
  }
  static {
    for (const f of CARD_FIELDS)
      Object.defineProperty(CardLiveBase.prototype, f, {
        get(this: CardLiveBase) {
          const v = (this.#w.tables[f] as Record<InstId, unknown>)[this.id];
          return v === undefined ? CARD_DEFAULT[f] : v;
        },
        set(this: CardLiveBase, v: unknown) {
          const t = this.#w.tables[f] as Record<InstId, unknown>;
          if (v === undefined || v === CARD_DEFAULT[f]) delete t[this.id];
          else t[this.id] = v;
        },
      });
    Object.defineProperty(CardLiveBase.prototype, "code", {
      get(this: CardLiveBase) {
        return this.#w.tables.card[this.id].code;
      },
      set(this: CardLiveBase, v: string) {
        this.#w.tables.card[this.id].code = v;
      },
    });
  }
}
type CardLive = CardInst & { toJSON(): CardInst };
const CardLive = CardLiveBase as unknown as new (w: World, id: InstId) => CardLive;

type ViewCache = { byId: Record<InstId, CardLive>; all: CardLive[]; count: number };
const viewCaches = new WeakMap<World, ViewCache>();
const cacheOf = (w: World): ViewCache => {
  let c = viewCaches.get(w);
  if (!c) viewCaches.set(w, (c = { byId: {}, all: [], count: -1 }));
  return c;
};
/** a card's view, made once per card and world; undefined for an id the game doesn't have */
const viewOf = (w: World, id: InstId): CardLive | undefined =>
  w.tables.card[id] ? (cacheOf(w).byId[id] ??= new CardLive(w, id)) : undefined;

/** a card's fields as a plain object, in the record's order (a spread of a view gives only its id) */
function cardData(w: World, id: InstId): CardInst {
  const c = viewOf(w, id)!;
  return {
    id,
    code: c.code,
    owner: c.owner,
    controller: c.controller,
    zone: c.zone,
    exhausted: c.exhausted,
    revealed: c.revealed,
    damage: c.damage,
    horror: c.horror,
    clues: c.clues,
    doom: c.doom,
    uses: c.uses,
    resources: c.resources,
    location: c.location,
    engagedWith: c.engagedWith,
    attachedTo: c.attachedTo,
  };
}
export const cardDataIn = (s: HasWorld, id: InstId): CardInst => cardData(s.world, id);

/** a card's view in a state (as indexing was: undefined at runtime for an id the game doesn't have) */
export const cardRecIn = (s: HasWorld, id: InstId): CardInst => viewOf(s.world, id) as CardInst;
export const cardRecIfIn = (s: HasWorld, id: InstId | null | undefined): CardInst | undefined =>
  id ? viewOf(s.world, id) : undefined;
export const cardRec = (game: GameContext, id: InstId): CardInst => {
  const c = viewOf(game.s.world, id);
  if (!c) throw new Error(`no card instance ${id}`);
  return c;
};
export const cardRecIf = (game: GameContext, id: InstId | null | undefined): CardInst | undefined =>
  cardRecIfIn(game.s, id);
/** every card, in creation order; a new array each time, so a caller may sort it */
export function allCardRecsIn(s: HasWorld): CardInst[] {
  const w = s.world;
  const c = cacheOf(w);
  if (c.count !== w.entities.length) {
    c.all = w.entities.map((id) => viewOf(w, id)!);
    c.count = w.entities.length;
  }
  return c.all.slice();
}
export const allCardRecs = (game: GameContext): CardInst[] => allCardRecsIn(game.s);

/** put a card in a world, every field in its table (a card with this id already there is replaced); for core and tests */
export function putCardIn(s: HasWorld, c: CardInst): void {
  const { tables, entities } = s.world;
  if (!tables.card[c.id]) entities.push(c.id);
  tables.card[c.id] = { id: c.id, code: c.code } satisfies CardIdentity;
  const v = viewOf(s.world, c.id) as unknown as Record<string, unknown>;
  for (const f of CARD_FIELDS) v[f] = c[f];
}

/** the world with the tables named copied, so a change to them leaves the original alone */
function withCopiedTables(w: World, names: Iterable<keyof World["tables"]>): World {
  const tables = { ...w.tables };
  for (const n of names) (tables[n] as object) = { ...tables[n] };
  return { ...w, tables };
}

/** a copy of a state with changes to some cards' fields, for a what-if (a preview); the state given is not changed */
export function patchedCardsIn<S extends HasWorld>(
  s: S,
  patches: Record<InstId, Partial<CardInst>>,
): S {
  const names = new Set<keyof World["tables"]>();
  for (const patch of Object.values(patches))
    for (const k of Object.keys(patch)) names.add(k === "code" ? "card" : (k as CardField));
  names.delete("id" as never);
  const out = { ...s, world: withCopiedTables(s.world, names) };
  for (const [id, patch] of Object.entries(patches)) {
    const v = cardRecIfIn(out, id) as unknown as Record<string, unknown> | undefined;
    if (v) for (const [k, val] of Object.entries(patch)) if (k !== "id") v[k] = val;
  }
  return out;
}

/** a copy of a state with more cards in it (or some replaced), for fixtures; the state given is not changed */
export function withCardsIn(s: GameState, cards: Record<InstId, CardInst>): GameState {
  const base = withCopiedTables(
    s.world,
    (Object.keys(s.world.tables) as (keyof World["tables"])[]).filter((n) => n !== "investigator"),
  );
  const out = { ...s, world: { ...base, entities: [...s.world.entities] } };
  for (const c of Object.values(cards)) putCardIn(out, c);
  return out;
}

// ---------- investigators ----------
export const invRecIn = (s: HasWorld, id: InvId): InvRecord => s.world.tables.investigator[id];
export const invRec = (game: GameContext, id: InvId): InvRecord => {
  const i = game.s.world.tables.investigator[id];
  if (!i) throw new Error(`no investigator ${id}`);
  return i;
};
export const invRecIf = (game: GameContext, id: InvId | null | undefined): InvRecord | undefined =>
  id ? game.s.world.tables.investigator[id] : undefined;
/** every investigator record, in the order they joined */
export const allInvRecs = (game: GameContext): InvRecord[] =>
  Object.values(game.s.world.tables.investigator);

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
  ZONE.Deck,
  ZONE.Hand,
  ZONE.Discard,
  ZONE.EncounterDeck,
  ZONE.EncounterDiscard,
  ZONE.ActDeck,
  ZONE.AgendaDeck,
];

/**
 * The pile a card in this zone sits in, or null when the zone has none (or the pile needs an owner the card doesn't
 * have). A side deck's name isn't in the zone: those piles are found by the `sideDeck:` prefix.
 */
/** an act or agenda deck's pile: deck `a` is the scenario's one deck (`actDeck`), another `actDeck:<deck>` */
export const deckPile = (kind: "act" | "agenda", deck = "a"): PileName =>
  deck === "a" ? `${kind}Deck` : `${kind}Deck:${deck}`;

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
export const pileRec = (game: GameContext, name: PileName): InstId[] => pileRecIn(game.s, name);
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
  vehicle: true,
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
