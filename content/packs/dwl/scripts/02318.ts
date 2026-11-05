// Close the Rift (Lost in Time and Space, act 3) — its action is in cards.json (the scenario's `litasExplore`), its clues
// spent only by the investigators at The Edge of the Universe (`actSpendAt`); back: the Edge out of the game (its
// investigators and enemies to Another Dimension), the set-aside Tear Through Time into play
import {
  type CardScript,
  type GameContext,
  queue,
  removeLocation,
} from "../../../../src/engine/api";
import {
  EDGE,
  inPlay,
  SHARED,
  TEAR_THROUGH_TIME,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";
import { putAside } from "./02316";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      putAside(game, TEAR_THROUGH_TIME);
      const edge = inPlay(game, EDGE);
      if (edge) queue(game, removeLocation({ location: edge, outOfGame: true }));
    },
  },
} satisfies CardScript;
