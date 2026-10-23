// Ashen Rebirth — 2 direct damage or 2 direct horror, whichever you have more of
import { inv, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    rebirth(g: G, ctx: EffCtx) {
      const me = inv(g, ctx.you!);
      // ponytail: a tie takes damage; the card leaves it to the player
      const damage = me.damage >= me.horror;
      push(g, {
        t: "AssignDamage",
        inv: ctx.you!,
        damage: damage ? 2 : 0,
        horror: damage ? 0 : 2,
        direct: true,
        source: ctx.source ?? null,
      });
    },
  },
} satisfies CardScript;
