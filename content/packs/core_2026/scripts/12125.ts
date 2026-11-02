// Unspeakable Truths — into your threat area, limit 1 per investigator
import {
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  push,
  threatArea,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    intoThreat(game: GameContext, ctx: EffCtx) {
      const code = card(game, ctx.source!).code;
      if (threatArea(game, ctx.you!).some((c) => c.code === code)) return;
      push(game, { t: STEP.Eff, effect: { op: "putInThreatArea" }, ctx });
    },
  },
} satisfies CardScript;
