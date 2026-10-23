// Disc of Itzamna — discard the non-Elite enemy that just spawned at your location
import { discard, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    discardEnemy(g: G, ctx: EffCtx) {
      if (ctx.enemy && g.s.cards[ctx.enemy]?.zone === "enemy") discard(g, ctx.enemy);
    },
  },
} satisfies CardScript;
