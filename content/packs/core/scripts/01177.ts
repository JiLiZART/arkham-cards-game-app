// Yithian Observer — when it attacks you, discard a random card; if you cannot, +1 damage and +1 horror
import {
  type CardScript,
  discard,
  type EffCtx,
  emit,
  flags,
  type G,
  inv,
  randomInt,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enemyAttacks", run: "attack" }],
  fns: {
    attack(g: G, ctx: EffCtx) {
      const me = inv(g, ctx.inv!);
      if (me.hand.length) discard(g, me.hand[randomInt(g, me.hand.length)]);
      else {
        flags.attackBonus.set(g, String(ctx.key), 1);
        emit(
          g,
          "yithian",
          `${me.name} has no cards: the Yithian Observer deals +1 damage and +1 horror`,
          { inv: ctx.inv },
        );
      }
    },
  },
} satisfies CardScript;
