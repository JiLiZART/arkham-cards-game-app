import type { ChoiceOption, GameState, InstId, InvId } from "../engine/types";

/** where an option of the pending choice is offered on screen (there is no option sidebar) */
export type OptionHome =
  | "hand"
  | "board"
  | "strip"
  | "avatar"
  | "invModal"
  | "rail"
  | "bar"
  | "skilltest"
  | "mulligan"
  | "phase"
  | "showcase";

/** the options of no card that are something to do on the turn; every other option of no card answers the question in the bar */
const RAIL_KINDS = new Set(["draw", "resource", "investigate"]);
const kindOf = (o: ChoiceOption) => (o.value as { kind?: string } | null)?.kind;

const STRIP_ZONES = new Set([
  "act",
  "agenda",
  "victory",
  "encounterDiscard",
  "encounterDeck",
  "sideDeck",
]);
const BOARD_ZONES = new Set(["location", "enemy", "attached", "play", "threat", "resolving"]);

/** the investigator whose card this is, if it is an investigator card */
const investigatorOf = (s: GameState, card: string): InvId | undefined =>
  s.order.find((i) => s.invs[i].cardId === card);

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
  // an investigator card (a choice among investigators, or an ability on their card): the avatars in the player bar
  if (inv) return "avatar";
  // whose card it is: hand cards by owner, cards in play / threat area by controller
  const holder =
    c.zone === "hand" ? c.owner : c.zone === "play" || c.zone === "threat" ? c.controller : null;
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
  optionHome(o, s, viewer) === "rail" ||
  (s.pending?.kind === "turn" && kindOf(o) === "investigate");

/** the investigator whose modal shows an "invModal" option */
export function optionOwner(o: ChoiceOption, s: GameState): InvId | null {
  if (!o.card || !s.cards[o.card]) return null;
  const c = s.cards[o.card];
  return investigatorOf(s, o.card) ?? (c.zone === "hand" ? c.owner : c.controller) ?? null;
}

/**
 * A pending choice that picks one of the deck or discard cards the viewer is looking at (a search, the top cards, the
 * discard pile, Scrying's look at any deck): its card options, and the cards shown beside them, are laid out large in the
 * showcase area, in the order they lie in their pile. Returns those card ids, or [] when the choice is anything else.
 */
export function deckPick(game: GameState, viewer: InvId | null): InstId[] {
  const p = game.pending;
  if (!p || p.inv !== viewer || p.kind !== "generic") return [];
  const cards = [...p.options.flatMap((o) => o.card ?? []), ...(p.shown ?? [])];
  const pile = (id: InstId) => {
    const c = game.cards[id];
    if (c?.zone === "encounterDeck") return game.encounterDeck;
    if (c?.zone === "deck" && c.owner) return game.invs[c.owner].deck;
    return c?.zone === "discard" && c.owner === viewer ? game.invs[viewer].discard : null;
  };
  if (!cards.length || !cards.every(pile)) return [];
  return cards.sort((a, b) => pile(a)!.indexOf(a) - pile(b)!.indexOf(b));
}

/**
 * The instruction bar's buttons. On the desktop: the options that answer the question (Done, Pass, End turn…). On the
 * phone (ADR-0005) the bar also takes the rail's actions (no rail there) and the act's and agenda's options (their
 * cards sit in the closed left drawer).
 */
export function inBar(
  o: ChoiceOption,
  s: GameState,
  viewer: InvId | null,
  mode: "desktop" | "phone",
): boolean {
  const home = optionHome(o, s, viewer);
  if (home === "bar") return true;
  return mode === "phone" && (home === "strip" || onRail(o, s, viewer));
}
