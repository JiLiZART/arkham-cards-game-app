// Raising Suspicions — 1 doom on the nearest enemy with no doom on it, or surge
import {
  ask,
  def,
  distances,
  enemies,
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
    suspicion(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const from = inv(g, ctx.you!).location;
      const pool = enemies(g).filter((e) => e.doom === 0 && e.location);
      if (!pool.length || !from) {
        push(g, { t: "Eff", effect: { op: "surge" }, ctx });
        return;
      }
      const d = distances(g, from);
      const best = Math.min(...pool.map((e) => d.get(e.location!) ?? Infinity));
      const near = pool.filter((e) => (d.get(e.location!) ?? Infinity) === best);
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Raising Suspicions: place 1 doom on",
        near.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      push(g, { t: "PlaceDoom", card: pick, n: 1 }, { t: "CheckDoom" });
    },
  },
} satisfies CardScript;
