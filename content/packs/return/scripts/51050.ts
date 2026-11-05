// Abandoned Camp (Return to Where Doom Awaits, a Diverging Path) — forced after you reveal it: its symbol links (the
// scenario's `wdaRelink`), then lose 2 resources for each action you have performed this round
import {
  type CardScript,
  type GameContext,
  inv,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

export default {
  fns: {
    ...SHARED.fns,
    campLoss(game: GameContext, run: ScriptRun) {
      const who = run.ctx.inv ?? run.you;
      // the actions taken this round, the one that revealed it included
      const n = 2 * inv(game, who).actionsThisRound.length;
      if (n)
        queue(
          game,
          resolveEffect({
            effect: { op: "loseResources", amount: n },
            ctx: { you: who, inv: who, source: run.source },
          }),
        );
    },
  },
} satisfies CardScript;
