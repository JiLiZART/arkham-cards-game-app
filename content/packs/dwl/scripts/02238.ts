// Biding Its Time (Undimensioned and Unseen, agenda 2) — its forced "each Brood moves toward a random location" is in
// cards.json; back: the encounter discard pile shuffled into the deck, then, if a Brood is set aside, it
// spawns at the lead investigator's location and attacks each investigator there who fails an agility (4) test
import { type CardScript, type GameContext, reshuffleDiscard } from "../../../../src/engine/api";
import {
  noPlaceToHide,
  SHARED,
} from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      reshuffleDiscard(game, "encounter");
      noPlaceToHide(game);
    },
  },
} satisfies CardScript;
