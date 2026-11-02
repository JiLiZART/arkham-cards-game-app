// Goat Spawn — when defeated, each investigator at its location takes 1 horror
import {
  card,
  invsAt,
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enemyDefeatedSelf", run: "bleat" }],
  fns: {
    bleat(game: GameContext, ctx: EffCtx) {
      for (const i of invsAt(game, card(game, ctx.source!).location)) {
        push(game, {
          t: STEP.AssignDamage,
          inv: i,
          damage: 0,
          horror: 1,
          direct: false,
          source: ctx.source ?? null,
        });
      }
    },
  },
} satisfies CardScript;
