import {
  allCardRecs,
  cardRec,
  deckPile,
  pileKey,
  pileRead,
  pileRec,
  pilesNamed,
  putCardIn,
} from "./world/store";
import type { CardInst, GameContext, InstId, InvId, PileName, Zone } from "./world/types";
import { card, clearTokens, def, emit, inv, invName, nextId, push, shuffleDeck } from "./context";
import { EVENT } from "./events/event";
import { STEP } from "./steps/step";
import { ZONE, PILE } from "./world/constants";

/** Creating cards and moving them between zones and piles (ADR-0023, ADR-0025). */

/** create a new card instance (setup, or cards entering the game mid-scenario) */
export function createCard(
  game: GameContext,
  code: string,
  zone: Zone,
  owner: InvId | null = null,
  /** a fixed id outside the sequence (the scenario card), so the cards after it keep theirs */
  fixed?: InstId,
): InstId {
  if (!game.db.cards[code]) throw new Error(`unknown card ${code}`);
  const id = fixed ?? nextId(game);
  putCardIn(game.s, {
    id,
    code,
    owner,
    controller: owner,
    zone,
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
  });
  const key = pileKey(zone, owner);
  if (key) pileRec(game, key).push(id);
  return id;
}

// ---------- card movement ----------
/** take a card out of the pile its zone says it sits in */
function removeFromPile(game: GameContext, id: InstId) {
  const c = cardRec(game, id);
  const piles = game.s.world.piles;
  const take = (name: PileName | null) => {
    const pile = name ? piles[name] : undefined;
    const at = pile ? pile.indexOf(id) : -1;
    if (at >= 0) pile!.splice(at, 1);
    return at >= 0;
  };
  // the pile the zone and owner name (beneath: the card it lies beneath); a card put in another investigator's pile (or
  // a side deck, whose name isn't in the zone) is found by its kind
  const named: PileName | null =
    c.zone === "beneath" ? `beneath:${c.location}` : pileKey(c.zone, c.owner);
  if (!take(named)) {
    const kind =
      c.zone === "deck" || c.zone === "hand" || c.zone === "discard"
        ? `${c.zone}:`
        : c.zone === "sideDeck"
          ? "sideDeck:"
          : c.zone === "actDeck" || c.zone === "agendaDeck"
            ? `${c.zone}:`
            : null;
    if (kind) for (const name of pilesNamed(game.s, kind)) if (take(name)) break;
  }
  for (const decks of [game.s.acts, game.s.agendas])
    for (const [deck, cur] of Object.entries(decks)) if (cur === id) decks[deck] = null;
}

/** the act or agenda deck a card is in (as its pile or its current card), else deck `a` */
function deckOf(game: GameContext, id: InstId, kind: "act" | "agenda"): string {
  const current = Object.entries(kind === "act" ? game.s.acts : game.s.agendas).find(
    ([, c]) => c === id,
  );
  if (current) return current[0];
  const name = pilesNamed(game.s, `${kind}Deck`).find((n) => game.s.world.piles[n]?.includes(id));
  return name?.includes(":") ? name.slice(name.indexOf(":") + 1) : "a";
}

const IN_PLAY: Zone[] = [
  ZONE.Play,
  ZONE.Threat,
  ZONE.Location,
  ZONE.Enemy,
  ZONE.Attached,
  ZONE.Act,
  ZONE.Agenda,
  ZONE.Investigator,
];
export const isInPlay = (c: CardInst) => IN_PLAY.includes(c.zone);

