// Aquinnah — the attack's damage goes to another enemy at your location instead (its horror is still taken)
import {
  ask,
  def,
  enemiesAt,
  inv,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    redirect(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const damage = ctx.dealt?.[0] ?? 0;
      const others = enemiesAt(g, inv(g, ctx.you!).location).filter((e) => e.id !== ctx.enemy);
      if (!damage || !others.length || !ctx.key) return;
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Aquinnah: choose an enemy to take the damage",
        others.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      const prevented = (g.s.flags[`prevented:${ctx.key}`] as [number, number] | undefined) ?? [
        0, 0,
      ];
      g.s.flags[`prevented:${ctx.key}`] = [prevented[0] + damage, prevented[1]];
      push(g, { t: "DamageEnemy", enemy: pick, amount: damage, by: ctx.you!, source: ctx.source });
    },
  },
} satisfies CardScript;
