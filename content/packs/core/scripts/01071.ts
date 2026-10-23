// Grotesque Statue — reveal 2 chaos tokens instead of 1 and resolve the one chosen
import { type CardScript, type G } from "../../../../src/engine/api";

export default {
  fns: {
    twoTokens(g: G) {
      if (g.s.skillTest) g.s.skillTest.extraReveal = (g.s.skillTest.extraReveal ?? 0) + 1;
    },
  },
} satisfies CardScript;