/** move a card instance to a zone; resets tokens when leaving play */
export function moveCard(
  game: GameContext,
  id: InstId,
  dest: Zone,
  opts: {
    inv?: InvId | null;
    top?: boolean;
    location?: InstId | null;
    /** the act or agenda deck, or the side deck, it goes into */
    deck?: string;
    /** the same card changing place, not leaving play: its tokens and attachments stay (a flip) */
    keep?: boolean;
    /** a card that cannot leave play leaves by its own text's one way out (The King in Yellow) */
    ownWay?: boolean;
  } = {},
) {
  const c = cardRec(game, id);
  // "cannot leave play" (The Pallid Mask): no discard, return or removal takes it, unless its controller is out
  if (
    def(game, id).cannotLeavePlay &&
    isInPlay(c) &&
    !IN_PLAY.includes(dest) &&
    !opts.keep &&
    !opts.ownWay &&
    (!c.controller || inv(game, c.controller).status === "playing")
  )
    return;
  // "Forced - When this leaves play": it goes where its card says (the void, out of the game), and what follows is queued
  const leaves = def(game, id).leavesPlay;
  const redirected =
    !!leaves && isInPlay(c) && !IN_PLAY.includes(dest) && dest !== ZONE.Limbo && !opts.keep;
  // for its controller while they play on; one leaving with an eliminated investigator resolves still (the lead's)
  const you = c.controller && inv(game, c.controller).status === "playing" ? c.controller : null;
  if (redirected && leaves.effects)
    push(game, {
      t: STEP.Effects,
      effects: leaves.effects,
      ctx: { source: id, ...(you ? { you } : {}) },
    });
  const zone = (redirected && leaves.to) || dest;
  const kind =
    zone === "act" || zone === "actDeck"
      ? "act"
      : zone === "agenda" || zone === "agendaDeck"
        ? "agenda"
        : null;
  const deck = kind ? (opts.deck ?? deckOf(game, id, kind)) : "a";
  const leavingPlay = isInPlay(c) && !IN_PLAY.includes(zone) && !opts.keep;
  removeFromPile(game, id);
  // what lies beneath it is discarded when it goes for good (not while it resolves, nor to the void)
  if (
    isInPlay(c) &&
    !IN_PLAY.includes(zone) &&
    zone !== ZONE.Limbo &&
    zone !== ZONE.Void &&
    def(game, id).beneathOnLeave !== "stay"
  )
    for (const under of [...pileRead(game.s, `beneath:${id}`)])
      // an enemy's swarm cards go back to the bottom of their owners' decks
      moveCard(
        game,
        under,
        card(game, under).owner
          ? c.zone === ZONE.Enemy
            ? ZONE.Deck
            : ZONE.Discard
          : ZONE.EncounterDiscard,
        { inv: card(game, under).owner },
      );
  if (leavingPlay) {
    // discard attachments; to the void a card keeps them (Shadow-spawned stays on the Hunting Horror), its tokens go
    for (const other of allCardRecs(game)) {
      if (
        zone !== ZONE.Void &&
        (other.attachedTo === id ||
          (other.zone === "attached" && other.location === id && c.zone === "location"))
      ) {
        moveCard(game, other.id, other.owner ? ZONE.Discard : ZONE.EncounterDiscard, {
          inv: other.owner,
        });
      }
    }
    clearTokens(game, id);
    // a card that re-enters play is a new copy: its "limit per period" starts unused (Grimoire, Limits and Maximums)
    for (const k of Object.keys(game.s.usage)) if (k.startsWith(`${id}:`)) delete game.s.usage[k];
    Object.assign(c, {
      exhausted: false,
      damage: 0,
      horror: 0,
      clues: 0,
      doom: 0,
      uses: 0,
      resources: 0,
      engagedWith: null,
      attachedTo: null,
    });
    if (c.owner) c.controller = c.owner;
  }
  // a location leaving the map forgets its cell and its links; one entering it takes a cell
  if (c.zone === ZONE.Location && zone !== ZONE.Location) forgetPlace(game, id);
  const entersMap = c.zone !== ZONE.Location && zone === ZONE.Location;
  c.zone = zone;
  if (entersMap) takeCell(game, id);
  if (zone !== "enemy" && zone !== "attached") c.location = opts.location ?? null;
  else if (opts.location !== undefined) c.location = opts.location;
  if (zone !== "enemy") c.engagedWith = null;
  const owner = opts.inv ?? c.owner;
  const at = (arr: InstId[]) => (opts.top ? arr.unshift(id) : arr.push(id));
  switch (zone) {
    case "deck":
    case "hand":
    case "discard":
      if (!owner) throw new Error(`card ${id} has no owner for ${zone}`);
      // discard pile: last = top; deck: index 0 = top
      if (zone === "deck") at(pileRec(game, `deck:${owner}`));
      else if (zone === "discard") pileRec(game, `discard:${owner}`).push(id);
      else pileRec(game, `hand:${owner}`).push(id);
      break;
    case "encounterDeck":
      at(pileRec(game, PILE.EncounterDeck));
      break;
    case "encounterDiscard":
      pileRec(game, PILE.EncounterDiscard).push(id);
      break;
    case "act":
      game.s.acts[deck] = id;
      break;
    case "agenda":
      game.s.agendas[deck] = id;
      break;
    case "actDeck":
    case "agendaDeck":
      at(pileRec(game, deckPile(kind!, deck)));
      break;
    case "sideDeck":
      if (!opts.deck) throw new Error(`card ${id} put in no side deck`);
      at(pileRec(game, `sideDeck:${opts.deck}`));
      break;
    case "beneath":
      if (!opts.location) throw new Error(`card ${id} put beneath no card`);
      at(pileRec(game, `beneath:${opts.location}`));
      break;
  }
}

