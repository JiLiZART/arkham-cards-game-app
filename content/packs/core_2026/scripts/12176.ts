// Ashen Rebirth — 2 direct damage or 2 direct horror, whichever you have more of
import {
  inv,
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

export default {
  fns: {
    rebirth(game: GameContext, run: ScriptRun) {
      const me = inv(game, run.you);
      // ponytail: a tie takes damage; the card leaves it to the player
      const damage = me.damage >= me.horror;
      queue(
        game,
        dealDamage({
          inv: run.you,
          damage: damage ? 2 : 0,
          horror: damage ? 0 : 2,
          direct: true,
          source: run.ctx.source ?? null,
        }),
      );
    },
  },
} satisfies CardScript;
