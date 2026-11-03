// Unspeakable Truths — into your threat area, limit 1 per investigator
import {
  card,
  type CardScript,
  type GameContext,
  push,
  threatArea,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    intoThreat(game: GameContext, run: ScriptRun) {
      const code = card(game, run.source).code;
      if (threatArea(game, run.you).some((c) => c.code === code)) return;
      push(game, { t: STEP.Eff, effect: { op: "putInThreatArea" }, ctx: run.ctx });
    },
  },
} satisfies CardScript;
