// Queen's Knight — when it takes damage, 1 damage to Elokoss
import {
  enemies,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    knight(game: GameContext, run: ScriptRun) {
      if (run.ctx.enemy !== run.ctx.source) return;
      const queen = enemies(game).find((e) => e.code === "12179" || e.code === "12179b");
      if (queen)
        push(game, {
          t: STEP.DamageEnemy,
          enemy: queen.id,
          amount: 1,
          by: null,
          source: run.ctx.source,
        });
    },
  },
} satisfies CardScript;
