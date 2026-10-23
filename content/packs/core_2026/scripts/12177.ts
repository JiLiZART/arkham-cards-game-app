// Queen's Knight — when it takes damage, 1 damage to Elokoss
import { enemies, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    knight(g: G, ctx: EffCtx) {
      if (ctx.enemy !== ctx.source) return;
      const queen = enemies(g).find((e) => e.code === "12179" || e.code === "12179b");
      if (queen)
        push(g, { t: "DamageEnemy", enemy: queen.id, amount: 1, by: null, source: ctx.source });
    },
  },
} satisfies CardScript;
