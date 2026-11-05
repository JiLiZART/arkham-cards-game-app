// Return to Undimensioned and Unseen (setup card 51041): the base scenario's script, with the box's rules over it — 4
// of the 5 original Brood of Yog-Sothoth replaced by the box's 4 versions; a Brood put into play is chosen at random
// among the set-aside versions (the base's `nextBrood` and setup do that once the versions differ)
import {
  type CardScript,
  cardsIn,
  composeScript,
  type GameContext,
  moveCard,
  ZONE,
} from "../../../../src/engine/api";
import base, { BROOD } from "../../the-dunwich-legacy/scripts/undimensioned-and-unseen";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    /** "Remove 4 copies of Brood of Yog-Sothoth from the original scenario and replace them with the 4 new versions" */
    rtuauBroods(game: GameContext) {
      const originals = cardsIn(game, ZONE.SetAside).filter((c) => c.code === BROOD);
      for (const c of originals.slice(1)) moveCard(game, c.id, ZONE.Removed);
    },
  },
};

export default composeScript(base, returnTo);
