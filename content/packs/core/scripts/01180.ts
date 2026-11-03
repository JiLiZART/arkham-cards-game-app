// Goat Spawn — when defeated, each investigator at its location takes 1 horror
import {
  card,
  invsAt,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enemyDefeatedSelf", run: "bleat" }],
  fns: {
    bleat(game: GameContext, run: ScriptRun) {
      for (const i of invsAt(game, card(game, run.source).location)) {
        push(game, {
          t: STEP.AssignDamage,
          inv: i,
          damage: 0,
          horror: 1,
          direct: false,
          source: run.ctx.source ?? null,
        });
      }
    },
  },
} satisfies CardScript;
