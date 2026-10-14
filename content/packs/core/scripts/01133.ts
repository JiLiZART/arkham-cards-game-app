// Graveyard — failing its test may move you to Rivertown
import { locationByName, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    moveToRivertown(g: G, ctx: EffCtx) {
      const r = locationByName(g, "Rivertown");
      if (r) push(g, { t: "Move", inv: ctx.you!, to: r.id });
    },
  },
} satisfies CardScript;
