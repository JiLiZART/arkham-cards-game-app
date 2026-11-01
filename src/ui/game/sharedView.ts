import type { GameState, InstId } from "../../engine/types";
import type { ShownView } from "../../net/transport";
import type { Modal } from "../state/view";
import { cardOfIf } from "../../engine/core";

/** a full-size view the whole room may be shown (online play): table cards, never an investigator's own */
export type SharedView = ShownView;

/** the act, agenda and reference decks, and a card no investigator owns that is on this table */
export function sharedView(game: Pick<GameState, "cards">, m: Modal): m is SharedView {
  if (!m) return false;
  if ("deck" in m) return true;
  return "card" in m && cardOfIf(game, m.card)?.owner === null;
}
