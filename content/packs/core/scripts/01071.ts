// Grotesque Statue — reveal 2 chaos tokens instead of 1 and resolve the one chosen
import { addExtraReveal, type CardScript, type G } from "../../../../src/engine/api";

export default {
  fns: {
    twoTokens(g: G) {
      addExtraReveal(g);
    },
  },
} satisfies CardScript;
