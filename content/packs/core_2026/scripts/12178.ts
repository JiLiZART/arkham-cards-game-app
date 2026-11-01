// Herald of Flame — after it attacks: heal 1 damage from each enemy at its location
import {
  cardIf,
  type CardScript,
  def,
  type EffCtx,
  emit,
  enemiesAt,
  type G,
} from "../../../../src/engine/api";

export default {
  fns: {
    herald(g: G, ctx: EffCtx) {
      if (ctx.enemy !== ctx.source) return;
      for (const e of enemiesAt(g, cardIf(g, ctx.source!)?.location ?? null))
        if (e.damage > 0) {
          e.damage--;
          emit(g, "heal", `${def(g, e.id).name} heals 1 damage`, {
            card: e.id,
            data: { damage: 1, horror: 0 },
          });
        }
    },
  },
} satisfies CardScript;
