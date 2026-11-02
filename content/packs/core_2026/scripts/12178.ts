// Herald of Flame — after it attacks: heal 1 damage from each enemy at its location
import {
  addCounter,
  cardIf,
  type CardScript,
  def,
  type EffCtx,
  emit,
  enemiesAt,
  type GameContext,
  EVENT,
} from "../../../../src/engine/api";

export default {
  fns: {
    herald(game: GameContext, ctx: EffCtx) {
      if (ctx.enemy !== ctx.source) return;
      for (const e of enemiesAt(game, cardIf(game, ctx.source!)?.location ?? null))
        if (e.damage > 0) {
          addCounter(game, e.id, "damage", -1);
          emit(game, EVENT.Heal, `${def(game, e.id).name} heals 1 damage`, {
            card: e.id,
            data: { damage: 1, horror: 0 },
          });
        }
    },
  },
} satisfies CardScript;
