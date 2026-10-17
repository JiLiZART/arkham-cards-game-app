import { useGame } from "./context";
import { choicesOffered, shownInv } from "./players";
import { useView } from "./view";

/** the investigator whose table is on screen (ADR-0004): the one being looked at, else the deciding investigator */
export function useShown() {
  const game = useGame((s) => s.game);
  const viewing = useView((s) => s.viewing);
  return game ? shownInv(game, { viewing }) : null;
}

/** true while the deciding investigator's table is on screen: only then are choices offered */
export function useChoicesOffered() {
  const game = useGame((s) => s.game);
  const viewing = useView((s) => s.viewing);
  return !!game && choicesOffered(game, { viewing });
}
