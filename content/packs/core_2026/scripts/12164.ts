// Rogue Gangster — after it engages you: lose 1 resource, or it attacks you
import {
  addCounter,
  attackKey,
  type CardScript,
  emit,
  type GameContext,
  inv,
  invIf,
  push,
  EVENT,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    shakedown(game: GameContext, run: ScriptRun) {
      const who = run.ctx.inv;
      if (!who || !invIf(game, who)) return;
      const me = inv(game, who);
      if (me.resources > 0) {
        addCounter(game, me.id, "resources", -1);
        emit(game, EVENT.Resource, `${me.name} loses 1 resources`, {
          inv: who,
          data: { n: 1, lost: true, source: run.ctx.source ?? null },
        });
      } else
        push(game, {
          t: STEP.EnemyAttack,
          enemy: run.source,
          inv: who,
          aoo: false,
          key: attackKey(game),
        });
    },
  },
} satisfies CardScript;
