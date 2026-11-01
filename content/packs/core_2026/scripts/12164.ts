// Rogue Gangster — after it engages you: lose 1 resource, or it attacks you
import {
  attackKey,
  type CardScript,
  type EffCtx,
  emit,
  type G,
  inv,
  invIf,
  push,
} from "../../../../src/engine/api";

export default {
  fns: {
    shakedown(g: G, ctx: EffCtx) {
      const who = ctx.inv;
      if (!who || !invIf(g, who)) return;
      const me = inv(g, who);
      if (me.resources > 0) {
        me.resources--;
        emit(g, "resource", `${me.name} loses 1 resources`, {
          inv: who,
          data: { n: 1, lost: true, source: ctx.source ?? null },
        });
      } else
        push(g, {
          t: "EnemyAttack",
          enemy: ctx.source!,
          inv: who,
          aoo: false,
          key: attackKey(g),
        });
    },
  },
} satisfies CardScript;
