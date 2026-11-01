// Sure Gamble — the revealed token's "-" becomes a "+"
import {
  type CardScript,
  currentTest,
  emit,
  flipNegativeTokens,
  type G,
} from "../../../../src/engine/api";

export default {
  fns: {
    flip(g: G) {
      const t = currentTest(g);
      if (!t) return;
      // ponytail: flips every negative token of the test; only one is ever revealed when this is played
      flipNegativeTokens(g);
      emit(g, "modify", "The chaos token's modifier becomes positive", { inv: t.inv });
    },
  },
} satisfies CardScript;
