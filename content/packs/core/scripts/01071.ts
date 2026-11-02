// Grotesque Statue — reveal 2 chaos tokens instead of 1 and resolve the one chosen
import { addExtraReveal, type CardScript, type GameContext } from "../../../../src/engine/api";

export default {
  fns: {
    twoTokens(game: GameContext) {
      addExtraReveal(game);
    },
  },
} satisfies CardScript;
