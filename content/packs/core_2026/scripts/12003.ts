// In Harm's Way — worn out at 3 damage; 1 physical trauma when the game ends
import {
  addCounter,
  card,
  cardIf,
  type CardScript,
  discard,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  fns: {
    worn(g: G, ctx: EffCtx) {
      const c = cardIf(g, ctx.source!);
      if (c?.zone === "threat" && c.damage >= 3) discard(g, c.id);
    },
  },
  hooks: {
    gameEnd(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      if (c.zone === "threat" && c.controller) addCounter(g, c.controller, "physicalTrauma", 1);
    },
  },
} satisfies CardScript;
