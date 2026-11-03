// Umôrdhoth — readies at the end of each investigator's turn
import {
  type CardScript,
  type GameContext,
  ready,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    ready(game: GameContext, run: ScriptRun) {
      ready(game, run.source);
    },
  },
} satisfies CardScript;
