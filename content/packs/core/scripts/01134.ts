// Northside — gain 2 clues from the token pool
import {
  addCounter,
  type CardScript,
  type EffCtx,
  emit,
  type GameContext,
  inv,
  EVENT,
} from "../../../../src/engine/api";

export default {
  fns: {
    gainClues(game: GameContext, ctx: EffCtx) {
      addCounter(game, ctx.you!, "clues", 2);
      emit(game, EVENT.Clues, `${inv(game, ctx.you!).name} gains 2 clues`, {
        inv: ctx.you!,
        data: { n: 2 },
      });
    },
  },
} satisfies CardScript;
