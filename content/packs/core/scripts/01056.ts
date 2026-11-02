// Sure Gamble — the revealed token's "-" becomes a "+"
import {
  type CardScript,
  currentTest,
  emit,
  flipNegativeTokens,
  type GameContext,
  EVENT,
} from "../../../../src/engine/api";

export default {
  fns: {
    flip(game: GameContext) {
      const t = currentTest(game);
      if (!t) return;
      // ponytail: flips every negative token of the test; only one is ever revealed when this is played
      flipNegativeTokens(game);
      emit(game, EVENT.Modify, "The chaos token's modifier becomes positive", { inv: t.inv });
    },
  },
} satisfies CardScript;
