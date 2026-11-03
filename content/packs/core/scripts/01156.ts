// Ritual Site — at the end of the round, refill to 2 clues per investigator
import {
  card,
  type CardScript,
  type GameContext,
  setCounter,
  turnOrder,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "roundEnds", run: "refill" }],
  fns: {
    refill(game: GameContext, run: ScriptRun) {
      const c = card(game, run.source);
      const want = 2 * turnOrder(game).length;
      if (c.zone === "location" && c.clues < want) setCounter(game, c.id, "clues", want);
    },
  },
} satisfies CardScript;
