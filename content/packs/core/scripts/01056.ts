// Sure Gamble — the revealed token's "-" becomes a "+"
import { emit, type CardScript, type G } from "../../../../src/engine/api";

export default {
  fns: {
    flip(g: G) {
      const t = g.s.skillTest;
      if (!t) return;
      // ponytail: flips every negative token of the test; only one is ever revealed when this is played
      t.flipNegative = true;
      emit(g, "modify", "The chaos token's modifier becomes positive", { inv: t.inv });
    },
  },
} satisfies CardScript;