/** shuffle a card into its owner's deck */
export function shuffleIntoDeck(game: GameContext, id: InstId, owner: InvId) {
  moveCard(game, id, ZONE.Deck, { inv: owner });
  shuffleDeck(game, owner);
  emit(
    game,
    EVENT.Shuffle,
    `${def(game, id).name} is shuffled into ${invName(game, owner)}'s deck`,
    {
      inv: owner,
      card: id,
    },
  );
}

/** an investigator's deck and discard pile, or the encounter deck and discard */
const pilesOf = (game: GameContext, owner: InvId | "encounter") =>
  owner === "encounter"
    ? {
        deck: pileRec(game, PILE.EncounterDeck),
        discard: pileRec(game, PILE.EncounterDiscard),
        zone: "encounterDeck" as const,
      }
    : {
        deck: pileRec(game, `deck:${owner}`),
        discard: pileRec(game, `discard:${owner}`),
        zone: "deck" as const,
      };

/** the discard pile goes back into its deck, in its order, and the deck is shuffled */
export function reshuffleDiscard(game: GameContext, owner: InvId | "encounter") {
  const p = pilesOf(game, owner);
  for (const id of p.discard.slice())
    moveCard(game, id, p.zone, owner === "encounter" ? {} : { inv: owner });
  shuffleDeck(game, owner);
}

/** the top `n` cards of an investigator's deck (or the encounter deck) to its discard pile, as many as it holds; returns them */
export function discardTop(game: GameContext, owner: InvId | "encounter", n: number): InstId[] {
  const p = pilesOf(game, owner);
  const ids = p.deck.slice(0, Math.max(0, n));
  for (const id of ids) {
    moveCard(game, id, owner === "encounter" ? ZONE.EncounterDiscard : ZONE.Discard, {
      inv: owner === "encounter" ? null : owner,
    });
    emit(game, EVENT.Discard, `${def(game, id).name} is discarded`, {
      card: id,
      ...(owner === "encounter" ? {} : { inv: owner }),
    });
  }
  return ids;
}

/** put cards on top of an investigator's deck from wherever they are, `ids[0]` ending on top */
export function putOnTop(game: GameContext, owner: InvId, ids: InstId[]) {
  for (const id of ids.slice().reverse()) moveCard(game, id, ZONE.Deck, { inv: owner, top: true });
}

/** take cards out of an investigator's deck, shuffle the rest, and put them back on top, `ids[0]` on top */
export function shuffleThenTop(game: GameContext, owner: InvId, ids: InstId[]) {
  for (const id of ids) moveCard(game, id, ZONE.Limbo);
  shuffleDeck(game, owner);
  putOnTop(game, owner, ids);
}

/** discard a card to its owner's discard pile or the encounter discard */
export function discard(game: GameContext, id: InstId) {
  const c = card(game, id);
  const d = def(game, id);
  if (c.owner) moveCard(game, id, ZONE.Discard, { inv: c.owner });
  else moveCard(game, id, ZONE.EncounterDiscard);
  // a card that cannot leave play stayed
  if (isInPlay(card(game, id))) return;
  emit(game, EVENT.Discard, `${d.name} is discarded`, { card: id });
}

/** the code of a card's other printed face (`X` ↔ `Xb`, `Xa` ↔ `Xb`), when the content has one */
export const otherFace = (game: GameContext, code: string): string | undefined =>
  game.db.cards[code]?.back ?? game.db.cards[code]?.front;

/**
 * the zone a card's new face lives in, from the zone it was in; an asset no one controls that is at a location (a
 * story asset, The Last King's Bystanders) is attached there
 */
function zoneForFace(type: string, from: Zone, atLocation: boolean): Zone {
  switch (type) {
    case "enemy":
      return ZONE.Enemy;
    case "location":
      return ZONE.Location;
    case "asset":
      return from === ZONE.Play || from === ZONE.Threat || from === ZONE.Attached
        ? from
        : atLocation
          ? ZONE.Attached
          : ZONE.Play;
    case "story":
      // out of the play area, still where it was
      return ZONE.SetAside;
    default:
      return from;
  }
}

/**
 * Turn a card to its other printed face: the same instance, its tokens, attachments, place and controller kept, moved
 * to the zone the new face's type lives in (a story card that becomes an enemy, an asset that becomes a story card).
 */
export function flip(game: GameContext, id: InstId): boolean {
  const other = otherFace(game, card(game, id).code);
  if (!other) return false;
  becomes(game, id, other);
  return true;
}

