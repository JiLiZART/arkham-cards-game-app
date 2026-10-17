import type { ChoiceOption, GameState, InstId, InvId } from "../engine/types";

/** where an option of the pending choice is offered on screen (there is no option sidebar) */
export type OptionHome = "hand" | "board" | "strip" | "portrait" | "invModal" | "rail" | "bar" | "skilltest" | "mulligan" | "phase" | "showcase";

/** the options of no card that are something to do on the turn; every other option of no card answers the question in the bar */
const RAIL_KINDS = new Set(["draw", "resource", "investigate"]);
const kindOf = (o: ChoiceOption) => (o.value as { kind?: string } | null)?.kind;

const STRIP_ZONES = new Set(["act", "agenda", "victory", "encounterDiscard", "encounterDeck", "sideDeck"]);
const BOARD_ZONES = new Set(["location", "enemy", "attached", "play", "threat", "resolving"]);

/** the investigator whose card this is, if it is an investigator card */
const investigatorOf = (s: GameState, card: string): InvId | undefined => s.order.find((i) => s.invs[i].cardId === card);

export function optionHome(o: ChoiceOption, s: GameState, viewer: InvId | null): OptionHome {
  // the pause before a phase: Continue on the phase title
  if (s.pending?.kind === "phase") return "phase";
  // picking one of the viewer's deck or discard cards: the cards (and "none") in the showcase
  if (deckPick(s, viewer).length) return "showcase";
  if (!o.card || !s.cards[o.card]) return RAIL_KINDS.has(kindOf(o) ?? "") ? "rail" : "bar";
  // taking back a card picked for the mulligan: the "to redraw" row on the table
  if (s.pending?.kind === "mulligan" && o.id.startsWith("un:")) return "mulligan";
  const c = s.cards[o.card];
  const inv = investigatorOf(s, o.card);
  if (inv) return inv === viewer ? "portrait" : "invModal";
  // whose card it is: hand cards by owner, cards in play / threat area by controller
  const holder = c.zone === "hand" ? c.owner : c.zone === "play" || c.zone === "threat" ? c.controller : null;
  if (holder && holder !== viewer) return "invModal";
  // cards committed to the skill test sit in the skill-test panel (taking one back)
  if (c.zone === "commit") return "skilltest";
  if (c.zone === "hand") return "hand";
  if (STRIP_ZONES.has(c.zone)) return "strip";
  // an enemy engaged with the viewer is in their threat area; others' engaged enemies stay at their location on the map
  if (BOARD_ZONES.has(c.zone)) return "board";
  return "bar";
}

/** the action rail's buttons: Draw and Gain resource, plus Investigate beside them (its location takes it too) */
export const onRail = (o: ChoiceOption, s: GameState, viewer: InvId | null) =>
  optionHome(o, s, viewer) === "rail" || (s.pending?.kind === "turn" && kindOf(o) === "investigate");

/** the investigator whose modal shows an "invModal" option */
export function optionOwner(o: ChoiceOption, s: GameState): InvId | null {
  if (!o.card || !s.cards[o.card]) return null;
  const c = s.cards[o.card];
  return investigatorOf(s, o.card) ?? (c.zone === "hand" ? c.owner : c.controller) ?? null;
}

/**
 * A pending choice that picks one of the viewer's own deck or discard cards (a search, the top cards, the discard pile):
 * its card options are shown large in the showcase area. Returns those card ids, or [] when the choice is anything else.
 */
export function deckPick(game: GameState, viewer: InvId | null): InstId[] {
  const p = game.pending;
  if (!p || p.inv !== viewer || p.kind !== "generic") return [];
  const cards = p.options.filter((o) => o.card).map((o) => o.card!);
  const own = (id: InstId) => {
    const c = game.cards[id];
    return !!c && (c.zone === "deck" || c.zone === "discard") && c.owner === viewer;
  };
  return cards.length && cards.every(own) ? cards : [];
}
