// Unspeakable Truths — into your threat area, limit 1 per investigator
import { push, threatArea, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    intoThreat(g: G, ctx: EffCtx) {
      const code = g.s.cards[ctx.source!].code;
      if (threatArea(g, ctx.you!).some((c) => c.code === code)) return;
      push(g, { t: "Eff", effect: { op: "putInThreatArea" }, ctx });
    },
  },
} satisfies CardScript;
