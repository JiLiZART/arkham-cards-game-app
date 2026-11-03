// Goat Spawn — when defeated, each investigator at its location takes 1 horror
import {
  card,
  invsAt,
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enemyDefeatedSelf", run: "bleat" }],
  fns: {
    bleat(game: GameContext, run: ScriptRun) {
      for (const i of invsAt(game, card(game, run.source).location)) {
        queue(
          game,
          dealDamage({
            inv: i,
            damage: 0,
            horror: 1,
            direct: false,
            source: run.ctx.source ?? null,
          }),
        );
      }
    },
  },
} satisfies CardScript;
