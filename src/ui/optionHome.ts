import type { ChoiceOption, GameState, InvId } from "../engine/types";

/** where an option of the pending choice is offered on screen (there is no option sidebar) */
export type OptionHome = "hand" | "board" | "strip" | "portrait" | "invModal" | "rail" | "skilltest";

const STRIP_ZONES = new Set(["act", "agenda", "victory", "encounterDiscard", "encounterDeck", "sideDeck"]);
const BOARD_ZONES = new Set(["location", "enemy", "attached", "play", "threat", "resolving"]);

/** the investigator whose card this is, if it is an investigator card */
const investigatorOf = (s: GameState, card: string): InvId | undefined => s.order.find((i) => s.invs[i].cardId === card);

export function optionHome(o: ChoiceOption, s: GameState, viewer: InvId | null): OptionHome {
  if (!o.card || !s.cards[o.card]) return "rail";
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
  return "rail";
}

/** the investigator whose modal shows an "invModal" option */
export function optionOwner(o: ChoiceOption, s: GameState): InvId | null {
  if (!o.card || !s.cards[o.card]) return null;
  const c = s.cards[o.card];
  return investigatorOf(s, o.card) ?? (c.zone === "hand" ? c.owner : c.controller) ?? null;
}
