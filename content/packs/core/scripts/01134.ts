// Northside — gain 2 clues from the token pool
import {
  addCounter,
  type CardScript,
  emit,
  type GameContext,
  inv,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    gainClues(game: GameContext, run: ScriptRun) {
      addCounter(game, run.you, "clues", 2);
      emit(game, EVENT.Clues, `${inv(game, run.you).name} gains 2 clues`, {
        inv: run.you,
        data: { n: 2 },
      });
    },
  },
} satisfies CardScript;