/** the same instance shows another card (a face, a swap), moved to the zone that card's type lives in, nothing lost */
export function becomes(game: GameContext, id: InstId, code: string) {
  const c = card(game, id);
  const { location, controller } = c;
  const from = c.code;
  cardRec(game, id).code = code;
  const zone = zoneForFace(game.db.cards[code].type, c.zone, !!location && !controller);
  if (zone !== c.zone) moveCard(game, id, zone, { keep: true, location, inv: controller });
  cardRec(game, id).controller = controller;
  emit(game, EVENT.Flip, `${game.db.cards[from].name} flips: ${game.db.cards[code].name}`, {
    card: id,
  });
}

/** put a card facedown beneath another (at the bottom of its pile), out of play */
export const putBeneath = (game: GameContext, id: InstId, holder: InstId) =>
  moveCard(game, id, ZONE.Beneath, { location: holder });

/** the pile beneath one card goes beneath another (an act's or agenda's pile passing to the next one) */
export function passBeneath(game: GameContext, from: InstId, to: InstId) {
  for (const id of [...pileRead(game.s, `beneath:${from}`)]) putBeneath(game, id, to);
}

// ---------- the map (engine-location-instances-grid) ----------
const sameCell = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];
/** is a cell held by a location in play (other than `but`) */
function cellTaken(game: GameContext, cell: [number, number], but?: InstId): boolean {
  const t = game.s.world.tables;
  return Object.entries(t.cell).some(
    ([id, c]) => id !== but && sameCell(c, cell) && card(game, id).zone === ZONE.Location,
  );
}
/**
 * A location entering play takes a cell: the one asked for when it is free, else its card's cell in the scenario's
 * layout when free, else the next free cell of the spare row below the map.
 */
export function takeCell(game: GameContext, id: InstId, want?: [number, number]) {
  const t = game.s.world.tables;
  const scen = game.db.scenarios[game.s.scenarioId];
  const printed = scen?.layout?.[card(game, id).code];
  const pick = [want, printed].find((c): c is [number, number] => !!c && !cellTaken(game, c, id));
  if (pick) {
    t.cell[id] = [pick[0], pick[1]];
    return;
  }
  const row = Math.max(3, ...Object.values(scen?.layout ?? {}).map((c) => c[1] + 1));
  let col = 0;
  while (cellTaken(game, [col, row], id)) col++;
  t.cell[id] = [col, row];
}
/** the location moves to a cell (free or not: the caller checks) */
export const setCell = (game: GameContext, id: InstId, cell: [number, number]) =>
  void (game.s.world.tables.cell[id] = [cell[0], cell[1]]);
/** a location leaving the map: its cell is free again and its links are gone, at both ends */
export function forgetPlace(game: GameContext, id: InstId) {
  const t = game.s.world.tables;
  const freed = t.cell[id];
  delete t.cell[id];
  // a location pushed aside because this one held its layout cell takes that cell now (The Gathering: the Hallway
  // enters play before the Study leaves [0,0])
  const layout = game.db.scenarios[game.s.scenarioId]?.layout ?? {};
  if (freed)
    for (const [other, cell] of Object.entries(t.cell)) {
      const printed = layout[card(game, other).code];
      if (printed && sameCell(printed, freed) && !sameCell(cell, printed)) {
        t.cell[other] = [freed[0], freed[1]];
        break;
      }
    }
  for (const table of [t.links, t.oneWay]) {
    delete table[id];
    for (const [k, v] of Object.entries(table)) {
      const rest = v.filter((x) => x !== id);
      if (rest.length) table[k] = rest;
      else delete table[k];
    }
  }
}
/** a two-way link between two location instances */
export function link(game: GameContext, a: InstId, b: InstId) {
  const t = game.s.world.tables.links;
  if (a === b) return;
  t[a] = [...new Set([...(t[a] ?? []), b])];
  t[b] = [...new Set([...(t[b] ?? []), a])];
}
/** a one-way link: from `a` to `b` only */
export function linkOneWay(game: GameContext, a: InstId, b: InstId) {
  const t = game.s.world.tables.oneWay;
  if (a !== b) t[a] = [...new Set([...(t[a] ?? []), b])];
}
/** remove the links between two location instances, both ways */
export function unlink(game: GameContext, a: InstId, b: InstId) {
  const t = game.s.world.tables;
  for (const table of [t.links, t.oneWay])
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const rest = (table[x] ?? []).filter((z) => z !== y);
      if (rest.length) table[x] = rest;
      else delete table[x];
    }
}
