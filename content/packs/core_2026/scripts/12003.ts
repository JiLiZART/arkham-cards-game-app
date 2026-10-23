// In Harm's Way — worn out at 3 damage; 1 physical trauma when the game ends
import {
  card,
  discard,
  inv,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  fns: {
    worn(g: G, ctx: EffCtx) {
      const c = g.s.cards[ctx.source!];
      if (c?.zone === "threat" && c.damage >= 3) discard(g, c.id);
    },
  },
  hooks: {
    gameEnd(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      if (c.zone === "threat" && c.controller) inv(g, c.controller).physicalTrauma++;
    },
  },
} satisfies CardScript;
