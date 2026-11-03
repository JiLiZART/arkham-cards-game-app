// Eager for Death — test willpower (2), +1 difficulty per damage on you; fail: 2 horror
import {
  inv,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "eager" }],
  fns: {
    eager(game: GameContext, run: ScriptRun) {
      push(game, {
        t: STEP.Eff,
        effect: {
          op: "skillTest",
          skill: "willpower",
          difficulty: 2 + inv(game, run.you).damage,
          onFail: [{ op: "takeHorror", amount: 2 }],
        },
        ctx: run.ctx,
      });
    },
  },
} satisfies CardScript;
