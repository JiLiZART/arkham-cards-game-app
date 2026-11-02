// Umôrdhoth — readies at the end of each investigator's turn
import { type CardScript, type EffCtx, type GameContext, ready } from "../../../../src/engine/api";

export default {
  fns: {
    ready(game: GameContext, ctx: EffCtx) {
      ready(game, ctx.source!);
    },
  },
} satisfies CardScript;
