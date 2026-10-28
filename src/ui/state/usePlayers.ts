import { useGame } from "./context";
import { choicesOffered, shownInv, type Looking } from "./players";
import { useView } from "./view";

/** the investigator whose table is on screen (ADR-0004): the one being looked at, else the deciding investigator */
export function useShown() {
  const game = useGame((s) => s.game);
  const viewing = useView((s) => s.viewing);
  const mySeats = useView((s) => s.mySeats);
  return game ? shownInv(game, { viewing, mySeats }) : null;
}

/** what the player is looking at and answering for: the input of every "is this offered here" question */
export function useLooking(): Looking {
  const viewing = useView((s) => s.viewing);
  const mySeats = useView((s) => s.mySeats);
  return { viewing, mySeats };
}

/** true while the deciding investigator's table is on screen: only then are choices offered */
export function useChoicesOffered() {
  const game = useGame((s) => s.game);
  const looking = useLooking();
  return !!game && choicesOffered(game, looking);
}
