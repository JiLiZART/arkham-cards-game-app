// Herald of Flame — after it attacks: heal 1 damage from each enemy at its location
import {
  addCounter,
  cardIf,
  type CardScript,
  def,
  emit,
  enemiesAt,
  type GameContext,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    herald(game: GameContext, run: ScriptRun) {
      if (run.ctx.enemy !== run.ctx.source) return;
      for (const e of enemiesAt(game, cardIf(game, run.source)?.location ?? null))
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
