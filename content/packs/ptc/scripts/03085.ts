// Descent into Madness — surge; revelation: if you have at least 3 horror on you, lose 1 action.
import {
  type CardScript,
  type GameContext,
  inv,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "descent" }],
  fns: {
    descent(game: GameContext, run: ScriptRun) {
      if (inv(game, run.you).horror < 3) return;
      queue(
        game,
        resolveEffect({
          effect: { op: "loseActions", amount: 1 },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
