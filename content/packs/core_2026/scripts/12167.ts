// Eager for Death — test willpower (2), +1 difficulty per damage on you; fail: 2 horror
import {
  inv,
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "eager" }],
  fns: {
    eager(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: 2 + inv(game, run.you).damage,
            onFail: [{ op: "takeHorror", amount: 2 }],
          },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
