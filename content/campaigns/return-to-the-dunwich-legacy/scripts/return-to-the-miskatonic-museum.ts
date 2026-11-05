// Return to The Miskatonic Museum (setup card 51020): the base scenario's script, with the box's rules over it — the two
// new Exhibit Halls join the deck before 2 random halls (never the Restricted Hall) leave the game, and agendas 1b and
// 2b resolve with the next agenda's forced ability active (the agendas' own scripts read the flag)
import {
  type CardScript,
  composeScript,
  flags,
  type GameContext,
  shuffleList,
  findByCode,
  moveCard,
  ZONE,
} from "../../../../src/engine/api";
import base, { buildExhibitDeck } from "../../the-dunwich-legacy/scripts/the-miskatonic-museum";
import { NEXT_AGENDA_FORCED } from "../../../packs/dwl/scripts/02119";

const HALLS = ["02132", "02133", "02134", "02135", "02136", "51021", "51022"];

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    /** "add the 2 new Exhibit Hall locations … set the Restricted Hall aside and randomly remove 2 Exhibit Hall
     * locations from the game. Then, continue creating the Exhibit Deck as normal" */
    exhibitDeck(game: GameContext) {
      const halls = [...HALLS];
      shuffleList(game, halls);
      for (const code of halls.slice(0, 2)) {
        const hall = findByCode(game, code, [ZONE.SetAside]);
        if (hall) moveCard(game, hall.id, ZONE.Removed);
      }
      buildExhibitDeck(game, halls.slice(2));
    },
    nextAgendaForced(game: GameContext) {
      flags.setNamed(game, NEXT_AGENDA_FORCED, true);
    },
  },
};

export default composeScript(base, returnTo);
