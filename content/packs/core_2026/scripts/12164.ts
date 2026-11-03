// Rogue Gangster — after it engages you: lose 1 resource, or it attacks you
import {
  addCounter,
  attackKey,
  type CardScript,
  emit,
  type GameContext,
  inv,
  invIf,
  EVENT,
  type ScriptRun,
  queue,
  enemyAttacks,
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
        queue(
          game,
          enemyAttacks({ enemy: run.source, inv: who, aoo: false, key: attackKey(game) }),
        );
    },
  },
} satisfies CardScript;
