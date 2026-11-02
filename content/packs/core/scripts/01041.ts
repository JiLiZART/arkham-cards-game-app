// Disc of Itzamna — discard the non-Elite enemy that just spawned at your location
import {
  cardIf,
  type CardScript,
  discard,
  type EffCtx,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  fns: {
    discardEnemy(game: GameContext, ctx: EffCtx) {
      if (ctx.enemy && cardIf(game, ctx.enemy)?.zone === "enemy") discard(game, ctx.enemy);
    },
  },
} satisfies CardScript;
