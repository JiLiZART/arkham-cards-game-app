import type { InstId } from "../../engine/types";
import type { ShownView } from "../../net/transport";
import type { Modal } from "../state/view";

/** a full-size view the whole room may be shown (online play): table cards, never an investigator's own */
export type SharedView = ShownView;

/** the act, agenda and reference decks, and a card no investigator owns that is on this table */
export function sharedView(
  game: { cards: Record<InstId, { owner: string | null } | undefined> },
  m: Modal,
): m is SharedView {
  if (!m) return false;
  if ("deck" in m) return true;
  return "card" in m && game.cards[m.card]?.owner === null;
}
