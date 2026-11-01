// Disc of Itzamna — discard the non-Elite enemy that just spawned at your location
import { cardIf, type CardScript, discard, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    discardEnemy(g: G, ctx: EffCtx) {
      if (ctx.enemy && cardIf(g, ctx.enemy)?.zone === "enemy") discard(g, ctx.enemy);
    },
  },
} satisfies CardScript;
