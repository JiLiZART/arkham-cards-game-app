// Aquinnah — the attack's damage goes to another enemy at your location instead (its horror is still taken)
import {
  type CardScript,
  enemiesAt,
  flags,
  type GameContext,
  inv,
  push,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    redirect(game: GameContext, run: ScriptRun) {
      const damage = run.ctx.dealt?.[0] ?? 0;
      const others = enemiesAt(game, inv(game, run.you).location).filter(
        (e) => e.id !== run.ctx.enemy,
      );
      if (!damage || !others.length || !run.ctx.key) return;
      const pick = run.chooseCard(
        others.map((e) => e.id),
        { text: "Aquinnah: choose an enemy to take the damage", key: "chooseEnemy" },
      );
      const prevented = flags.prevented.get(game, String(run.ctx.key)) ?? [0, 0];
      flags.prevented.set(game, String(run.ctx.key), [prevented[0] + damage, prevented[1]]);
      push(game, {
        t: STEP.DamageEnemy,
        enemy: pick,
        amount: damage,
        by: run.you,
        source: run.ctx.source,
      });
    },
  },
} satisfies CardScript;
