// Ashen Rebirth — 2 direct damage or 2 direct horror, whichever you have more of
import {
  inv,
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    rebirth(game: GameContext, ctx: EffCtx) {
      const me = inv(game, ctx.you!);
      // ponytail: a tie takes damage; the card leaves it to the player
      const damage = me.damage >= me.horror;
      push(game, {
        t: STEP.AssignDamage,
        inv: ctx.you!,
        damage: damage ? 2 : 0,
        horror: damage ? 0 : 2,
        direct: true,
        source: ctx.source ?? null,
      });
    },
  },
} satisfies CardScript;
