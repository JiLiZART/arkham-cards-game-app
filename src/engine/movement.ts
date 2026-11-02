import { allCardRecs, cardRec, pileKey, pileRec, pilesNamed, putCardIn } from "./world/store";
import type { CardInst, GameContext, InstId, InvId, PileName, Zone } from "./world/types";
import { card, def, emit, invName, nextId, shuffleDeck } from "./context";
import { EVENT } from "./events/event";
import { ZONE, PILE } from "./world/constants";

/** Creating cards and moving them between zones and piles (ADR-0023, ADR-0025). */

/** create a new card instance (setup, or cards entering the game mid-scenario) */
export function createCard(
  game: GameContext,
  code: string,
  zone: Zone,
  owner: InvId | null = null,
): InstId {
  if (!game.db.cards[code]) throw new Error(`unknown card ${code}`);
  const id = nextId(game);
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
  // the pile the zone and owner name; a card put in another investigator's pile (or a side deck, whose name isn't in
  // the zone) is found by its kind
  const named = pileKey(c.zone, c.owner);
  if (!take(named)) {
    const kind =
      c.zone === "deck" || c.zone === "hand" || c.zone === "discard"
        ? `${c.zone}:`
        : c.zone === "sideDeck"
          ? "sideDeck:"
          : null;
    if (kind) for (const name of pilesNamed(game.s, kind)) if (take(name)) break;
  }
  if (game.s.act === id) game.s.act = null;
  if (game.s.agenda === id) game.s.agenda = null;
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
  zone: Zone,
  opts: { inv?: InvId | null; top?: boolean; location?: InstId | null } = {},
) {
  const c = cardRec(game, id);
  const leavingPlay = isInPlay(c) && !IN_PLAY.includes(zone);
  removeFromPile(game, id);
  if (leavingPlay) {
    // discard attachments
    for (const other of allCardRecs(game)) {
      if (
        other.attachedTo === id ||
        (other.zone === "attached" && other.location === id && c.zone === "location")
      ) {
        moveCard(game, other.id, other.owner ? ZONE.Discard : ZONE.EncounterDiscard, {
          inv: other.owner,
        });
      }
    }
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
  c.zone = zone;
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
      game.s.act = id;
      break;
    case "agenda":
      game.s.agenda = id;
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
  emit(game, EVENT.Discard, `${d.name} is discarded`, { card: id });
}
