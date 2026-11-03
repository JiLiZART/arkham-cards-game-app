// Dynamite Blast — 3 damage to each enemy and each investigator at your location or a connecting one
import {
  connections,
  enemiesAt,
  inv,
  invsAt,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", run: "blast" }],
  fns: {
    blast(game: GameContext, run: ScriptRun) {
      const here = inv(game, run.you).location!;
      const opts = [here, ...connections(game, here)];
      const loc = run.chooseCard(opts, {
        text: "Dynamite Blast: choose a location",
        key: "cardChooseLocation",
        vars: { card: run.ctx.source ?? null },
      });
      for (const e of enemiesAt(game, loc))
        push(game, { t: STEP.DamageEnemy, enemy: e.id, amount: 3, by: run.you });
      for (const i of invsAt(game, loc))
        push(game, {
          t: STEP.AssignDamage,
          inv: i,
          damage: 3,
          horror: 0,
          direct: false,
          source: run.ctx.source ?? null,
        });
    },
  },
} satisfies CardScript;
