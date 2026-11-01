// Unspeakable Truths — into your threat area, limit 1 per investigator
import {
  card,
  type CardScript,
  type EffCtx,
  type G,
  push,
  threatArea,
} from "../../../../src/engine/api";

export default {
  fns: {
    intoThreat(g: G, ctx: EffCtx) {
      const code = card(g, ctx.source!).code;
      if (threatArea(g, ctx.you!).some((c) => c.code === code)) return;
      push(g, { t: "Eff", effect: { op: "putInThreatArea" }, ctx });
    },
  },
} satisfies CardScript;
