// Unspeakable Truths — into your threat area, limit 1 per investigator
import {
  card,
  type CardScript,
  type GameContext,
  threatArea,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  fns: {
    intoThreat(game: GameContext, run: ScriptRun) {
      const code = card(game, run.source).code;
      if (threatArea(game, run.you).some((c) => c.code === code)) return;
      queue(game, resolveEffect({ effect: { op: "putInThreatArea" }, ctx: run.ctx }));
    },
  },
} satisfies CardScript;
