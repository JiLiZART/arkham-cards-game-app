// Rampaging Creatures (Undimensioned and Unseen, agenda 1) — its forced "each Brood moves toward a random location" is
// in cards.json (the agendas share it); back: the encounter discard pile shuffled into the deck, and a set-aside Brood
// spawns at a random location, if able
import {
  type CardScript,
  type GameContext,
  queue,
  reshuffleDiscard,
} from "../../../../src/engine/api";
import {
  atRandom,
  broodsAside,
  SHARED,
} from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      reshuffleDiscard(game, "encounter");
      if (broodsAside(game).length) queue(game, atRandom(game, "uauSpawnBrood"));
    },
  },
} satisfies CardScript;
